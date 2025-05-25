import { NextRequest, NextResponse } from 'next/server';
import { makeOkxRequest } from '@/app/utils/okxApi';
import { validateConfig, OKX_CONFIG } from '@/app/config/okx';
import { OkxPlatformsResponse, OkxPlatform } from '@/app/utils/okxApi';
import { fileCache } from '@/app/utils/cache';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Filter platforms by network
const filterPlatformsByNetwork = (platforms: OkxPlatform[], network: string): OkxPlatform[] => {
    return platforms.filter(platform => 
        platform.platformMinInfos.some(info => info.network === network)
    );
};

export async function GET(request: NextRequest) {
    try {
        // Validate environment variables
        validateConfig();

        // Get parameters from URL
        const searchParams = request.nextUrl.searchParams;
        const params: Record<string, string> = {};
        
        const platformId = searchParams.get('platformId');
        const platformName = searchParams.get('platformName');
        const network = searchParams.get('network') || 'SOL';
        
        if (platformId) params.platformId = platformId;
        if (platformName) params.platformName = platformName;

        console.log('Request params:', params);

        let platforms: OkxPlatform[];

        // Check if we can use cache for Solana platforms
        if (network === 'SOL') {
            const cachedPlatforms = await fileCache.get<OkxPlatform[]>('solana_platforms');
            if (cachedPlatforms) {
                console.log('Using cached Solana platforms');
                platforms = cachedPlatforms;
            } else {
                // Get data from OKX API
                const response = await makeOkxRequest<OkxPlatformsResponse>(
                    '/api/v5/defi/explore/protocol/list',
                    'GET',
                    params
                );

                console.log('OKX API Response:', response);

                // Validate response structure
                if (!response.data || !Array.isArray(response.data)) {
                    throw new Error('Invalid response format from OKX API');
                }

                platforms = response.data;

                // Update cache for Solana platforms
                await fileCache.set('solana_platforms', platforms);
                console.log('Updated Solana platforms cache');
            }
        } else {
            // For other networks, always fetch fresh data
            const response = await makeOkxRequest<OkxPlatformsResponse>(
                '/api/v5/defi/explore/protocol/list',
                'GET',
                params
            );

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid response format from OKX API');
            }

            platforms = response.data;
        }

        // Filter platforms by network
        const filteredPlatforms = filterPlatformsByNetwork(platforms, network);

        // Return response with CORS headers
        return NextResponse.json({
            code: 0,
            msg: '',
            data: filteredPlatforms
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching DeFi platforms:', error);
        
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