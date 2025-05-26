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
        try {
            const apiKey = localStorage.getItem('okx_api_key');
            const apiSecret = localStorage.getItem('okx_api_secret');
            const passphrase = localStorage.getItem('okx_passphrase');

            if (!apiKey || !apiSecret || !passphrase) {
                throw new Error('OKX API credentials not found');
            }

            const response = await fetch('/api/okx/balances', {
                method: 'GET',
                headers: {
                    'okx-api-key': apiKey,
                    'okx-api-secret': apiSecret,
                    'okx-passphrase': passphrase,
                },
            });

            const data = await response.json();
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
            } else {
                throw new Error(data.msg || 'Failed to fetch balances');
            }
        } catch (error) {
            console.error('Error fetching OKX balances:', error);
            setIsConnected(false);
            setBalances([]);
            setTotalBalance(0);
        }
    };

    const connect = async () => {
        await fetchBalances();
    };

    const disconnect = () => {
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
            fetchBalances();
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