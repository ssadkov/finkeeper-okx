import { NextResponse } from 'next/server';
import crypto from 'crypto-js';

const OKX_API_KEY = process.env.OKX_API_KEY;
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY;
const OKX_API_PASSPHRASE = process.env.OKX_API_PASSPHRASE;
const OKX_PROJECT_ID = process.env.OKX_PROJECT_ID;

const SOLANA_CHAIN_ID = "501";

function getHeaders(timestamp: string, method: string, requestPath: string, queryString = "", body = "") {
    const stringToSign = timestamp + method + requestPath + (queryString || body);
    return {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": OKX_API_KEY,
        "OK-ACCESS-SIGN": crypto.enc.Base64.stringify(
            crypto.HmacSHA256(stringToSign, OKX_SECRET_KEY!)
        ),
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": OKX_API_PASSPHRASE,
        "OK-ACCESS-PROJECT": OKX_PROJECT_ID,
    };
}

export async function POST(request: Request) {
    try {
        const { fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippage = '0.5' } = await request.json();

        const timestamp = new Date().toISOString();
        const requestPath = "/api/v5/dex/aggregator/swap";

        const params = {
            amount,
            chainId: SOLANA_CHAIN_ID,
            fromTokenAddress,
            toTokenAddress,
            userWalletAddress,
            slippage
        };

        const queryString = "?" + new URLSearchParams(params).toString();
        const headers = getHeaders(timestamp, "GET", requestPath, queryString);

        const response = await fetch(
            `https://web3.okx.com${requestPath}${queryString}`,
            { headers }
        );

        const data = await response.json();

        if (data.code !== "0" || !data.data?.[0]) {
            throw new Error(`API Error: ${data.msg || "Failed to get swap data"}`);
        }

        return NextResponse.json(data.data[0]);
    } catch (error) {
        console.error('Error in swap API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get swap data' },
            { status: 500 }
        );
    }
} 