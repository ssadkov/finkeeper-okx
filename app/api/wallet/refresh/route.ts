import { NextResponse } from 'next/server';
import { createSignature } from '../../../utils/okxApi';

export async function POST(request: Request) {
    try {
        const { walletAddress } = await request.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        // Получаем общую стоимость
        const timestamp = new Date().toISOString();
        const method = 'GET';
        const requestPath = `/api/v5/wallet/asset/total-value-by-address?address=${walletAddress}&chains=501&assetType=0`;
        
        const signature = createSignature(timestamp, method, requestPath);

        const response = await fetch(
            `https://web3.okx.com${requestPath}`,
            {
                headers: {
                    'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
                    'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY || '',
                    'OK-ACCESS-SIGN': signature,
                    'OK-ACCESS-PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
                    'OK-ACCESS-TIMESTAMP': timestamp,
                },
            }
        );

        const totalValueData = await response.json();

        // Получаем балансы токенов
        const balanceTimestamp = new Date().toISOString();
        const balanceMethod = 'GET';
        const balanceRequestPath = `/api/v5/wallet/asset/all-token-balances-by-address?address=${walletAddress}&chains=501&filter=1`;

        const balanceSignature = createSignature(balanceTimestamp, balanceMethod, balanceRequestPath);

        const balanceResponse = await fetch(
            `https://web3.okx.com${balanceRequestPath}`,
            {
                method: balanceMethod,
                headers: {
                    'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
                    'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY || '',
                    'OK-ACCESS-SIGN': balanceSignature,
                    'OK-ACCESS-PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
                    'OK-ACCESS-TIMESTAMP': balanceTimestamp,
                },
            }
        );

        const balanceData = await balanceResponse.json();

        return NextResponse.json({
            totalValue: totalValueData.code === '0' && totalValueData.data.length > 0 
                ? totalValueData.data[0].totalValue 
                : '0',
            balances: balanceData.code === '0' && balanceData.data.length > 0 
                ? balanceData.data[0].tokenAssets 
                : []
        });
    } catch (error) {
        console.error('Error refreshing wallet data:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to refresh wallet data' },
            { status: 500 }
        );
    }
} 