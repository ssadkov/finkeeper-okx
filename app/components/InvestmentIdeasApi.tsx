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
	
	 const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`https://app.finkeeper.pro/ideasapi/datas/products?id=${apiKey}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.networks) {
                // Собираем все продукты из всех сетей в один массив
                const allProducts = Object.entries(data.networks).flatMap(([networkName, products]) => {
                    // products это массив для каждой сети
                    return (products as any[]).map(product => ({
                        ...product,
                        // Убедимся, что network установлен правильно
                        network: product.network || networkName
                    }));
                });

                // Сортируем по rate по убыванию
                const sortedProducts = allProducts.sort((a, b) => 
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
            fetchProducts();
        } else {
            setError('API key is not provided');
        }
    }, [apiKey]);

    const getTokenIcon = (product: Product) => {
        if (failedImages.has(product.token_symbol)) {
            return defaultIcon;
        }
        
        if (product.token_logo) {
            return product.token_logo;
        }
        
        return getTokenIconUrl(product.token_symbol);
    };

    // Фильтруем продукты по выбранной сети
    const filteredProducts = products.filter(product => 
        selectedNetwork === 'ALL' || product.network.toUpperCase() === selectedNetwork
    );

    // Добавляем функцию для копирования в буфер обмена
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // Можно добавить toast уведомление здесь, если есть
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Обновляем функцию для получения типа инвестиции
    const getInvestmentType = (type: string | number | undefined): string => {
        // Если значение не определено, возвращаем Unknown
        if (type === undefined || type === null) {
            return 'Unknown';
        }

        // Очищаем значение от возможных лишних символов и пробелов
        const cleanType = type.toString().trim();

        // Приводим некорректные значения к ближайшим корректным
        const normalizedType = cleanType === '7' ? '5' : cleanType;

        // Маппинг типов инвестиций
        const typeMap: { [key: string]: string } = {
            '1': 'Saving',
            '2': 'Liquidity Pool',
            '3': 'Farming',
            '4': 'Vaults',
            '5': 'Staking'
        };

        // Возвращаем mapped значение или Unknown если не найдено
        const mappedType = typeMap[normalizedType];
        if (!mappedType) {
            console.log(`Неизвестный тип инвестиции: "${cleanType}"`);
        }
        return mappedType || 'Unknown';
    };

    return (
        <div className="w-full space-y-6">
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
                        fetchProducts();
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
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
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
        </div>
    );
} 