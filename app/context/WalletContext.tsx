'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

interface TokenInfo {
    symbol: string;
    balance: string;
    address: string;
}

interface TokenAsset {
    token: string;
    amount: number;
    value: number;
}

interface Position {
    platformList: Array<{
        analysisPlatformId: string;
        platformName: string;
        platformLogo: string;
        platformUrl: string;
        currencyAmount: string;
        investmentCount: number;
        networkBalanceVoList: Array<{
            network: string;
            networkLogo: string;
            chainId: string;
        }>;
    }>;
    totalAssets: string;
}

interface WalletContextType {
    publicKey: PublicKey | null;
    setPublicKey: (publicKey: PublicKey | null) => void;
    walletTokens: TokenInfo[];
    setWalletTokens: (tokens: TokenInfo[]) => void;
    totalValue: number;
    balances: TokenAsset[];
    positions: Position[];
    fetchWalletData: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [walletTokens, setWalletTokens] = useState<TokenInfo[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [balances, setBalances] = useState<TokenAsset[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    const fetchWalletData = async () => {
        if (!publicKey) return;
        
        try {
            const response = await fetch('/api/wallet/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch wallet data');
            }

            setTotalValue(data.totalValue || 0);
            const balancesData = Array.isArray(data.balances) ? data.balances : [];
            setBalances(balancesData);
            
            const tokenInfo = balancesData.map((token: TokenAsset) => ({
                symbol: token?.token || '',
                balance: (token?.amount || 0).toString(),
                address: token?.token || ''
            }));
            setWalletTokens(tokenInfo);

            const positionsResponse = await fetch('/api/defi/positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddressList: [{
                        chainId: 501,
                        walletAddress: publicKey.toString()
                    }]
                })
            });

            const positionsData = await positionsResponse.json();

            if (positionsData.code === 0 && positionsData.data?.walletIdPlatformList) {
                const validPositions = positionsData.data.walletIdPlatformList.filter(
                    (wallet: Position) => Array.isArray(wallet.platformList) && wallet.platformList.length > 0
                );
                setPositions(validPositions);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        }
    };

    // Fetch wallet data when publicKey changes
    useEffect(() => {
        if (publicKey) {
            fetchWalletData();
        } else {
            setWalletTokens([]);
        }
    }, [publicKey]);

    return (
        <WalletContext.Provider value={{
            publicKey,
            setPublicKey,
            walletTokens,
            setWalletTokens,
            totalValue,
            balances,
            positions,
            fetchWalletData
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWalletContext = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWalletContext must be used within a WalletProvider');
    }
    return context;
}; 