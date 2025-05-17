'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { 
    connectSolanaWallet, 
    disconnectSolanaWallet,
    addSolanaWalletListener,
    removeSolanaWalletListener,
    getAvailableProviders,
    type WalletProvider
} from '../utils/solanaWallet';

export default function SolanaWalletConnect() {
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [availableProviders, setAvailableProviders] = useState<WalletProvider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);

    useEffect(() => {
        // Проверяем доступные провайдеры при загрузке
        const providers = getAvailableProviders();
        setAvailableProviders(providers);
        
        // Если есть OKX, выбираем его по умолчанию
        if (providers.includes('okx')) {
            setSelectedProvider('okx');
        } else if (providers.length > 0) {
            setSelectedProvider(providers[0]);
        }
    }, []);

    useEffect(() => {
        if (!selectedProvider) return;

        const handleConnect = (publicKey: PublicKey) => {
            setPublicKey(publicKey);
            setError(null);
        };

        const handleDisconnect = () => {
            setPublicKey(null);
        };

        const handleAccountChanged = (publicKey: PublicKey | null) => {
            setPublicKey(publicKey);
        };

        // Добавляем слушатели событий
        addSolanaWalletListener(selectedProvider, 'connect', handleConnect);
        addSolanaWalletListener(selectedProvider, 'disconnect', handleDisconnect);
        addSolanaWalletListener(selectedProvider, 'accountChanged', handleAccountChanged);

        // Очистка
        return () => {
            removeSolanaWalletListener(selectedProvider, 'connect', handleConnect);
            removeSolanaWalletListener(selectedProvider, 'disconnect', handleDisconnect);
            removeSolanaWalletListener(selectedProvider, 'accountChanged', handleAccountChanged);
        };
    }, [selectedProvider]);

    const handleConnect = async () => {
        if (!selectedProvider) {
            setError('No wallet provider selected');
            return;
        }

        try {
            setError(null);
            const pubKey = await connectSolanaWallet(selectedProvider);
            setPublicKey(pubKey);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        }
    };

    const handleDisconnect = async () => {
        if (!selectedProvider) return;

        try {
            setError(null);
            await disconnectSolanaWallet(selectedProvider);
            setPublicKey(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
        }
    };

    if (availableProviders.length === 0) {
        return (
            <div className="text-sm text-gray-500">
                No Solana wallet providers found
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {error && (
                <div className="text-red-500 text-sm">
                    {error}
                </div>
            )}
            
            {!publicKey && (
                <div className="flex flex-col gap-2">
                    <select
                        value={selectedProvider || ''}
                        onChange={(e) => setSelectedProvider(e.target.value as WalletProvider)}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        {availableProviders.map((provider) => (
                            <option key={provider} value={provider}>
                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleConnect}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Connect {selectedProvider?.charAt(0).toUpperCase() + selectedProvider?.slice(1)} Wallet
                    </button>
                </div>
            )}
            
            {publicKey && (
                <div className="flex flex-col items-center gap-2">
                    <div className="text-sm">
                        Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect Wallet
                    </button>
                </div>
            )}
        </div>
    );
} 