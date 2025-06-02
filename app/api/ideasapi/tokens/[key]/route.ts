import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/app/config/database';

// Функция для проверки API ключа
const isValidApiKey = (key: string): boolean => {
    const validKey = process.env.FINKEEPER_API_KEY;
    if (!validKey) {
        console.error('FINKEEPER_API_KEY is not set in environment variables');
        return false;
    }
    return key === validKey;
};

// Функция для получения токенов из БД
async function getTokensFromDatabase(network?: string) {
    const client = await pool.connect();
    try {
        let query = `
            SELECT 
                token_id,
                token_symbol,
                network,
                logo_url,
                token_address,
                token_decimal,
                created_at,
                updated_at
            FROM token_lists
        `;

        const params: string[] = [];
        if (network) {
            query += ' WHERE network = $1';
            params.push(network.toUpperCase());
        }

        query += ' ORDER BY token_symbol';
        
        const { rows } = await client.query(query, params);
        return rows;
    } finally {
        client.release();
    }
}

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

        // Получаем параметр фильтрации из URL
        const networkParam = request.nextUrl.searchParams.get('network') || undefined;

        // Получаем данные из БД
        const tokens = await getTokensFromDatabase(networkParam);

        // Формируем ответ
        const response = {
            timestamp: new Date().toISOString(),
            totalCount: tokens.length,
            tokens: tokens
        };

        // Возвращаем JSON с правильными заголовками
        return new NextResponse(
            JSON.stringify(response),
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
        console.error('Error fetching tokens:', error);
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