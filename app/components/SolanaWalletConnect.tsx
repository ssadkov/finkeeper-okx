'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '../context/WalletContext';
import { useOkx } from '../context/OkxContext';
import OkxConnectModal from './OkxConnectModal';

export default function SolanaWalletConnect() {
    const { publicKey, disconnect } = useWallet();
    const { setPublicKey } = useWalletContext();
    const { isConnected, disconnect: disconnectOkx } = useOkx();
    const [isOkxModalOpen, setIsOkxModalOpen] = useState(false);

    useEffect(() => {
        if (publicKey) {
            setPublicKey(publicKey);
        }
    }, [publicKey, setPublicKey]);

    const handleDisconnect = () => {
        disconnect();
        if (isConnected) {
            disconnectOkx();
        }
    };

    return (
        <div className="flex items-center space-x-4">
            {!publicKey ? (
                <WalletModalButton className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Connect Wallet
                </WalletModalButton>
            ) : (
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-700">
                            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                        </span>
                        <button
                            onClick={handleDisconnect}
                            className="text-red-500 hover:text-red-600"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            )}

            <OkxConnectModal
                isOpen={isOkxModalOpen}
                onClose={() => setIsOkxModalOpen(false)}
            />
        </div>
    );
} 