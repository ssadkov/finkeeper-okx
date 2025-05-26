'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '../context/WalletContext';
import { useEffect } from 'react';

export default function SolanaWalletConnect() {
    const { publicKey: adapterPublicKey, disconnect } = useWallet();
    const { publicKey, setPublicKey } = useWalletContext();

    useEffect(() => {
        setPublicKey(adapterPublicKey);
    }, [adapterPublicKey, setPublicKey]);

    return (
        <div className="flex items-center gap-2">
            {!adapterPublicKey ? (
                <WalletModalButton className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    Connect Wallet
                </WalletModalButton>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="text-sm">
                        {adapterPublicKey.toString().slice(0, 4)}...{adapterPublicKey.toString().slice(-4)}
                    </div>
                    <button
                        onClick={() => {
                            disconnect();
                            setPublicKey(null);
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
} 