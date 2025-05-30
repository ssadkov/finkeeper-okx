import { TokensResponse } from './types';
import { getOkxHeaders } from '../products/okx';

const DELAY_BETWEEN_RETRIES = 1000; // 1 секунда между повторными попытками
const MAX_RETRIES = 3; // Максимальное количество попыток

async function fetchTokenListWithRetry(retryCount = 0): Promise<TokensResponse['data']> {
    try {
        console.log(`\n--- Fetching token list (attempt ${retryCount + 1}/${MAX_RETRIES + 1}) ---`);
        
        const requestPath = '/api/v5/defi/explore/token/list';
        const method = 'GET';
        
        const headers = getOkxHeaders(method, requestPath);

        if (!headers['OK-ACCESS-KEY']) {
            throw new Error('Missing OKX API key');
        }

        const startTime = Date.now();
        console.log('Request details:', {
            url: `https://web3.okx.com${requestPath}`,
            method,
            headers: {
                ...headers,
                'OK-ACCESS-KEY': headers['OK-ACCESS-KEY']?.slice(0, 10) + '...',
                'OK-ACCESS-SIGN': headers['OK-ACCESS-SIGN']?.slice(0, 10) + '...',
                'OK-ACCESS-PASSPHRASE': '***'
            }
        });

        const response = await fetch(`https://web3.okx.com${requestPath}`, {
            method,
            headers
        });

        const responseTime = Date.now() - startTime;
        console.log(`Response received in ${responseTime}ms`);

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Если получили 504, пробуем еще раз после задержки
        if (response.status === 504 && retryCount < MAX_RETRIES) {
            console.log(`Received 504 error, waiting ${DELAY_BETWEEN_RETRIES}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES));
            return fetchTokenListWithRetry(retryCount + 1);
        }
        
        if (!response.ok) {
            console.error('API error:', {
                status: response.status,
                statusText: response.statusText,
                response: responseText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`OKX API error! status: ${response.status}, details: ${responseText}`);
        }

        let data: TokensResponse;
        try {
            data = JSON.parse(responseText);
            console.log('Response data:', {
                code: data.code,
                msg: data.msg,
                tokensCount: data.data?.length || 0,
                firstToken: data.data?.[0]
            });
        } catch (e) {
            console.error('Failed to parse response JSON:', responseText);
            throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }

        if (!data.data) {
            console.warn('No token data in response:', data);
            return [];
        }

        return data.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Если произошла ошибка и есть еще попытки, пробуем снова
        if (retryCount < MAX_RETRIES) {
            console.error(`Error in fetchTokenList (attempt ${retryCount + 1}), retrying...`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES));
            return fetchTokenListWithRetry(retryCount + 1);
        }
        
        console.error('Error in fetchTokenList (final attempt):', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

// Экспортируем основную функцию, которая использует retry механизм
export async function fetchTokenList(): Promise<TokensResponse['data']> {
    return fetchTokenListWithRetry();
} 