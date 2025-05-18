import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                    <Link 
                        href="/products" 
                        className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
                    >
                        <h2 className="text-2xl font-semibold mb-2">DeFi Protocols</h2>
                        <p className="text-gray-600">View and analyze DeFi protocols and their products</p>
                    </Link>
                    
                    <Link 
                        href="/positions" 
                        className="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
                    >
                        <h2 className="text-2xl font-semibold mb-2">User Positions</h2>
                        <p className="text-gray-600">Check your positions across different protocols</p>
                    </Link>
                </div>
            </main>
        </div>
    );
}
