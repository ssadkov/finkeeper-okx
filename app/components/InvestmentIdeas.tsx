'use client';

import { useState, useEffect } from 'react';
import { OkxProduct } from '../utils/okxApi';
import { useWalletContext } from '../context/WalletContext';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { usePlatforms } from '../hooks/usePlatforms';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import SwapModal from './SwapModal';
import { getCachedData, setCachedData } from '../utils/cache';

interface SupplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: OkxProduct | null;
    maxAmount: number;
    onSupply: (amount: number) => void;
    isProcessing: boolean;
}

function SupplyModal({ isOpen, onClose, product, maxAmount, onSupply, isProcessing }: SupplyModalProps) {
    const [amount, setAmount] = useState('');

    if (!isOpen || !product) return null;

    const tokenSymbol = product.underlyingToken[0]?.tokenSymbol || '';

    const handleSupply = () => {
        const numAmount = parseFloat(amount);
        if (numAmount > 0 && numAmount <= maxAmount) {
            onSupply(numAmount);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Supply {product.investmentName} ({tokenSymbol})</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>
                
                <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-600">Protocol:</span>
                        <span className="font-medium">{product.platformName}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-600">APY:</span>
                        <span className="font-medium text-green-600">
                            {(parseFloat(product.rate) * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Supply ({tokenSymbol})
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            max={maxAmount}
                            step="0.000001"
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Enter amount in ${tokenSymbol}`}
                        />
                        <button
                            onClick={() => setAmount(maxAmount.toString())}
                            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                            MAX
                        </button>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        Available: {maxAmount.toFixed(6)} {tokenSymbol}
                    </div>
                </div>

                <button
                    onClick={handleSupply}
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || isProcessing}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : `Supply ${tokenSymbol}`}
                </button>
            </div>
        </div>
    );
}

interface TokenInfo {
    symbol: string;
    balance: number;
    address: string;
}

export default function InvestmentIdeas() {
    const { publicKey } = useWalletContext();
    const [products, setProducts] = useState<OkxProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState<number>(0);
    const [offset, setOffset] = useState(0);
    const [tokenFilter, setTokenFilter] = useState('');
    const [showOnlyWalletTokens, setShowOnlyWalletTokens] = useState(false);
    const { walletTokens } = useWalletContext();
    const [selectedProduct, setSelectedProduct] = useState<OkxProduct | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const { sendTransaction, signMessage } = useSolanaWallet();
    const { setVisible } = useWalletModal();
    const [isProcessing, setIsProcessing] = useState(false);
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const { platforms, loading: platformsLoading } = usePlatforms();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isTokenInWallet = (tokenSymbol: string) => {
        // Проверяем нативный SOL
        if (tokenSymbol === 'SOL' && publicKey) {
            return true;
        }
        // Проверяем остальные токены
        return walletTokens?.some(token => 
            token.symbol.toUpperCase() === tokenSymbol.toUpperCase() && 
            parseFloat(token.balance) > 0
        );
    };

    const hasWalletTokens = (product: OkxProduct) => {
        return product.underlyingToken.some(token => isTokenInWallet(token.tokenSymbol));
    };

    const filteredProducts = products.filter(product => {
        // Сначала применяем фильтр по токенам в кошельке
        if (showOnlyWalletTokens && !hasWalletTokens(product)) {
            return false;
        }
        // Затем применяем текстовый фильтр
        if (!tokenFilter) return true;
        return product.underlyingToken.some(token => 
            token.tokenSymbol.toLowerCase().includes(tokenFilter.toLowerCase())
        );
    });

    const fetchProducts = async (currentOffset: number) => {
        if (currentOffset === 0) {
            setLoading(true);
            setError(null);
        }
        
        const requestBody = {
            simplifyInvestType: "101",
            network: "SOL",
            offset: currentOffset.toString(),
            sort: {
                orders: [{
                    direction: "DESC",
                    property: "RATE"
                }]
            }
        };

        // Проверяем кэш только для первой загрузки (offset = 0)
        if (currentOffset === 0) {
            const cachedData = getCachedData<{ investments: OkxProduct[], total: string }>('investment_ideas');
            if (cachedData && !isRefreshing) {
                setProducts(cachedData.investments);
                setTotal(parseInt(cachedData.total));
                setLoading(false);
                return;
            }
        }
        
        try {
            const response = await fetch('/api/defi/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.data || !Array.isArray(data.data.investments)) {
                throw new Error('Invalid response format from API');
            }
            
            if (currentOffset === 0) {
                setTotal(parseInt(data.data.total));
                setProducts(data.data.investments);
                // Кэшируем данные только для первой загрузки
                setCachedData('investment_ideas', {
                    investments: data.data.investments,
                    total: data.data.total
                });
            } else {
                setProducts(prev => [...prev, ...data.data.investments]);
            }
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            if (currentOffset === 0) {
                setLoading(false);
            }
        }
    };

    // Начальная загрузка данных
    useEffect(() => {
        fetchProducts(0);
    }, []);

    // Загрузка следующей порции данных
    useEffect(() => {
        if (offset > 0 && offset < total) {
            const timer = setTimeout(() => {
                fetchProducts(offset);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [offset, total]);

    // Автоматическая подгрузка
    useEffect(() => {
        if (!loading && offset + 10 < total) {
            const timer = setTimeout(() => {
                setOffset(prev => prev + 10);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [loading, offset, total]);

    const handleSupply = async (amount: number) => {
        if (!selectedProduct || !publicKey) return;

        try {
            setIsProcessing(true);
            const tokenSymbol = selectedProduct.underlyingToken[0]?.tokenSymbol;

            // Call the supply API endpoint
            const response = await fetch('/api/kamino/supply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    symbol: tokenSymbol,
                    walletAddress: publicKey.toString()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process supply transaction');
            }

            // Send the transaction
            const signature = await sendTransaction(data.transaction, connection);
            console.log('Transaction sent:', signature);

            // Close the modal
            setIsModalOpen(false);
            setSelectedProduct(null);

            // TODO: Show success message or update UI
        } catch (error) {
            console.error('Error supplying tokens:', error);
            // TODO: Show error message to user
        } finally {
            setIsProcessing(false);
        }
    };

    const getTokenBalance = (tokenSymbol: string) => {
        if (tokenSymbol === 'SOL' && publicKey) {
            // TODO: Get SOL balance
            return 0;
        }
        const token = walletTokens?.find(t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase());
        return token ? parseFloat(token.balance) : 0;
    };

    const handleSignMessage = async () => {
        if (!publicKey) {
            setVisible(true);
            return;
        }
        
        try {
            const message = new TextEncoder().encode('Hello from FinKeeper!');
            const signature = await signMessage?.(message);
            console.log('Message signed:', signature);
            // You can add a toast notification here to show success
        } catch (error) {
            console.error('Error signing message:', error);
            // You can add a toast notification here to show error
        }
    };

    if (error) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                <button 
                    onClick={() => {
                        setIsRefreshing(true);
                        setOffset(0);
                        setProducts([]);
                        fetchProducts(0);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="mb-7 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Investment Ideas</h1>
                    <p className="text-gray-600">Top DeFi opportunities on Solana network</p>
                </div>
                <button
                    onClick={() => {
                        setIsRefreshing(true);
                        setOffset(0);
                        setProducts([]);
                        fetchProducts(0);
                    }}
                    disabled={loading}
                    className={`p-1.5 rounded transition-colors ${
                        loading 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title="Refresh investment ideas"
                >
                    <svg 
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                        />
                    </svg>
                </button>
            </div>

            {loading && products.length === 0 && (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-lg">Loading...</div>
                </div>
            )}

            {!loading && products.length === 0 && (
                <div className="text-center text-gray-500">
                    No investment opportunities found.
                </div>
            )}

            {products.length > 0 && (
                <div className="flex flex-col flex-grow">
                    <div className="overflow-x-auto overflow-y-auto flex-grow" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex flex-col space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <span>Name</span>
                                                <input
                                                    type="text"
                                                    value={tokenFilter}
                                                    onChange={(e) => setTokenFilter(e.target.value)}
                                                    placeholder="Filter by token..."
                                                    className="px-2 py-1 text-sm border rounded"
                                                />
                                            </div>
                                            <label className="flex items-center space-x-2 text-sm text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={showOnlyWalletTokens}
                                                    onChange={(e) => setShowOnlyWalletTokens(e.target.checked)}
                                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                                />
                                                <span>Only wallet tokens</span>
                                            </label>
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APY</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product.investmentId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-between">
                                                <div className={`text-sm font-medium ${hasWalletTokens(product) ? 'text-green-600' : 'text-gray-900'}`}>
                                                    {product.investmentName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {platforms[product.platformName] ? (
                                                    <a 
                                                        href={platforms[product.platformName].platformWebSite}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <img 
                                                            src={platforms[product.platformName].logo} 
                                                            alt={product.platformName}
                                                            className="w-6 h-6 mr-2 rounded-full"
                                                        />
                                                        {product.platformName}
                                                        <svg 
                                                            className="w-4 h-4 ml-1" 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path 
                                                                strokeLinecap="round" 
                                                                strokeLinejoin="round" 
                                                                strokeWidth={2} 
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                                                            />
                                                        </svg>
                                                    </a>
                                                ) : (
                                                    product.platformName
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-green-600 font-medium">
                                                {(parseFloat(product.rate) * 100).toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                ${parseFloat(product.tvl).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {loading && (
                        <div className="flex justify-center mt-4">
                            <div className="text-gray-500">Loading more...</div>
                        </div>
                    )}
                </div>
            )}

            <SupplyModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                maxAmount={selectedProduct ? getTokenBalance(selectedProduct.underlyingToken[0].tokenSymbol) : 0}
                onSupply={handleSupply}
                isProcessing={isProcessing}
            />

            <SwapModal
                isOpen={isSwapModalOpen}
                onClose={() => setIsSwapModalOpen(false)}
                fromToken={{
                    symbol: 'SOL',
                    address: '11111111111111111111111111111111'
                }}
                toToken={{
                    symbol: 'USDC',
                    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                }}
            />
        </div>
    );
} 