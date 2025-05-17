'use client';

import { useState, useEffect } from 'react';
import { OkxProduct } from '../utils/okxApi';

export default function ProductsList() {
    const [products, setProducts] = useState<OkxProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/defi/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    simplifyInvestType: '100', // Stablecoin
                    network: 'ETH',
                    limit: '10',
                    sort: {
                        orders: [{
                            direction: 'DESC',
                            property: 'TVL'
                        }]
                    }
                })
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">DeFi Products</h1>
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
                <div className="grid gap-4">
                    {products.map((product) => (
                        <div key={product.investmentId} className="border p-4 rounded">
                            <h2 className="text-xl font-semibold">{product.investmentName}</h2>
                            <p>Platform: {product.platformName}</p>
                            <p>Rate: {product.rate}%</p>
                            <p>TVL: ${parseFloat(product.tvl).toLocaleString()}</p>
                            <div className="mt-2">
                                <h3 className="font-semibold">Underlying Tokens:</h3>
                                <ul className="list-disc list-inside">
                                    {product.underlyingToken.map((token, index) => (
                                        <li key={index}>
                                            {token.tokenSymbol} ({token.tokenAddress})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 