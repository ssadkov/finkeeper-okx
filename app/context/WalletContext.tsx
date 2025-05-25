'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';

interface TokenInfo {
    symbol: string;
    balance: string;
    address: string;
}

interface WalletContextType {
    publicKey: PublicKey | null;
    setPublicKey: (publicKey: PublicKey | null) => void;
    walletTokens: TokenInfo[];
    setWalletTokens: (tokens: TokenInfo[]) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [walletTokens, setWalletTokens] = useState<TokenInfo[]>([]);

    return (
        <WalletContext.Provider value={{ publicKey, setPublicKey, walletTokens, setWalletTokens }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWalletContext() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWalletContext must be used within a WalletProvider');
    }
    return context;
} 