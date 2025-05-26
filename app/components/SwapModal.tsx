'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '../context/WalletContext';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromToken: {
        symbol: string;
        address: string;
        balance: number;
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
    const { publicKey, signTransaction } = useWallet();
    const { setVisible } = useWalletModal();
    const { walletTokens } = useWalletContext();
    const [solBalance, setSolBalance] = useState<number>(0);
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    useEffect(() => {
        const fetchSolBalance = async () => {
            if (!publicKey) return;
            try {
                const balance = await connection.getBalance(publicKey);
                setSolBalance(balance / 1e9); // Convert lamports to SOL
            } catch (err) {
                console.error('Error fetching SOL balance:', err);
            }
        };

        fetchSolBalance();
    }, [publicKey, connection]);

    if (!isOpen) return null;

    const handleSwap = async () => {
        if (!publicKey) {
            setVisible(true);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Get swap data from our API
            const response = await fetch('/api/dex/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromTokenAddress: fromToken.address,
                    toTokenAddress: toToken.address,
                    amount,
                    userWalletAddress: publicKey.toString(),
                    slippage: '0.5'
                })
            });

            const swapData = await response.json();

            if (!response.ok) {
                throw new Error(swapData.error || 'Failed to get swap data');
            }

            // Prepare transaction
            const transaction = Transaction.from(Buffer.from(swapData.callData, 'base64'));
            
            // Sign transaction
            if (!signTransaction) {
                throw new Error('Wallet does not support transaction signing');
            }
            const signedTx = await signTransaction(transaction);
            
            // Send transaction
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            console.log('Swap transaction sent:', signature);

            // Wait for confirmation
            await connection.confirmTransaction(signature);
            console.log('Swap confirmed:', signature);

            onClose();
        } catch (err) {
            console.error('Error executing swap:', err);
            setError(err instanceof Error ? err.message : 'Failed to execute swap');
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
            </div>
        </div>
    );
} 