import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('okx-api-key');
        const apiSecret = request.headers.get('okx-api-secret');
        const passphrase = request.headers.get('okx-passphrase');

        if (!apiKey || !apiSecret || !passphrase) {
            return NextResponse.json(
                { error: 'Missing API credentials' },
                { status: 400 }
            );
        }

        const time = new Date().toISOString();
        const fundUrl = '/api/v5/asset/balances';
        const fundMessage = time + 'GET' + fundUrl;
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

        const response = await fetch('https://www.okx.com' + fundUrl, {
            method: 'GET',
            headers,
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in OKX balances proxy:', error);
        return NextResponse.json(
            { error: 'Failed to fetch balances' },
            { status: 500 }
        );
    }
} 