import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getProducts } from '@/app/cron/products';
import { Product } from '@/app/cron/products/types';

// Функция для проверки API ключа
const isValidApiKey = (key: string): boolean => {
    const validKey = process.env.FINKEEPER_API_KEY;
    if (!validKey) {
        console.error('FINKEEPER_API_KEY is not set in environment variables');
        return false;
    }
    return key === validKey;
};

// Функция для фильтрации данных по сети и токену
const filterData = (data: any, network?: string, token?: string) => {
    if (!data?.networks) {
        return { timestamp: data?.timestamp || null, networks: {} };
    }

    const result = {
        timestamp: data.timestamp,
        networks: { ...data.networks }
    };

    // Фильтрация по сети
    if (network) {
        const normalizedNetwork = network.toUpperCase();
        result.networks = {
            [normalizedNetwork]: data.networks[normalizedNetwork] || []
        };
    }

    // Фильтрация по токену
    if (token) {
        const networks = { ...result.networks };
        for (const [net, products] of Object.entries(networks)) {
            networks[net] = (products as Product[]).filter(product => {
                const tokenSymbol = (product.underlyingToken?.[0]?.tokenSymbol || product.tokenSymbol || '').toLowerCase();
                const tokenName = (product.name || '').toLowerCase();
                const investmentName = (product.investmentName || '').toLowerCase();
                const searchToken = token.toLowerCase();

                return tokenSymbol.includes(searchToken) || 
                       tokenName.includes(searchToken) || 
                       investmentName.includes(searchToken);
            });
        }
        result.networks = networks;
    }

    // Удаляем пустые сети
    for (const net in result.networks) {
        if (result.networks[net].length === 0) {
            delete result.networks[net];
        }
    }

    return result;
};

export async function GET(
    request: NextRequest,
) {
    try {
        // Получаем key из URL
        const key = request.nextUrl.pathname.split('/').pop();
        
        if (!key) {
            return new NextResponse(
                JSON.stringify({ error: 'API key is required' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                    }
                }
            );
        }

        // Проверяем API ключ
        if (!isValidApiKey(key)) {
            return new NextResponse(
                JSON.stringify({ error: 'Invalid API key' }),
                {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                    }
                }
            );
        }

        // Получаем все данные
        const data = await getProducts();

        // Получаем параметры фильтрации из URL
        const networkParam = request.nextUrl.searchParams.get('network') || undefined;
        const tokenParam = request.nextUrl.searchParams.get('token') || undefined;

        // Применяем фильтры
        const filteredData = filterData(data, networkParam, tokenParam);

        // Возвращаем JSON с правильными заголовками
        return new NextResponse(
            JSON.stringify(filteredData),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                }
            }
        );
    } catch (error) {
        console.error('Error fetching products:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                }
            }
        );
    }
}

// Обработка OPTIONS запроса для CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
} 