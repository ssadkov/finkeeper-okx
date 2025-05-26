import { NextResponse } from 'next/server';
import { OKX_CONFIG } from '../../../config/okx';

export async function GET() {
    try {
        const timestamp = new Date().toISOString();
        const method = 'GET';
        const requestPath = '/api/v5/asset/balances';
        
        // Создаем подпись используя Web Crypto API
        const message = timestamp + method + requestPath;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(OKX_CONFIG.SECRET_KEY),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(message)
        );
        const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

        const response = await fetch(
            `${OKX_CONFIG.BASE_URL}${requestPath}`,
            {
                headers: {
                    'OK-ACCESS-KEY': OKX_CONFIG.API_KEY,
                    'OK-ACCESS-SIGN': sign,
                    'OK-ACCESS-PASSPHRASE': OKX_CONFIG.PASSPHRASE,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'Content-Type': 'application/json'
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OKX API Error Response:', errorText);
            throw new Error(`OKX API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OKX Balance Response:', data);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching OKX balances:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch OKX balances' },
            { status: 500 }
        );
    }
} 