import { NextResponse } from 'next/server';
import crypto from 'crypto-js';
import { OKX_CONFIG } from '@/app/config/okx';

const SOLANA_CHAIN_ID = "501";

function getHeaders(timestamp: string, method: string, requestPath: string, queryString = "", body = "") {
    const stringToSign = timestamp + method + requestPath + (queryString || body);
    const projectId = process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '';
    
    return {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": OKX_CONFIG.API_KEY,
        "OK-ACCESS-SIGN": crypto.enc.Base64.stringify(
            crypto.HmacSHA256(stringToSign, OKX_CONFIG.SECRET_KEY)
        ),
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": OKX_CONFIG.PASSPHRASE,
        "OK-ACCESS-PROJECT": projectId,
    };
}

async function getQuote(params: any) {
    const timestamp = new Date().toISOString();
    const requestPath = "/api/v5/dex/aggregator/quote";
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, "GET", requestPath, queryString);

    console.log('Getting quote from OKX API:', {
        url: `${OKX_CONFIG.BASE_URL}${requestPath}${queryString}`,
        headers: {
            ...headers,
            "OK-ACCESS-SIGN": "[REDACTED]",
            "OK-ACCESS-KEY": "[REDACTED]",
            "OK-ACCESS-PASSPHRASE": "[REDACTED]"
        }
    });

    const response = await fetch(
        `${OKX_CONFIG.BASE_URL}${requestPath}${queryString}`,
        { headers }
    );

    const data = await response.json();
    console.log('Quote response:', JSON.stringify(data, null, 2));

    if (data.code !== "0") {
        if (data.msg?.includes("Insufficient liquidity")) {
            throw new Error(`Insufficient liquidity for this swap. Try a smaller amount. Details: ${JSON.stringify(data)}`);
        }
        throw new Error(`API Error: ${data.msg || "Failed to get quote"}`);
    }

    return data.data[0];
}

export async function POST(request: Request) {
    try {
        const { fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippage = '0.5' } = await request.json();

        console.log('Swap request params:', {
            fromTokenAddress,
            toTokenAddress,
            amount,
            userWalletAddress,
            slippage
        });

        // Convert amount to lamports (1 SOL = 1e9 lamports)
        const amountInLamports = Math.floor(parseFloat(amount) * 1e9).toString();

        // First get a quote
        const quoteParams = {
            chainId: SOLANA_CHAIN_ID,
            amount: amountInLamports,
            fromTokenAddress,
            toTokenAddress,
            slippage,
            dex: "orca,raydium,jupiter",
            routeType: "split",
            minOutputAmount: "0",
            deadline: (Math.floor(Date.now() / 1000) + 300).toString(),
            feeRate: "0.3",
            useNativeToken: "true",
            maxHops: "3",
            gasPrice: "0",
            gasLimit: "0",
            recipient: userWalletAddress,
            referrer: "finkeeper",
            referrerFee: "0"
        };

        try {
            const quote = await getQuote(quoteParams);
            console.log('Got quote:', JSON.stringify(quote, null, 2));

            // Now perform the swap
            const timestamp = new Date().toISOString();
            const requestPath = "/api/v5/dex/aggregator/swap";

            const swapParams = {
                ...quoteParams,
                userWalletAddress,
                quoteId: quote.quoteId,
                nonce: Math.floor(Math.random() * 1000000).toString(),
                signature: "",
                deadline: (Math.floor(Date.now() / 1000) + 600).toString(),
            };

            const queryString = "?" + new URLSearchParams(swapParams).toString();
            const headers = getHeaders(timestamp, "GET", requestPath, queryString);

            console.log('Making swap request to OKX API:', {
                url: `${OKX_CONFIG.BASE_URL}${requestPath}${queryString}`,
                headers: {
                    ...headers,
                    "OK-ACCESS-SIGN": "[REDACTED]",
                    "OK-ACCESS-KEY": "[REDACTED]",
                    "OK-ACCESS-PASSPHRASE": "[REDACTED]"
                }
            });

            const response = await fetch(
                `${OKX_CONFIG.BASE_URL}${requestPath}${queryString}`,
                { headers }
            );

            const data = await response.json();
            console.log('Swap response:', JSON.stringify(data, null, 2));

            if (data.code !== "0") {
                if (data.msg?.includes("Insufficient liquidity")) {
                    quoteParams.dex = "jupiter,orca";
                    const retryQuote = await getQuote(quoteParams);
                    console.log('Retry quote with different DEXes:', JSON.stringify(retryQuote, null, 2));
                    
                    swapParams.quoteId = retryQuote.quoteId;
                    const retryQueryString = "?" + new URLSearchParams(swapParams).toString();
                    const retryHeaders = getHeaders(timestamp, "GET", requestPath, retryQueryString);
                    
                    const retryResponse = await fetch(
                        `${OKX_CONFIG.BASE_URL}${requestPath}${retryQueryString}`,
                        { headers: retryHeaders }
                    );
                    
                    const retryData = await retryResponse.json();
                    if (retryData.code !== "0") {
                        throw new Error(`Insufficient liquidity for this swap. Try a smaller amount or a different token pair. Details: ${JSON.stringify(retryData)}`);
                    }
                    return NextResponse.json({
                        callData: retryData.data[0].tx.data,
                        routerResult: retryData.data[0].routerResult,
                        txInfo: {
                            fromToken: retryData.data[0].tx.fromToken,
                            toToken: retryData.data[0].tx.toToken,
                            amount: retryData.data[0].tx.amount,
                            expectedOutput: retryData.data[0].tx.expectedOutput
                        },
                        quote: retryQuote
                    });
                }
                throw new Error(`API Error: ${data.msg || "Failed to get swap data"}`);
            }

            if (!data.data?.[0]?.tx?.data) {
                throw new Error("No transaction data received from API");
            }

            // Log the transaction data for debugging
            console.log('Transaction data from OKX:', {
                raw: data.data[0].tx.data,
                length: data.data[0].tx.data.length,
                tx: {
                    from: data.data[0].tx.from,
                    to: data.data[0].tx.to,
                    gas: data.data[0].tx.gas,
                    gasPrice: data.data[0].tx.gasPrice,
                    value: data.data[0].tx.value,
                    maxSpendAmount: data.data[0].tx.maxSpendAmount,
                    minReceiveAmount: data.data[0].tx.minReceiveAmount
                }
            });

            // Verify the transaction data is valid base64
            try {
                const decodedData = Buffer.from(data.data[0].tx.data, 'base64');
                console.log('Decoded transaction data length:', decodedData.length);
                console.log('Decoded transaction data (hex):', decodedData.toString('hex'));
            } catch (error) {
                console.error('Error decoding transaction data:', error);
                throw new Error('Invalid transaction data format received from API');
            }

            // Return the transaction data
            return NextResponse.json({
                callData: data.data[0].tx.data,
                routerResult: data.data[0].routerResult,
                txInfo: {
                    fromToken: data.data[0].tx.fromToken,
                    toToken: data.data[0].tx.toToken,
                    amount: data.data[0].tx.amount,
                    expectedOutput: data.data[0].tx.expectedOutput,
                    from: data.data[0].tx.from,
                    to: data.data[0].tx.to,
                    gas: data.data[0].tx.gas,
                    gasPrice: data.data[0].tx.gasPrice,
                    value: data.data[0].tx.value,
                    maxSpendAmount: data.data[0].tx.maxSpendAmount,
                    minReceiveAmount: data.data[0].tx.minReceiveAmount
                },
                quote: quote
            });
        } catch (error) {
            // If we get a liquidity error, try with a smaller amount
            if (error instanceof Error && error.message.includes("Insufficient liquidity")) {
                const smallerAmount = Math.floor(parseFloat(amountInLamports) * 0.1).toString(); // Try with 10% of original amount
                console.log('Retrying with smaller amount:', smallerAmount);
                
                quoteParams.amount = smallerAmount;
                const quote = await getQuote(quoteParams);
                
                // Continue with the swap using the smaller amount...
                // (rest of the swap logic with the smaller amount)
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in swap API:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to get swap data',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
} 