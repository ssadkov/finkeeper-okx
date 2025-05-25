'use client';

import { useState, useEffect } from 'react';
import { OkxProduct } from '../utils/okxApi';
import { useWalletContext } from '../context/WalletContext';

export default function InvestmentIdeas() {
    const [products, setProducts] = useState<OkxProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState<number>(0);
    const [offset, setOffset] = useState(0);
    const [tokenFilter, setTokenFilter] = useState('');
    const [showOnlyWalletTokens, setShowOnlyWalletTokens] = useState(false);
    const { walletTokens, publicKey } = useWalletContext();

    const isTokenInWallet = (tokenSymbol: string) => {
        // Проверяем нативный SOL
        if (tokenSymbol === 'SOL' && publicKey) {
            return true;
        }
        // Проверяем остальные токены
        return walletTokens?.some(token => 
            token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
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
        setLoading(true);
        setError(null);
        
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
            } else {
                setProducts(prev => [...prev, ...data.data.investments]);
            }
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts(0);
    }, []);

    useEffect(() => {
        if (offset > 0 && offset < total) {
            const timer = setTimeout(() => {
                fetchProducts(offset);
            }, 1100);
            return () => clearTimeout(timer);
        }
    }, [offset, total]);

    // Автоматическая подгрузка
    useEffect(() => {
        if (!loading && offset + 10 < total) {
            const timer = setTimeout(() => {
                setOffset(prev => prev + 10);
            }, 1100);
            return () => clearTimeout(timer);
        }
    }, [loading, offset, total]);

    if (error) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                <button 
                    onClick={() => fetchProducts(0)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Investment Ideas</h1>
                <p className="text-gray-600">Top DeFi opportunities on Solana network</p>
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
                                                <span>Show only wallet tokens</span>
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
                                            <div className={`text-sm font-medium ${hasWalletTokens(product) ? 'text-green-600' : 'text-gray-900'}`}>
                                                {product.investmentName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{product.platformName}</div>
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
        </div>
    );
} 