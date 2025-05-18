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
import { useWalletContext } from '../context/WalletContext';

const STORAGE_KEY = 'solana_wallet_state';

interface StoredWalletState {
    provider: WalletProvider;
    publicKey: string;
}

export default function SolanaWalletConnect() {
    const { publicKey, setPublicKey } = useWalletContext();
    const [error, setError] = useState<string | null>(null);
    const [availableProviders, setAvailableProviders] = useState<WalletProvider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);

    // Загрузка сохраненного состояния при монтировании
    useEffect(() => {
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (storedState) {
            try {
                const { provider, publicKey: storedPublicKey } = JSON.parse(storedState) as StoredWalletState;
                setSelectedProvider(provider);
                setPublicKey(new PublicKey(storedPublicKey));
            } catch (err) {
                console.error('Error loading stored wallet state:', err);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, [setPublicKey]);

    // Сохранение состояния при изменении
    useEffect(() => {
        if (publicKey && selectedProvider) {
            const state: StoredWalletState = {
                provider: selectedProvider,
                publicKey: publicKey.toString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [publicKey, selectedProvider]);

    useEffect(() => {
        // Проверяем доступные провайдеры при загрузке
        const providers = getAvailableProviders();
        setAvailableProviders(providers);
        
        // Если есть сохраненный провайдер и он доступен, используем его
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (storedState) {
            try {
                const { provider } = JSON.parse(storedState) as StoredWalletState;
                if (providers.includes(provider)) {
                    setSelectedProvider(provider);
                    return;
                }
            } catch (err) {
                console.error('Error loading stored provider:', err);
            }
        }
        
        // Иначе выбираем OKX по умолчанию или первый доступный
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
            localStorage.removeItem(STORAGE_KEY);
        };

        const handleAccountChanged = (publicKey: PublicKey | null) => {
            setPublicKey(publicKey);
            if (!publicKey) {
                localStorage.removeItem(STORAGE_KEY);
            }
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
    }, [selectedProvider, setPublicKey]);

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
            localStorage.removeItem(STORAGE_KEY);
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
        <div className="flex items-center gap-2">
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

            {!publicKey ? (
                <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="text-sm">
                        {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
} 