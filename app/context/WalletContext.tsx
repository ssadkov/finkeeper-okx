'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';

interface WalletContextType {
  publicKey: PublicKey | null;
  setPublicKey: (publicKey: PublicKey | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);

  return (
    <WalletContext.Provider value={{ publicKey, setPublicKey }}>
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