import { NextRequest, NextResponse } from 'next/server';
import { getDefiProducts } from '@/app/utils/okxApi';
import { validateConfig, OKX_CONFIG } from '@/app/config/okx';

// Функция для создания CORS заголовков
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Обработка OPTIONS запроса для CORS
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        // Проверяем наличие необходимых переменных окружения
        validateConfig();

        // Получаем параметры из URL
        const searchParams = request.nextUrl.searchParams;
        const params = {
            simplifyInvestType: searchParams.get('simplifyInvestType') || '100',
            network: searchParams.get('network') || 'ETH',
            offset: searchParams.get('offset') || '0',
            sort: {
                orders: [{
                    direction: searchParams.get('sortDirection') as 'ASC' | 'DESC' || 'DESC',
                    property: searchParams.get('sortBy') || 'RATE'
                }]
            }
        };

        console.log('Request params:', params);

        // Получаем данные от OKX API
        const response = await getDefiProducts(params);
        console.log('OKX API Response:', response);

        // Проверяем структуру ответа
        if (!response.data || !Array.isArray(response.data.investments)) {
            throw new Error('Invalid response format from OKX API');
        }

        // Возвращаем ответ с CORS заголовками
        return NextResponse.json(response, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching DeFi products:', error);
        
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { 
                status: 500,
                headers: corsHeaders
            }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Проверяем наличие необходимых переменных окружения
        validateConfig();

        // Получаем параметры из тела запроса
        const body = await request.json();
        console.log('Received request body:', body);
        
        // Проверяем обязательные параметры
        if (!body.simplifyInvestType || !body.network) {
            return NextResponse.json(
                { error: 'Missing required parameters: simplifyInvestType, network' },
                { 
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // Устанавливаем значение по умолчанию для offset
        const params = {
            ...body,
            offset: body.offset || '0'
        };

        // Получаем данные от OKX API
        const response = await getDefiProducts(params);
        console.log('OKX API Response:', response);

        // Проверяем структуру ответа
        if (!response.data || !Array.isArray(response.data.investments)) {
            throw new Error('Invalid response format from OKX API');
        }

        // Возвращаем ответ с CORS заголовками
        return NextResponse.json(response, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching DeFi products:', error);
        
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { 
                status: 500,
                headers: corsHeaders
            }
        );
    }
} 