'use client';

import { useState } from 'react';

interface FormData {
    chainId: string;
    walletAddress: string;
}

interface PlatformDetails {
    networkHoldVoList: Array<{
        network: string;
        chainId: string;
        investTokenBalanceVoList: Array<{
            investType: string;
            assetsTokenList: Array<{
                tokenSymbol: string;
                tokenLogo: string;
                coinAmount: string;
                currencyAmount: string;
                tokenPrecision: string;
                tokenAddress: string;
                network: string;
            }>;
            totalValue: string;
        }>;
    }>;
    platformName: string;
    analysisPlatformId: string;
    platformLogo: string;
    platformUrl: string;
}

const defaultFormData: FormData = {
    chainId: '1', // ETH по умолчанию
    walletAddress: ''
};

export default function PositionsPage() {
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchPositions = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/defi/positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddressList: [{
                        chainId: parseInt(formData.chainId),
                        walletAddress: formData.walletAddress
                    }]
                })
            });
            
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.data || !Array.isArray(data.data.walletIdPlatformList)) {
                throw new Error('Invalid response format from API');
            }
            
            // Фильтруем только те записи, у которых есть platformList
            const validPositions = data.data.walletIdPlatformList.filter(
                (wallet: any) => Array.isArray(wallet.platformList) && wallet.platformList.length > 0
            );
            
            setPositions(validPositions);
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch positions');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlatformDetails = async (platformId: string) => {
        setLoadingDetails(true);
        try {
            const response = await fetch(`/api/defi/positions?platformId=${platformId}&chainId=${formData.chainId}&walletAddress=${formData.walletAddress}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.data || !data.data.walletIdPlatformDetailList?.[0]) {
                throw new Error('Invalid response format from API');
            }
            
            // Получаем первый элемент из списка деталей
            const platformDetails = data.data.walletIdPlatformDetailList[0];
            
            // Проверяем наличие необходимых данных
            if (!platformDetails.networkHoldVoList || !Array.isArray(platformDetails.networkHoldVoList)) {
                throw new Error('Invalid platform details format');
            }
            
            setSelectedPlatform(platformDetails);
        } catch (err) {
            console.error('Error fetching platform details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch platform details');
            setSelectedPlatform(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    if (error) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                <button 
                    onClick={fetchPositions}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">User Positions</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chain ID
                        </label>
                        <select
                            name="chainId"
                            value={formData.chainId}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                        >
                            <option value="1">Ethereum (1)</option>
                            <option value="56">BSC (56)</option>
                            <option value="137">Polygon (137)</option>
                            <option value="42161">Arbitrum (42161)</option>
                            <option value="501">Solana (501)</option>
                            <option value="784">SUI (784)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wallet Address
                        </label>
                        <input
                            type="text"
                            name="walletAddress"
                            value={formData.walletAddress}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            placeholder="0x..."
                        />
                    </div>
                </div>

                <button 
                    onClick={fetchPositions}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                    {loading ? 'Loading...' : 'Fetch Positions'}
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-lg">Loading...</div>
                </div>
            )}

            {!loading && positions.length === 0 && (
                <div className="text-center text-gray-500">
                    No positions found. Enter a wallet address and click the button above to fetch positions.
                </div>
            )}

            {!loading && positions.length > 0 && (
                <>
                    <div className="overflow-x-auto mb-8">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (USD)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Positions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {positions.map((wallet) => (
                                    wallet.platformList?.map((platform: any) => (
                                        <tr key={platform.analysisPlatformId}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {platform.platformLogo && (
                                                        <img 
                                                            src={platform.platformLogo} 
                                                            alt={platform.platformName}
                                                            className="w-8 h-8 rounded-full mr-3"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{platform.platformName}</div>
                                                        <a 
                                                            href={platform.platformUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-500 hover:text-blue-600"
                                                        >
                                                            Visit Platform
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">${parseFloat(platform.currencyAmount).toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {platform.networkBalanceVoList.map((network: any) => (
                                                        <div key={network.chainId} className="flex items-center">
                                                            {network.networkLogo && (
                                                                <img 
                                                                    src={network.networkLogo} 
                                                                    alt={network.network}
                                                                    className="w-4 h-4 mr-2"
                                                                />
                                                            )}
                                                            {network.network}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{platform.investmentCount}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => fetchPlatformDetails(platform.analysisPlatformId)}
                                                    className="text-blue-500 hover:text-blue-600"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {selectedPlatform && (
                        <>
                            <div className="mt-8 bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        {selectedPlatform.platformLogo && (
                                            <img 
                                                src={selectedPlatform.platformLogo} 
                                                alt={selectedPlatform.platformName}
                                                className="w-12 h-12 rounded-full mr-4"
                                            />
                                        )}
                                        <h2 className="text-xl font-bold">{selectedPlatform.platformName}</h2>
                                    </div>
                                    <a 
                                        href={selectedPlatform.platformUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600"
                                    >
                                        Visit Platform
                                    </a>
                                </div>

                                {selectedPlatform.networkHoldVoList.map((network, index) => (
                                    <div key={index} className="mb-6">
                                        <h3 className="text-lg font-semibold mb-3">{network.network}</h3>
                                        {network.investTokenBalanceVoList.map((investment, invIndex) => (
                                            <div key={invIndex} className="bg-gray-50 rounded-lg p-4 mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium">Total Value: ${parseFloat(investment.totalValue).toFixed(2)}</span>
                                                    <span className="text-sm text-gray-500">
                                                        Type: {investment.investType === '1' ? 'Save' : 
                                                               investment.investType === '2' ? 'Pool' :
                                                               investment.investType === '3' ? 'Farm' :
                                                               investment.investType === '4' ? 'Vaults' : 'Stake'}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {investment.assetsTokenList.map((token, tokenIndex) => (
                                                        <div key={tokenIndex} className="flex items-center justify-between">
                                                            <div className="flex items-center">
                                                                {token.tokenLogo && (
                                                                    <img 
                                                                        src={token.tokenLogo} 
                                                                        alt={token.tokenSymbol}
                                                                        className="w-6 h-6 rounded-full mr-2"
                                                                    />
                                                                )}
                                                                <span>{token.tokenSymbol}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div>{parseFloat(token.coinAmount).toFixed(6)} {token.tokenSymbol}</div>
                                                                <div className="text-sm text-gray-500">${parseFloat(token.currencyAmount).toFixed(2)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Platform Details Request</h3>
                                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                                        <code>{`curl -X GET "${window.location.origin}/api/defi/positions?platformId=${selectedPlatform.analysisPlatformId}&chainId=${formData.chainId}&walletAddress=${formData.walletAddress}" \\
  -H "Content-Type: application/json"`}</code>
                                    </pre>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Platform Details Response</h3>
                                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                                        <code>{JSON.stringify({
                                            code: 0,
                                            msg: "",
                                            data: {
                                                walletIdPlatformDetailList: [selectedPlatform]
                                            }
                                        }, null, 2)}</code>
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Example Request</h3>
                            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                                <code>{`curl -X POST "${window.location.origin}/api/defi/positions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "walletAddressList": [
      {
        "chainId": ${formData.chainId},
        "walletAddress": "${formData.walletAddress}"
      }
    ]
  }'`}</code>
                            </pre>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Example Response</h3>
                            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                                <code>{JSON.stringify({
                                    code: 0,
                                    msg: "",
                                    data: {
                                        walletIdPlatformList: positions.slice(0, 1).map(wallet => ({
                                            platformList: wallet.platformList.slice(0, 1),
                                            totalAssets: wallet.totalAssets
                                        }))
                                    }
                                }, null, 2)}</code>
                            </pre>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
} 