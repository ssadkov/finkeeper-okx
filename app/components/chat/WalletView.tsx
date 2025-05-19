'use client';

import { useWalletContext } from '../../context/WalletContext';
import { Wallet, Copy } from 'lucide-react';

interface WalletViewProps {
  message: string;
}

export function WalletView({ message }: WalletViewProps) {
  const { publicKey } = useWalletContext();

  const copyToClipboard = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
    }
  };

  if (!publicKey) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Wallet className="h-4 w-4" />
          <span>Wallet not connected</span>
        </div>
      </div>
    );
  }

  const address = publicKey.toString();

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{message}</span>
      </div>
      <div className="mt-2">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Wallet address:</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 font-mono text-sm bg-zinc-100 dark:bg-zinc-800 p-2 rounded break-all">
            {address}
          </div>
          <button
            onClick={copyToClipboard}
            className="h-8 w-8 bg-transparent hover:bg-zinc-200 rounded"
            title="Copy address"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          This is a public address where you can receive funds on the Solana blockchain
        </div>
      </div>
    </div>
  );
} 