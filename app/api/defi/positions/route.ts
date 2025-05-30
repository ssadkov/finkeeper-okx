import { NextRequest, NextResponse } from 'next/server';
import { makeOkxRequest } from '@/app/utils/okxApi';
import { validateConfig } from '@/app/config/okx';

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

// Получение детальной информации по протоколу
export async function GET(request: NextRequest) {
    try {
        validateConfig();
        
        const searchParams = request.nextUrl.searchParams;
        const platformId = searchParams.get('platformId');
        const chainId = searchParams.get('chainId');
        const walletAddress = searchParams.get('walletAddress');

        if (!platformId || !chainId || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing required parameters: platformId, chainId, walletAddress' },
                { status: 400, headers: corsHeaders }
            );
        }

        const response = await makeOkxRequest(
            '/api/v5/defi/user/asset/platform/detail',
            'POST',
            {
                analysisPlatformId: platformId,
                accountIdInfoList: [{
                    walletAddressList: [{
                        chainId: parseInt(chainId),
                        walletAddress: walletAddress
                    }]
                }]
            }
        ) as { data?: { walletIdPlatformDetailList?: any[] } };

        if (!response.data || !Array.isArray(response.data.walletIdPlatformDetailList)) {
            throw new Error('Invalid response format from OKX API');
        }

        return NextResponse.json(response, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching platform details:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error occurred' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        validateConfig();

        const body = await request.json();
        console.log('Received request body:', body);
        
        if (!body.walletAddressList || !Array.isArray(body.walletAddressList) || body.walletAddressList.length === 0) {
            return NextResponse.json(
                { error: 'Missing or invalid walletAddressList parameter' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Проверяем каждый элемент в списке
        for (const item of body.walletAddressList) {
            if (!item.chainId || !item.walletAddress) {
                return NextResponse.json(
                    { error: 'Each wallet address item must have chainId and walletAddress' },
                    { status: 400, headers: corsHeaders }
                );
            }
        }

        const response = await makeOkxRequest(
            '/api/v5/defi/user/asset/platform/list',
            'POST',
            body
        ) as { data?: { walletIdPlatformList?: any[] } };
        
        console.log('OKX API Response:', response);

        // Проверяем структуру ответа
        if (!response.data || !Array.isArray(response.data.walletIdPlatformList)) {
            throw new Error('Invalid response format from OKX API');
        }

        return NextResponse.json(response, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching user positions:', error);
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error occurred' },
            { status: 500, headers: corsHeaders }
        );
    }
} 