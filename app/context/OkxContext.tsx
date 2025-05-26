'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface OkxBalance {
    availBal: string;
    bal: string;
    ccy: string;
    frozenBal: string;
}

interface OkxContextType {
    isConnected: boolean;
    balances: OkxBalance[];
    totalBalance: number;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const OkxContext = createContext<OkxContextType | undefined>(undefined);

export function OkxProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [balances, setBalances] = useState<OkxBalance[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);

    const fetchBalances = async () => {
        console.log('[OKX Client] Starting balance fetch');
        try {
            const apiKey = localStorage.getItem('okx_api_key');
            const apiSecret = localStorage.getItem('okx_api_secret');
            const passphrase = localStorage.getItem('okx_passphrase');

            console.log('[OKX Client] Credentials check:', {
                hasApiKey: !!apiKey,
                hasApiSecret: !!apiSecret,
                hasPassphrase: !!passphrase
            });

            if (!apiKey || !apiSecret || !passphrase) {
                throw new Error('OKX API credentials not found');
            }

            console.log('[OKX Client] Making request to local API');
            const response = await fetch('/api/okx/balances', {
                method: 'GET',
                headers: {
                    'okx-api-key': apiKey,
                    'okx-api-secret': apiSecret,
                    'okx-passphrase': passphrase,
                },
            });

            console.log('[OKX Client] Response status:', response.status);
            const data = await response.json();
            console.log('[OKX Client] Response data:', {
                code: data.code,
                hasData: !!data.data,
                dataLength: data.data?.length,
                error: data.error
            });

            if (data.code === '0' && Array.isArray(data.data)) {
                setBalances(data.data);
                // Подсчитываем общий баланс в USDT
                const total = data.data.reduce((sum: number, balance: OkxBalance) => {
                    if (balance.ccy === 'USDT') {
                        return sum + parseFloat(balance.bal);
                    }
                    return sum;
                }, 0);
                setTotalBalance(total);
                setIsConnected(true);
                console.log('[OKX Client] Successfully updated balances');
            } else {
                throw new Error(data.msg || data.error || 'Failed to fetch balances');
            }
        } catch (error) {
            console.error('[OKX Client] Error fetching OKX balances:', error);
            setIsConnected(false);
            setBalances([]);
            setTotalBalance(0);
            throw error; // Пробрасываем ошибку дальше для обработки
        }
    };

    const connect = async () => {
        console.log('[OKX Client] Starting connection');
        try {
            await fetchBalances();
            console.log('[OKX Client] Connection successful');
        } catch (error) {
            console.error('[OKX Client] Connection failed:', error);
            throw error;
        }
    };

    const disconnect = () => {
        console.log('[OKX Client] Disconnecting');
        localStorage.removeItem('okx_api_key');
        localStorage.removeItem('okx_api_secret');
        localStorage.removeItem('okx_passphrase');
        setIsConnected(false);
        setBalances([]);
        setTotalBalance(0);
    };

    // Проверяем подключение при загрузке
    useEffect(() => {
        const apiKey = localStorage.getItem('okx_api_key');
        if (apiKey) {
            console.log('[OKX Client] Found stored API key, attempting to connect');
            fetchBalances().catch(error => {
                console.error('[OKX Client] Auto-connect failed:', error);
            });
        }
    }, []);

    return (
        <OkxContext.Provider value={{ isConnected, balances, totalBalance, connect, disconnect }}>
            {children}
        </OkxContext.Provider>
    );
}

export function useOkx() {
    const context = useContext(OkxContext);
    if (context === undefined) {
        throw new Error('useOkx must be used within an OkxProvider');
    }
    return context;
} 