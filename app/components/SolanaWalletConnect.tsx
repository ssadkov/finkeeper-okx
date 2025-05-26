'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalButton } from '@solana/wallet-adapter-react-ui';

export default function SolanaWalletConnect() {
    const { publicKey, disconnect } = useWallet();

    return (
        <div className="flex items-center gap-2">
            {!publicKey ? (
                <WalletModalButton className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    Connect Wallet
                </WalletModalButton>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="text-sm">
                        {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </div>
                    <button
                        onClick={disconnect}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
} 