'use client';

import { useState, useEffect } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { getTokenIconUrl } from '../utils/tokenIcons';
import { formatTVL, shortenAddress } from '../utils/formatters';
import Image from 'next/image';

interface Token {
    token_id: number;
    token_symbol: string;
    network: string;
    logo_url: string;
    token_address: string;
    token_decimal: number;
    updated_at: string;
}

interface ApiResponse {
    timestamp: string;
    totalCount: number;
    tokens: Token[];
}

interface TokensApiProps {
    apiKey: string;
}

const AVAILABLE_NETWORKS = ['APTOS', 'SOL', 'SUI', 'ETH'] as const;
type NetworkType = typeof AVAILABLE_NETWORKS[number];

export default function TokensApi({ apiKey }: TokensApiProps) {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('APTOS');
    const defaultIcon = 'https://finkeeper.pro/images/cryptologo/default_coin.webp';
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

    const fetchTokens = async (network?: string) => {
        setLoading(true);
        setError(null);
        
        try {
            if (!apiKey) {
                throw new Error('API key is required');
            }

            let urlString = `https://app.finkeeper.pro/ideasapi/datas/tokens?id=${apiKey}`;
            if (network && network !== 'ALL') {
                urlString += `&network=${network.toLowerCase()}`;
            }

            console.log('Fetching tokens from:', urlString);
            const response = await fetch(urlString, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json() as ApiResponse;
            console.log('Response data:', data);

            if (!data || !data.tokens || !Array.isArray(data.tokens)) {
                throw new Error('Invalid response format: tokens array is missing');
            }

            setTokens(data.tokens);
            console.log(`Received ${data.tokens.length} tokens`);
        } catch (err) {
            console.error('Error fetching tokens:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
            setTokens([]);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTokens(selectedNetwork);
    }, [apiKey, selectedNetwork]);

    const getTokenIcon = (token: Token) => {
        if (failedImages.has(token.token_symbol)) {
            return defaultIcon;
        }
        
        if (token.logo_url) {
            return token.logo_url;
        }
        
        return defaultIcon;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="w-full space-y-6 pb-24 overflow-y-auto h-screen">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold mb-3">Tokens</h1>
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
                        setTokens([]);
                        fetchTokens(selectedNetwork);
                    }}
                    disabled={loading}
                    className={`p-1.5 rounded transition-colors ${
                        loading 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title="Refresh tokens"
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Token</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Network</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Decimals</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">Address</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 relative">
                                {tokens.map((token, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={getTokenIcon(token)}
                                                        alt={token.token_symbol}
                                                        width={24}
                                                        height={24}
                                                        className="rounded-full"
                                                        onError={() => handleImageError(token.token_symbol)}
                                                        unoptimized
                                                    />
                                                </div>
                                                <span>{token.token_symbol}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {token.network}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {token.token_decimal}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <span className="truncate">
                                                    {shortenAddress(token.token_address)}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(token.token_address)}
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
                            onClick={() => copyToClipboard(`curl -X GET "https://app.finkeeper.pro/ideasapi/datas/tokens?id=*********&network=eth&token=eth" \\
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
                        <code>{`curl -X GET "https://app.finkeeper.pro/ideasapi/datas/tokens?id=*********&network=eth&token=eth" \\
  -H "Content-Type: application/json"`}</code>
                    </pre>
                </div>

                {/* Example Response */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Example Response</h3>
                    <pre className="bg-gray-100 text-gray-800 p-4 rounded overflow-x-auto">
                        <code>{`{
  "timestamp": "2025-06-03T14:44:25.000Z",
  "totalCount": 6083,
  "tokens": [
    {
      "token_id": 1,
      "token_symbol": "ETH",
      "network": "ETH",
      "logo_url": "https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png",
      "token_address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "token_decimal": 18,
      "updated_at": "2025-06-03 01:00:24"
    }
  ]
}`}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
} 