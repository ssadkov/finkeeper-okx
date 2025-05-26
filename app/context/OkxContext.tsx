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

            const time = new Date().toISOString();
            const fundUrl = '/api/v5/asset/balances';
            const fundMessage = time + 'GET' + fundUrl;
            const fundEncoder = new TextEncoder();
            const fundKey = await crypto.subtle.importKey(
                'raw',
                fundEncoder.encode(apiSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const fundSignature = await crypto.subtle.sign(
                'HMAC',
                fundKey,
                fundEncoder.encode(fundMessage)
            );
            const fundSign = btoa(String.fromCharCode(...new Uint8Array(fundSignature)));

            const headers = {
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-TIMESTAMP': time,
                'OK-ACCESS-PASSPHRASE': passphrase,
                'OK-ACCESS-SIGN': fundSign,
                'Content-Type': 'application/json',
            };

            const response = await fetch('https://www.okx.com' + fundUrl, {
                method: 'GET',
                headers,
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