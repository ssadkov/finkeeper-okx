'use client';

import { useState, useEffect } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { getTokenIconUrl } from '../utils/tokenIcons';
import { formatTVL } from '../utils/formatters';
import Image from 'next/image';

interface Product {
    network: string;
    tokenSymbol: string;
    platformName: string;
    rate: string | number;
    tvl: number;
    tokenAddress: string;
    logoUrl: string;
    protocolLogo?: string;
    platformWebSite?: string;
}

const AVAILABLE_NETWORKS = ['ALL', 'SOL', 'APTOS', 'SUI', 'ETH'] as const;
type NetworkType = typeof AVAILABLE_NETWORKS[number];

export default function LocalInvestmentIdeas() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('ALL');
    const defaultIcon = 'https://finkeeper.pro/images/cryptologo/default_coin.webp';
    const defaultProtocolIcon = 'https://finkeeper.pro/images/cryptologo/default_coin.webp';
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    const getNetworkIcon = (network: string) => {
        return `https://finkeeper.pro/images/network/${network.toLowerCase()}.webp`;
    };

    useEffect(() => {
        const fetchLocalProducts = async () => {
            try {
                const response = await fetch('/api/defi/ideas');
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }

                // Сортируем по rate по убыванию
                const sortedProducts = data.ideas.sort((a: Product, b: Product) => 
                    parseFloat(String(b.rate)) - parseFloat(String(a.rate))
                );

                setProducts(sortedProducts);
            } catch (err) {
                console.error('Error fetching local products:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        fetchLocalProducts();
    }, []);

    const handleImageError = (tokenSymbol: string) => {
        setFailedImages(prev => new Set([...prev, tokenSymbol]));
    };

    const getTokenIcon = (product: Product) => {
        if (failedImages.has(product.tokenSymbol)) {
            return defaultIcon;
        }
        
        if (product.logoUrl) {
            return product.logoUrl;
        }
        
        return getTokenIconUrl(product.tokenSymbol);
    };

    // Фильтруем продукты по выбранной сети
    const filteredProducts = products.filter(product => 
        selectedNetwork === 'ALL' || product.network.toUpperCase() === selectedNetwork
    );

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-3">Investment Ideas</h1>
                <div className="flex items-center space-x-2 mb-4">
                    <label htmlFor="network-filter" className="text-sm font-medium text-gray-700">
                        Network:
                    </label>
                    <select
                        id="network-filter"
                        value={selectedNetwork}
                        onChange={(e) => setSelectedNetwork(e.target.value as NetworkType)}
                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        {AVAILABLE_NETWORKS.map(network => (
                            <option key={network} value={network}>
                                {network === 'ALL' ? 'All Networks' : network}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-lg">Loading...</div>
                </div>
            ) : error ? (
                <div className="text-red-500 text-center p-4">
                    Error: {error}
                </div>
            ) : (
                <div className="w-full overflow-x-auto bg-white rounded-lg shadow">
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Network</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Platform</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">TVL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Tokens</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 relative">
                                {filteredProducts.map((product, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={getNetworkIcon(product.network)}
                                                        alt={product.network}
                                                        width={24}
                                                        height={24}
                                                        className="rounded-full"
                                                        unoptimized
                                                    />
                                                </div>
                                                <span>{product.network}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={getTokenIcon(product)}
                                                        alt={product.tokenSymbol}
                                                        width={24}
                                                        height={24}
                                                        className="rounded-full"
                                                        onError={() => handleImageError(product.tokenSymbol)}
                                                        unoptimized
                                                    />
                                                </div>
                                                <span>{product.tokenSymbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={product.protocolLogo || defaultProtocolIcon}
                                                        alt={product.platformName}
                                                        width={24}
                                                        height={24}
                                                        className="rounded-full"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = defaultProtocolIcon;
                                                        }}
                                                        unoptimized
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    {product.platformWebSite ? (
                                                        <a 
                                                            href={product.platformWebSite}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                                        >
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
                                                        <span>{product.platformName}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {parseFloat(String(product.rate)).toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{formatTVL(product.tvl)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-mono truncate">{product.tokenAddress}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
} 