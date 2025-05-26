import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    console.log('[OKX API] Starting balance request');
    try {
        const apiKey = request.headers.get('okx-api-key');
        const apiSecret = request.headers.get('okx-api-secret');
        const passphrase = request.headers.get('okx-passphrase');

        console.log('[OKX API] Headers received:', {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
            hasPassphrase: !!passphrase
        });

        if (!apiKey || !apiSecret || !passphrase) {
            console.error('[OKX API] Missing credentials');
            return NextResponse.json(
                { error: 'Missing API credentials' },
                { status: 400 }
            );
        }

        const time = new Date().toISOString();
        const fundUrl = '/api/v5/asset/balances';
        const fundMessage = time + 'GET' + fundUrl;
        
        console.log('[OKX API] Preparing request:', {
            time,
            fundUrl,
            messageLength: fundMessage.length
        });

        const fundEncoder = new TextEncoder();
        const fundKey = await crypto.subtle.importKey(
            'raw',
            fundEncoder.encode(apiSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const fundSignature = await crypto.subtle.sign(
            'HMAC',
            fundKey,
            fundEncoder.encode(fundMessage)
        );
        const fundSign = btoa(String.fromCharCode(...new Uint8Array(fundSignature)));

        const headers = {
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-TIMESTAMP': time,
            'OK-ACCESS-PASSPHRASE': passphrase,
            'OK-ACCESS-SIGN': fundSign,
            'Content-Type': 'application/json',
        };

        console.log('[OKX API] Making request to OKX');
        const response = await fetch('https://www.okx.com' + fundUrl, {
            method: 'GET',
            headers,
        });

        console.log('[OKX API] Response status:', response.status);
        const data = await response.json();
        console.log('[OKX API] Response data:', {
            code: data.code,
            hasData: !!data.data,
            dataLength: data.data?.length
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('[OKX API] Error in balances proxy:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch balances',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 