import { NextResponse } from 'next/server';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';

export async function POST(request: Request) {
    try {
        const { walletAddress } = await request.json();

        // Initialize OKX DEX SDK Client
        const client = new OKXDexClient({
            apiKey: process.env.OKX_API_KEY!,
            secretKey: process.env.OKX_SECRET_KEY!,
            apiPassphrase: process.env.OKX_PASSPHRASE!,
            projectId: process.env.OKX_PROJECT_ID!,
            solana: {
                rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
                wsEndpoint: process.env.SOLANA_WS_URL,
                confirmTransactionInitialTimeout: 5000,
                walletAddress: walletAddress || '',
                computeUnits: 300000,
                maxRetries: 3
            } as any
        });

        // Test API authentication
        const timestamp = new Date().toISOString();
        const testParams = new URLSearchParams({
            chainId: '501',
            fromTokenAddress: '11111111111111111111111111111111',
            toTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            amount: '1000000',
            slippage: '0.5'
        });

        const message = timestamp + 'GET' + '/api/v5/dex/aggregator/quote?' + testParams.toString();
        const encoder = new TextEncoder();
        const messageBytes = encoder.encode(message);
        const keyBytes = encoder.encode(process.env.OKX_SECRET_KEY!);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

        const testResponse = await fetch(`https://www.okx.com/api/v5/dex/aggregator/quote?${testParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
                'OK-ACCESS-SIGN': signatureBase64,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE!
            }
        });

        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            throw new Error(`API authentication failed: ${errorData.msg || testResponse.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('SDK initialization error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to initialize SDK' },
            { status: 500 }
        );
    }
} 