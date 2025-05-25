import CryptoJS from 'crypto-js';
import { OKX_CONFIG } from '../config/okx';

// Типы для запросов
export interface OkxRequestParams {
    [key: string]: any;
}

// Функция для создания подписи
export const createSignature = (
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
): string => {
    const message = timestamp + method + requestPath + body;
    console.log('Signature message:', message);
    console.log('Secret key length:', OKX_CONFIG.SECRET_KEY.length);
    
    const signature = CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(message, OKX_CONFIG.SECRET_KEY)
    );
    console.log('Generated signature:', signature);
    return signature;
};

// Функция для создания заголовков запроса
export const createHeaders = (
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
): Headers => {
    console.log('Request timestamp:', timestamp);
    console.log('Request method:', method);
    console.log('Request path:', requestPath);
    console.log('Request body:', body);

    const signature = createSignature(timestamp, method, requestPath, body);

    const headers = new Headers({
        'OK-ACCESS-KEY': OKX_CONFIG.API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_CONFIG.PASSPHRASE,
        'Content-Type': 'application/json'
    });

    console.log('Request headers:', Object.fromEntries(headers.entries()));
    return headers;
};

// Функция для выполнения запроса к API
export const makeOkxRequest = async <T>(
    endpoint: string,
    method: string = 'GET',
    params: OkxRequestParams = {}
): Promise<T> => {
    let url = `${OKX_CONFIG.BASE_URL}${endpoint}`;
    const timestamp = new Date().toISOString();
    
    console.log('Making request to:', url);
    console.log('Request method:', method);
    console.log('Request params:', params);
    
    let body = '';
    if (method === 'POST') {
        body = JSON.stringify(params);
    } else {
        // Для GET запросов добавляем параметры в URL
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, value.toString());
            }
        });
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }
    
    const headers = createHeaders(timestamp, method, endpoint, body);
    
    const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`OKX API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data as T;
};

// Типы для ответа API продуктов
export interface OkxProduct {
    investmentId: string;
    investmentName: string;
    chainId: string;
    rate: string;
    investType: string;
    platformName: string;
    platformId: string;
    platformUrl: string;
    poolVersion: string;
    rateType: string;
    tvl: string;
    underlyingToken: {
        tokenSymbol: string;
        tokenAddress: string;
        isBaseToken: boolean;
    }[];
}

export interface OkxProductsResponse {
    code: number;
    msg: string;
    data: {
        investments: OkxProduct[];
        total: string;
    };
}

export interface OkxPlatformInfo {
    investmentId: string;
    protocolId: string;
    network: string;
}

export interface OkxPlatform {
    platformId: number;
    platformName: string;
    platformWebSite: string;
    investmentApiUrlPattern: string;
    investmentPageUrlPattern: string;
    platformMinInfos: OkxPlatformInfo[];
}

export interface OkxPlatformsResponse {
    code: number;
    msg: string;
    data: OkxPlatform[];
}

// Функция для получения списка продуктов
export const getDefiProducts = async (
    params: {
        simplifyInvestType?: string;
        network?: string;
        offset?: string;
        limit?: string;
        sort?: {
            orders: {
                direction: 'ASC' | 'DESC';
                property: string;
            }[];
        };
        platformIds?: string[];
    } = {}
): Promise<OkxProductsResponse> => {
    console.log('getDefiProducts params:', params);
    
    // Убеждаемся, что все параметры передаются как строки
    const formattedParams = {
        ...params,
        limit: params.limit?.toString(),
        offset: params.offset?.toString(),
        simplifyInvestType: params.simplifyInvestType?.toString()
    };
    
    const response = await makeOkxRequest<OkxProductsResponse>(
        OKX_CONFIG.ENDPOINTS.DEFI_PRODUCTS,
        'POST',
        formattedParams
    );
    
    console.log('getDefiProducts response:', response);
    return response;
}; 