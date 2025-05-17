import ProductsList from './components/ProductsList';
import Link from 'next/link';

export default function Home() {
    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">OKX DeFi Dashboard</h1>
                <Link 
                    href="/positions"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                    View User Positions
                </Link>
            </div>
            <ProductsList />
        </div>
    );
}
