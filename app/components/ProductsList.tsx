'use client';

import { useState } from 'react';
import { OkxProduct } from '../utils/okxApi';

interface FormData {
    simplifyInvestType: string;
    network: string;
    limit: string;
}

const defaultFormData: FormData = {
    simplifyInvestType: '100',
    network: 'ETH',
    limit: '100'
};

export default function ProductsList() {
    const [products, setProducts] = useState<OkxProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(defaultFormData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        
        const requestBody = {
            ...formData,
            sort: {
                orders: [{
                    direction: 'DESC',
                    property: 'RATE'
                }]
            }
        };
        
        console.log('Request parameters:', requestBody);
        
        try {
            const response = await fetch('/api/defi/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.data || !Array.isArray(data.data.investments)) {
                throw new Error('Invalid response format from API');
            }
            
            setProducts(data.data.investments);
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 text-lg mb-4">Error: {error}</div>
                <button 
                    onClick={fetchProducts}
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
                <h1 className="text-2xl font-bold mb-4">DeFi Products</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Investment Type
                        </label>
                        <select
                            name="simplifyInvestType"
                            value={formData.simplifyInvestType}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                        >
                            <option value="100">Stablecoin</option>
                            <option value="101">Single</option>
                            <option value="102">Multi</option>
                            <option value="103">Vaults</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Network
                        </label>
                        <input
                            type="text"
                            name="network"
                            value={formData.network}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            placeholder="e.g., ETH"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Limit
                        </label>
                        <input
                            type="number"
                            name="limit"
                            value={formData.limit}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            min="1"
                            max="100"
                        />
                    </div>
                </div>

                <button 
                    onClick={fetchProducts}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                    {loading ? 'Loading...' : 'Fetch Products'}
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-lg">Loading...</div>
                </div>
            )}

            {!loading && products.length === 0 && (
                <div className="text-center text-gray-500">
                    No products found. Click the button above to fetch products.
                </div>
            )}

            {!loading && products.length > 0 && (
                <>
                    <div className="overflow-x-auto mb-8">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map((product) => (
                                    <tr key={product.investmentId}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{product.investmentName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{product.platformName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{(parseFloat(product.rate) * 100).toFixed(2)}%</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">${parseFloat(product.tvl).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {product.underlyingToken.map((token, index) => (
                                                    <div key={index} className="mb-1">
                                                        {token.tokenSymbol} ({token.tokenAddress})
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Example Request</h3>
                            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                                <code>{`curl -X POST "http://localhost:3000/api/defi/products" \\
  -H "Content-Type: application/json" \\
  -d '{
    "simplifyInvestType": "${formData.simplifyInvestType}",
    "network": "${formData.network}",
    "limit": "${formData.limit}",
    "sort": {
      "orders": [{
        "direction": "DESC",
        "property": "RATE"
      }]
    }
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
                                        investments: products.slice(0, 2).map(p => ({
                                            investmentId: p.investmentId,
                                            investmentName: p.investmentName,
                                            platformName: p.platformName,
                                            rate: p.rate,
                                            tvl: p.tvl,
                                            underlyingToken: p.underlyingToken
                                        })),
                                        total: products.length.toString()
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