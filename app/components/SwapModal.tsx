'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { useWalletContext } from '../context/WalletContext';

// Native SOL token address
const NATIVE_SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
// USDC token address
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromToken: {
        symbol: string;
        address: string;
    };
    toToken: {
        symbol: string;
        address: string;
    };
}

export default function SwapModal({ isOpen, onClose, fromToken, toToken }: SwapModalProps) {
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quoteInfo, setQuoteInfo] = useState<any>(null);
    const [swapStatus, setSwapStatus] = useState<string>('');
    const [sdkClient, setSdkClient] = useState<OKXDexClient | null>(null);
    
    const { publicKey, signTransaction } = useWallet();
    const { walletTokens } = useWalletContext();
    
    // Get SOL balance from walletTokens
    const solToken = walletTokens.find(token => token.symbol === 'SOL');
    const solBalance = solToken ? parseFloat(solToken.balance) : 0;

    // Execute swap using SDK
    const handleSwap = async () => {
        if (!publicKey || !sdkClient) {
            setError('Wallet not connected or SDK not initialized');
            return;
        }

        try {
            setError(null);
            setSwapStatus('Initializing...');
            console.log('%c[DEBUG] Starting swap process...', 'background: #222; color: #bada55');
            console.log('%c[DEBUG] Wallet address:', 'background: #222; color: #bada55', publicKey.toString());
            console.log('%c[DEBUG] Amount:', 'background: #222; color: #bada55', amount);

            // Convert amount to proper units (SOL uses 9 decimals)
            const amountInLamports = (parseFloat(amount) * 1e9).toString();
            
            console.log('%c[DEBUG] Getting swap data...', 'background: #222; color: #bada55');
            setSwapStatus('Getting swap data...');
            
            const swapData = await sdkClient.dex.getSwapData({
                chainId: '501',
                fromTokenAddress: fromToken.address,
                toTokenAddress: toToken.address,
                amount: amountInLamports,
                slippage: '0.5',
                userWalletAddress: publicKey.toString()
            });

            console.log('%c[DEBUG] Swap data received:', 'background: #222; color: #bada55', swapData);
            
            if (!swapData?.data?.[0]) {
                throw new Error('Failed to get swap data');
            }

            setSwapStatus('Executing swap...');
            console.log('%c[DEBUG] Executing swap...', 'background: #222; color: #bada55');
            
            const result = await sdkClient.dex.executeSwap({
                chainId: '501',
                fromTokenAddress: fromToken.address,
                toTokenAddress: toToken.address,
                amount: amountInLamports,
                slippage: '0.5',
                userWalletAddress: publicKey.toString()
            });

            console.log('%c[DEBUG] Swap result:', 'background: #222; color: #bada55', result);
            
            if (result?.data?.[0]) {
                setSwapStatus('Swap successful!');
                setTimeout(() => onClose(), 2000);
            } else {
                throw new Error('Swap failed');
            }
        } catch (err) {
            console.error('%c[ERROR] Swap error:', 'background: #222; color: #ff0000', err);
            setError(err instanceof Error ? err.message : 'Failed to execute swap');
            setSwapStatus('Failed');
        }
    };

    // Get quote using SDK
    const getQuote = async (amount: string) => {
        if (!publicKey || !amount || parseFloat(amount) <= 0) {
            setQuoteInfo(null);
            return;
        }

        try {
            setError(null);
            console.log('%c[DEBUG] Getting quote...', 'background: #222; color: #bada55');
            
            // Check environment variables
            const requiredEnvVars = {
                'NEXT_PUBLIC_OKX_API_KEY': process.env.NEXT_PUBLIC_OKX_API_KEY,
                'NEXT_PUBLIC_OKX_SECRET_KEY': process.env.NEXT_PUBLIC_OKX_SECRET_KEY,
                'NEXT_PUBLIC_OKX_PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE,
                'NEXT_PUBLIC_OKX_PROJECT_ID': process.env.NEXT_PUBLIC_OKX_PROJECT_ID,
                'NEXT_PUBLIC_SOLANA_RPC_URL': process.env.NEXT_PUBLIC_SOLANA_RPC_URL
            };

            const missingVars = Object.entries(requiredEnvVars)
                .filter(([_, value]) => !value)
                .map(([key]) => key);

            if (missingVars.length > 0) {
                console.error('%c[ERROR] Missing environment variables:', 'background: #222; color: #ff0000', missingVars);
                throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
            }

            // Initialize SDK client if not exists
            if (!sdkClient) {
                console.log('%c[DEBUG] Initializing SDK client for quote...', 'background: #222; color: #bada55');
                
                // Create Solana connection
                const connection = new Connection(
                    process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
                    'confirmed'
                );

                try {
                    const client = new OKXDexClient({
                        apiKey: process.env.NEXT_PUBLIC_OKX_API_KEY!,
                        secretKey: process.env.NEXT_PUBLIC_OKX_SECRET_KEY!,
                        apiPassphrase: process.env.NEXT_PUBLIC_OKX_PASSPHRASE!,
                        projectId: process.env.NEXT_PUBLIC_OKX_PROJECT_ID!,
                        solana: {
                            connection,
                            walletAddress: publicKey.toString(),
                            confirmTransactionInitialTimeout: 5000,
                            computeUnits: 300000,
                            maxRetries: 3
                        }
                    });

                    // Test SDK client with a small amount
                    console.log('%c[DEBUG] Testing SDK client...', 'background: #222; color: #bada55');
                    const testResponse = await client.dex.getQuote({
                        chainId: '501',
                        fromTokenAddress: fromToken.address,
                        toTokenAddress: toToken.address,
                        amount: '1000000',
                        slippage: '0.5'
                    });

                    if (!testResponse?.data?.[0]) {
                        throw new Error('Failed to get test quote');
                    }

                    console.log('%c[DEBUG] SDK test response:', 'background: #222; color: #bada55', testResponse);
                    console.log('%c[DEBUG] SDK client created and tested successfully', 'background: #222; color: #bada55');
                    setSdkClient(client);
                } catch (error) {
                    console.error('%c[ERROR] Failed to create or test SDK client:', 'background: #222; color: #ff0000', error);
                    throw error;
                }
            }

            // Convert amount to proper units (SOL uses 9 decimals)
            const amountInLamports = (parseFloat(amount) * 1e9).toString();
            
            console.log('%c[DEBUG] Requesting quote with parameters:', 'background: #222; color: #bada55', {
                chainId: '501',
                fromTokenAddress: fromToken.address,
                toTokenAddress: toToken.address,
                amount: amountInLamports,
                slippage: '0.5'
            });

            if (!sdkClient) {
                throw new Error('SDK client not initialized');
            }

            const quote = await sdkClient.dex.getQuote({
                chainId: '501',
                fromTokenAddress: fromToken.address,
                toTokenAddress: toToken.address,
                amount: amountInLamports,
                slippage: '0.5'
            });

            console.log('%c[DEBUG] Raw quote response:', 'background: #222; color: #bada55', quote);
            
            if (!quote?.data?.[0]) {
                throw new Error('Empty quote response');
            }

            const quoteData = quote.data[0];
            const tokenInfo = {
                fromToken: {
                    symbol: quoteData.fromToken.tokenSymbol,
                    decimals: parseInt(quoteData.fromToken.decimal),
                    price: quoteData.fromToken.tokenUnitPrice
                },
                toToken: {
                    symbol: quoteData.toToken.tokenSymbol,
                    decimals: parseInt(quoteData.toToken.decimal),
                    price: quoteData.toToken.tokenUnitPrice
                }
            };

            // Calculate amounts with proper decimals
            const fromAmount = parseFloat(amount);
            const toAmount = parseFloat(quoteData.toTokenAmount) / Math.pow(10, parseInt(quoteData.toToken.decimal));
            const gasFee = parseFloat(quoteData.estimateGasFee) / 1e9; // Convert to SOL

            setQuoteInfo({
                ...quote,
                tokenInfo,
                fromAmount,
                toAmount,
                gasFee,
                priceImpact: quoteData.priceImpactPercentage,
                route: quoteData.dexRouterList[0]?.subRouterList.map(route => 
                    route.dexProtocol[0].dexName
                ).join(' → ') || 'Best Route'
            });
        } catch (err) {
            console.error('%c[ERROR] Error getting quote:', 'background: #222; color: #ff0000', err);
            setQuoteInfo(null);
            setError(err instanceof Error ? err.message : 'Failed to get quote');
        }
    };

    // Debounced quote fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            getQuote(amount);
        }, 500);

        return () => clearTimeout(timer);
    }, [amount, publicKey]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Swap {fromToken.symbol} to {toToken.symbol}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Swap ({fromToken.symbol})
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            max={solBalance}
                            step="0.000001"
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Enter amount in ${fromToken.symbol}`}
                        />
                        <button
                            onClick={() => setAmount(solBalance.toString())}
                            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                            MAX
                        </button>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        Available: {solBalance.toFixed(6)} {fromToken.symbol}
                    </div>
                </div>

                {/* SDK Quote Display */}
                {quoteInfo && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <div className="text-sm text-gray-600">
                            <div className="font-semibold mb-2">Swap Details:</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>You Pay:</div>
                                <div className="text-right">{quoteInfo.fromAmount} {fromToken.symbol}</div>
                                
                                <div>You Receive:</div>
                                <div className="text-right">
                                    {quoteInfo.toAmount.toFixed(6)} {toToken.symbol}
                                </div>
                                
                                <div>Exchange Rate:</div>
                                <div className="text-right">
                                    1 {fromToken.symbol} = {(quoteInfo.toAmount / quoteInfo.fromAmount).toFixed(6)} {toToken.symbol}
                                </div>
                                
                                <div>Price Impact:</div>
                                <div className={`text-right ${parseFloat(quoteInfo.priceImpact) > 1 ? 'text-red-500' : 'text-green-500'}`}>
                                    {quoteInfo.priceImpact}%
                                </div>
                                
                                <div>Route:</div>
                                <div className="text-right">
                                    {quoteInfo.route}
                                </div>
                                
                                <div>Gas Fee:</div>
                                <div className="text-right">
                                    {quoteInfo.gasFee.toFixed(9)} SOL
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {swapStatus && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                        {swapStatus}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleSwap}
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > solBalance || isLoading || !sdkClient}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Processing...' : 
                     !sdkClient ? 'Initializing SDK...' :
                     `Swap ${fromToken.symbol} to ${toToken.symbol}`}
                </button>

                {/* Debug info */}
                <div className="mt-2 text-xs text-gray-500">
                    <div>SDK Status: {sdkClient ? 'Ready' : 'Initializing...'}</div>
                    <div>Wallet: {publicKey ? 'Connected' : 'Not connected'}</div>
                    <div>Amount: {amount}</div>
                    <div>Amount valid: {amount && parseFloat(amount) > 0 && parseFloat(amount) <= solBalance ? 'Yes' : 'No'}</div>
                    <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                    <div>Quote info: {quoteInfo ? 'Available' : 'Not available'}</div>
                </div>
            </div>
        </div>
    );
} 