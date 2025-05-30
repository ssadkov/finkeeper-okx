import { ProtocolsResponse } from './types';
import { getOkxHeaders } from '../products/okx';

export async function fetchProtocolList(): Promise<ProtocolsResponse['data']> {
    try {
        console.log('\n--- Fetching protocol list ---');
        
        const requestPath = '/api/v5/defi/explore/protocol/list';
        const method = 'GET';
        
        const headers = getOkxHeaders(method, requestPath);

        if (!headers['OK-ACCESS-KEY']) {
            throw new Error('Missing OKX API key');
        }

        const response = await fetch(`https://web3.okx.com${requestPath}`, {
            method,
            headers
        });

        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        if (!response.ok) {
            throw new Error(`OKX API error! status: ${response.status}, details: ${responseText}`);
        }

        let data: ProtocolsResponse;
        try {
            data = JSON.parse(responseText);
            
            // Логируем первый протокол полностью
            if (data.data && data.data.length > 0) {
                console.log('First protocol complete data:', JSON.stringify(data.data[0], null, 2));
            }

            // Логируем базовую информацию о всех протоколах
            if (data.data) {
                console.log('All protocols basic info:');
                data.data.forEach((protocol, index) => {
                    console.log(`[${index}] Name: ${protocol.platformName}, Keys:`, Object.keys(protocol));
                });
            }

        } catch (e) {
            console.error('Failed to parse response JSON:', responseText);
            throw new Error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }

        if (!data.data) {
            console.warn('No protocol data in response:', data);
            return [];
        }

        return data.data;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in fetchProtocolList:', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
} 