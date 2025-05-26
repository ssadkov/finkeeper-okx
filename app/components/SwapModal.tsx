'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
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
    const { publicKey, signTransaction } = useWallet();
    const { setVisible } = useWalletModal();
    const { walletTokens } = useWalletContext();
    
    // Get SOL balance from walletTokens
    const solToken = walletTokens.find(token => token.symbol === 'SOL');
    const solBalance = solToken ? parseFloat(solToken.balance) : 0;

    // Use RPC URL from environment variables
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

    // Function to get quote
    const getQuote = async (amount: string) => {
        console.log('Getting quote for amount:', amount);
        console.log('Public key:', publicKey?.toString());
        
        if (!publicKey || !amount || parseFloat(amount) <= 0) {
            console.log('Invalid conditions:', { 
                hasPublicKey: !!publicKey, 
                hasAmount: !!amount, 
                amountValue: parseFloat(amount) 
            });
            setQuoteInfo(null);
            return;
        }

        try {
            console.log('Sending quote request to API...');
            const response = await fetch('/api/dex/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromTokenAddress: NATIVE_SOL_ADDRESS,
                    toTokenAddress: USDC_ADDRESS,
                    amount,
                    userWalletAddress: publicKey.toString(),
                    slippage: '0.5'
                })
            });

            console.log('API Response status:', response.status);
            const data = await response.json();
            console.log('API Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get quote');
            }

            if (!data.quote) {
                console.error('No quote data in response');
                throw new Error('No quote data received');
            }

            console.log('Setting quote info:', data.quote);
            setQuoteInfo(data.quote);
            setError(null);
        } catch (err) {
            console.error('Error getting quote:', err);
            setQuoteInfo(null);
            setError(err instanceof Error ? err.message : 'Failed to get quote');
        }
    };

    // Debounced quote fetching
    useEffect(() => {
        console.log('Amount changed:', amount);
        const timer = setTimeout(() => {
            console.log('Fetching quote after debounce...');
            getQuote(amount);
        }, 500);

        return () => {
            console.log('Clearing quote timer');
            clearTimeout(timer);
        };
    }, [amount, publicKey]);

    // Log when quote info changes
    useEffect(() => {
        console.log('Quote info updated:', quoteInfo);
    }, [quoteInfo]);

    if (!isOpen) return null;

    const handleSwap = async () => {
        if (!publicKey) {
            setVisible(true);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setQuoteInfo(null);
            setSwapStatus('Getting quote...');

            // Get swap data from our API
            const response = await fetch('/api/dex/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromTokenAddress: NATIVE_SOL_ADDRESS,
                    toTokenAddress: USDC_ADDRESS,
                    amount,
                    userWalletAddress: publicKey.toString(),
                    slippage: '0.5'
                })
            });

            const swapData = await response.json();

            if (!response.ok) {
                throw new Error(swapData.error || 'Failed to get swap data');
            }

            if (!swapData.callData) {
                throw new Error('No transaction data received');
            }

            // Store quote information
            setQuoteInfo(swapData.quote);
            setSwapStatus('Preparing transaction...');

            // Log quote and transaction data for debugging
            console.log('Quote data:', swapData.quote);
            console.log('Transaction data:', swapData.txInfo);
            console.log('Raw transaction data:', swapData.callData);

            try {
                // Create a new transaction
                const transaction = new Transaction();
                
                // Add the swap instruction
                const swapInstruction = new TransactionInstruction({
                    programId: new PublicKey(swapData.txInfo.to), // Router program ID
                    keys: [
                        { pubkey: publicKey, isSigner: true, isWritable: true }, // User wallet
                        { pubkey: new PublicKey(NATIVE_SOL_ADDRESS), isSigner: false, isWritable: true }, // From token
                        { pubkey: new PublicKey(USDC_ADDRESS), isSigner: false, isWritable: true }, // To token
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System program
                    ],
                    data: Buffer.from(swapData.callData, 'base64')
                });
                
                transaction.add(swapInstruction);
                
                // Get recent blockhash
                const { blockhash } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;
                
                // Log transaction details
                console.log('Transaction details:', {
                    recentBlockhash: transaction.recentBlockhash,
                    feePayer: transaction.feePayer.toString(),
                    instructions: transaction.instructions.map(ix => ({
                        programId: ix.programId.toString(),
                        keys: ix.keys.map(k => ({
                            pubkey: k.pubkey.toString(),
                            isSigner: k.isSigner,
                            isWritable: k.isWritable
                        }))
                    }))
                });
                
                setSwapStatus('Waiting for wallet signature...');
                
                // Sign transaction
                if (!signTransaction) {
                    throw new Error('Wallet does not support transaction signing');
                }
                const signedTx = await signTransaction(transaction);
                
                setSwapStatus('Sending transaction...');
                
                // Send transaction
                const signature = await connection.sendRawTransaction(signedTx.serialize());
                console.log('Swap transaction sent:', signature);

                setSwapStatus('Waiting for confirmation...');

                // Wait for confirmation
                await connection.confirmTransaction(signature);
                console.log('Swap confirmed:', signature);

                setSwapStatus('Swap completed successfully!');
                setTimeout(() => onClose(), 2000);
            } catch (err) {
                console.error('Error processing transaction data:', err);
                if (err instanceof Error && err.message.includes('Reached end of buffer')) {
                    throw new Error('Invalid transaction data received from API. Please try again.');
                }
                throw new Error('Failed to process transaction data: ' + (err instanceof Error ? err.message : String(err)));
            }
        } catch (err) {
            console.error('Error executing swap:', err);
            let errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
            
            // Handle specific error cases
            if (errorMessage.includes('Insufficient liquidity')) {
                errorMessage = 'Not enough liquidity for this swap. Try a smaller amount or a different token pair.';
            } else if (errorMessage.includes('User rejected')) {
                errorMessage = 'Transaction was rejected by the user.';
            } else if (errorMessage.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for transaction. Please ensure you have enough SOL for the swap and fees.';
            }
            
            setError(errorMessage);
            setSwapStatus('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Swap {fromToken.symbol} to {toToken.symbol}</h2>
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

                {quoteInfo && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <div className="text-sm text-gray-600">
                            <div className="font-semibold mb-2">Swap Details:</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>You Pay:</div>
                                <div className="text-right">{amount} {fromToken.symbol}</div>
                                
                                <div>You Receive:</div>
                                <div className="text-right">
                                    {quoteInfo.toTokenAmount ? 
                                        `${(parseFloat(quoteInfo.toTokenAmount) / 1e6).toFixed(6)} ${toToken.symbol}` : 
                                        'Calculating...'}
                                </div>
                                
                                <div>Exchange Rate:</div>
                                <div className="text-right">
                                    {amount && quoteInfo.toTokenAmount ? 
                                        `1 ${fromToken.symbol} = ${((parseFloat(quoteInfo.toTokenAmount) / 1e6) / parseFloat(amount)).toFixed(6)} ${toToken.symbol}` :
                                        'Calculating...'
                                    }
                                </div>
                                
                                <div>Price Impact:</div>
                                <div className={`text-right ${quoteInfo.priceImpactPercentage ? (parseFloat(quoteInfo.priceImpactPercentage) > 1 ? 'text-red-500' : 'text-green-500') : ''}`}>
                                    {quoteInfo.priceImpactPercentage ? `${quoteInfo.priceImpactPercentage}%` : 'Calculating...'}
                                </div>
                                
                                <div>Best Route:</div>
                                <div className="text-right">
                                    {quoteInfo.dexRouterList?.[0]?.subRouterList?.[0]?.dexProtocol?.[0]?.dexName || 'Calculating...'}
                                </div>
                                
                                <div>Fee:</div>
                                <div className="text-right">
                                    {quoteInfo.tradeFee ? `${parseFloat(quoteInfo.tradeFee).toFixed(9)} ${fromToken.symbol}` : 'Calculating...'}
                                </div>

                                <div>Gas Fee:</div>
                                <div className="text-right">
                                    {quoteInfo.estimateGasFee ? `${(parseFloat(quoteInfo.estimateGasFee) / 1e9).toFixed(9)} ${fromToken.symbol}` : 'Calculating...'}
                                </div>
                            </div>

                            {quoteInfo.quoteCompareList && quoteInfo.quoteCompareList.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="font-semibold mb-2">Alternative Routes:</div>
                                    <div className="space-y-2">
                                        {quoteInfo.quoteCompareList.map((quote, index) => (
                                            <div key={index} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center">
                                                    <img src={quote.dexLogo} alt={quote.dexName} className="w-4 h-4 mr-2" />
                                                    <span>{quote.dexName}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div>{quote.amountOut} {toToken.symbol}</div>
                                                    <div className="text-gray-500">Fee: {parseFloat(quote.tradeFee).toFixed(9)} {fromToken.symbol}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > solBalance || isLoading}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Processing...' : `Swap ${fromToken.symbol} to ${toToken.symbol}`}
                </button>

                {/* Debug info */}
                <div className="mt-2 text-xs text-gray-500">
                    <div>Amount: {amount}</div>
                    <div>Amount valid: {amount && parseFloat(amount) > 0 && parseFloat(amount) <= solBalance ? 'Yes' : 'No'}</div>
                    <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                    <div>Quote info: {quoteInfo ? 'Available' : 'Not available'}</div>
                </div>
            </div>
        </div>
    );
} 