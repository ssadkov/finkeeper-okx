'use client';

import { useState, useEffect } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { getTokenIconUrl } from '../utils/tokenIcons';
import { formatTVL, shortenAddress } from '../utils/formatters';
import Image from 'next/image';

interface Product {
    network: string;
    token_symbol: string;
    platform_name: string;
    rate: string | number;
    rate_type: string;
    invest_type: string;
    tvl: number;
    token_address: string;
    token_logo: string;
    platform_logo: string;
    platform_url: string;
}

interface InvestmentIdeasApiProps {
    apiKey: string;
}

const AVAILABLE_NETWORKS = ['ALL', 'SOL', 'APTOS', 'SUI', 'ETH'] as const;
type NetworkType = typeof AVAILABLE_NETWORKS[number];

export default function InvestmentIdeasApi({ apiKey }: InvestmentIdeasApiProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('ALL');
    const defaultIcon = 'https://finkeeper.pro/images/cryptologo/default_coin.webp';
    const defaultProtocolIcon = 'https://finkeeper.pro/images/cryptologo/default_coin.webp';
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const getNetworkIcon = (network: string | undefined) => {
        if (!network) return defaultIcon;
        const networkName = network.toUpperCase();
        switch (networkName) {
            case 'ETH':
                return 'https://finkeeper.pro/images/network/eth.webp';
            case 'SOL':
                return 'https://finkeeper.pro/images/network/sol.webp';
            case 'APTOS':
                return 'https://finkeeper.pro/images/network/aptos.webp';
            case 'SUI':
                return 'https://finkeeper.pro/images/network/sui.webp';
            default:
                return defaultIcon;
        }
    };

    const handleImageError = (tokenSymbol: string) => {
        setFailedImages(prev => new Set([...prev, tokenSymbol]));
    };
	
    const fetchProducts = async (network?: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const url = new URL('https://app.finkeeper.pro/ideasapi/datas/products');
            url.searchParams.append('id', apiKey);
            if (network && network !== 'ALL') {
                url.searchParams.append('network', network);
            }

            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.networks) {
                const allProducts = data.networks;
                // Сортируем по rate по убыванию
                const sortedProducts = allProducts.sort((a: Product, b: Product) => 
                    parseFloat(String(b.rate)) - parseFloat(String(a.rate))
                );
                setProducts(sortedProducts);
            } else {
                throw new Error('No products data found');
            }
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (apiKey) {
            fetchProducts(selectedNetwork);
        } else {
            setError('API key is not provided');
        }
    }, [apiKey, selectedNetwork]);

    const getTokenIcon = (product: Product) => {
        if (failedImages.has(product.token_symbol)) {
            return defaultIcon;
        }
        
        if (product.token_logo) {
            return product.token_logo;
        }
        
        return getTokenIconUrl(product.token_symbol);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const getInvestmentType = (type: string | number | undefined): string => {
        if (type === undefined || type === null) {
            return 'Unknown';
        }

        const cleanType = type.toString().trim();

        const normalizedType = cleanType === '7' ? '5' : cleanType;

        const typeMap: { [key: string]: string } = {
            '1': 'Saving',
            '2': 'Liquidity Pool',
            '3': 'Farming',
            '4': 'Vaults',
            '5': 'Staking'
        };

        const mappedType = typeMap[normalizedType];
        if (!mappedType) {
            console.log(`Неизвестный тип инвестиции: "${cleanType}"`);
        }
        return mappedType || 'Unknown';
    };

    return (
        <div className="w-full space-y-6 pb-24 overflow-y-auto h-screen">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold mb-3">Investment Ideas</h1>
                    <div className="flex items-center space-x-2">
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
                <button
                    onClick={() => {
                        setIsRefreshing(true);
                        setProducts([]);
                        fetchProducts(selectedNetwork);
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
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Network</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Platform</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">APR</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">APY</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">TVL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Tokens</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 relative">
                                {products.map((product, index) => (
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
                                                        src={product.token_logo || defaultIcon}
                                                        alt={product.token_symbol}
                                                        width={24}
                                                        height={24}
                                                        className="rounded-full"
                                                        onError={() => handleImageError(product.token_symbol)}
                                                        unoptimized
                                                    />
                                                </div>
                                                <span>{product.token_symbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={product.platform_logo || defaultProtocolIcon}
                                                        alt={product.platform_name}
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
                                                {product.platform_url ? (
                                                    <a
                                                        href={product.platform_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                                    >
                                                        {product.platform_name}
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
                                                    <span>{product.platform_name}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
											{(() => {
                                                return getInvestmentType(product.invest_type);
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {product.rate_type === '1' ? (parseFloat(String(product.rate)) * 100).toFixed(2) + '%' : ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {product.rate_type === '0' ? (parseFloat(String(product.rate)) * 100).toFixed(2) + '%' : ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{formatTVL(product.tvl)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <span className="truncate">
                                                    {shortenAddress(product.token_address)}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(product.token_address)}
                                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                                    title="Copy address"
                                                >
                                                    <svg 
                                                        className="w-4 h-4" 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="mt-8 grid grid-cols-2 gap-8">
                {/* Example Request */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Example Request</h3>
                        <button
                            onClick={() => copyToClipboard(`curl -X GET "https://app.finkeeper.pro/ideasapi/datas/products?id=*********&network=eth&token=eth" \\
  -H "Content-Type: application/json"`)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title="Copy request"
                        >
                            <svg 
                                className="w-5 h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </button>
                    </div>
                    <pre className="bg-gray-100 text-gray-800 p-4 rounded overflow-x-auto">
                        <code>{`curl -X GET "https://app.finkeeper.pro/ideasapi/datas/products?id=*********&network=eth&token=eth" \\
  -H "Content-Type: application/json"`}</code>
                    </pre>
                </div>

                {/* Example Response */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Example Response</h3>
                    <pre className="bg-gray-100 text-gray-800 p-4 rounded overflow-x-auto">
                        <code>{`{
  "timestamp": "2025-06-03T14:10:04.000Z",
  "totalCount": 274,
  "networks": [
    {
      "investment_id": 1,
      "investment_name": "USDC",
      "chain_id": "1",
      "network": "ETH",
      "rate": "0.02561",
      "invest_type": "1",
      "platform_name": "Compound",
      "platform_id": 1,
      "platform_url": "https://app.compound.finance",
      "platform_logo": "https://static.coinall.ltd/cdn/web3/protocol/logo/compound-none.png",
      "pool_version": "1",
      "rate_type": "0",
      "tvl": "33559261",
      "token_address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "token_symbol": "USDC",
      "token_id": "193",
      "token_logo": "https://static.coinall.ltd/cdn/wallet/logo/USDC.png",
      "token_decimal": "6",
      "updated_at": "2025-06-03 17:00:14"
    }
  ]
}`}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
} 