import { NextRequest, NextResponse } from 'next/server';
import { getDefiProducts } from '@/app/utils/okxApi';
import { validateConfig, OKX_CONFIG } from '@/app/config/okx';

export async function GET(request: NextRequest) {
    try {
        // Проверяем наличие необходимых переменных окружения
        validateConfig();

        // Логируем конфигурацию (без секретных данных)
        console.log('API Key:', OKX_CONFIG.API_KEY ? 'Present' : 'Missing');
        console.log('Secret Key:', OKX_CONFIG.SECRET_KEY ? 'Present' : 'Missing');
        console.log('Passphrase:', OKX_CONFIG.PASSPHRASE ? 'Present' : 'Missing');

        // Получаем параметры из URL
        const searchParams = request.nextUrl.searchParams;
        const params = {
            network: searchParams.get('network') || undefined,
            offset: searchParams.get('offset') || undefined,
            limit: searchParams.get('limit') || undefined,
            platformIds: searchParams.get('platformIds')?.split(',') || undefined,
            sort: searchParams.get('sort') ? {
                orders: [{
                    direction: searchParams.get('sortDirection') as 'ASC' | 'DESC' || 'DESC',
                    property: searchParams.get('sort') || 'TVL'
                }]
            } : undefined
        };

        console.log('Request params:', params);

        // Получаем данные от OKX API
        const response = await getDefiProducts(params);
        console.log('OKX API Response:', response);

        // Проверяем структуру ответа
        if (!response.data || !Array.isArray(response.data.investments)) {
            throw new Error('Invalid response format from OKX API');
        }

        // Возвращаем ответ
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching DeFi products:', error);
        
        // Возвращаем ошибку
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Проверяем наличие необходимых переменных окружения
        validateConfig();

        // Получаем параметры из тела запроса
        const body = await request.json();
        
        // Проверяем обязательные параметры
        if (!body.simplifyInvestType || !body.network || !body.limit) {
            return NextResponse.json(
                { error: 'Missing required parameters: simplifyInvestType, network, limit' },
                { status: 400 }
            );
        }

        // Получаем данные от OKX API
        const response = await getDefiProducts(body);
        console.log('OKX API Response:', response);

        // Проверяем структуру ответа
        if (!response.data || !Array.isArray(response.data.investments)) {
            throw new Error('Invalid response format from OKX API');
        }

        // Возвращаем ответ
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching DeFi products:', error);
        
        // Возвращаем ошибку
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { status: 500 }
        );
    }
} 