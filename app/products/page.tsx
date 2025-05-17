'use client';

import ProductsList from '../components/ProductsList';

export default function ProductsPage() {
    return (
        <div className="p-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">DeFi Products</h1>
                <p className="text-gray-600 mt-2">Browse and analyze DeFi protocols and their products</p>
            </div>
            <ProductsList />
        </div>
    );
} 