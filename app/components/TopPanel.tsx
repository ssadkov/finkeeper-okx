'use client';

import { useState } from 'react';
import OkxConnectModal from './OkxConnectModal';
import SolanaWalletConnect from './SolanaWalletConnect';

export default function TopPanel() {
    const [isOkxModalOpen, setIsOkxModalOpen] = useState(false);

    return (
        <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold mr-4">FinKeeper OKX</h1>
                        <button
                            onClick={() => setIsOkxModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Connect OKX Exchange
                        </button>
                    </div>
                    <div className="flex items-center">
                        <SolanaWalletConnect />
                    </div>
                </div>
            </div>

            <OkxConnectModal
                isOpen={isOkxModalOpen}
                onClose={() => setIsOkxModalOpen(false)}
            />
        </div>
    );
} 