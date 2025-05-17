import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Определяем типы для разных провайдеров
type PhantomProvider = {
    connect: () => Promise<{ publicKey: PublicKey }>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
    signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
    on: (event: string, callback: (args: any) => void) => void;
    removeListener: (event: string, callback: (args: any) => void) => void;
};

type SolflareProvider = {
    connect: () => Promise<{ publicKey: PublicKey }>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
    signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
    on: (event: string, callback: (args: any) => void) => void;
    removeListener: (event: string, callback: (args: any) => void) => void;
};

declare global {
    interface Window {
        okxwallet?: {
            solana?: PhantomProvider;
        };
        phantom?: {
            solana?: PhantomProvider;
        };
        solflare?: SolflareProvider;
    }
}

// Определяем доступные провайдеры
export type WalletProvider = 'okx' | 'phantom' | 'solflare';

// Функция для получения провайдера
const getProvider = (provider: WalletProvider) => {
    switch (provider) {
        case 'okx':
            return window.okxwallet?.solana;
        case 'phantom':
            return window.phantom?.solana;
        case 'solflare':
            return window.solflare;
        default:
            return undefined;
    }
};

// Функция для проверки доступности провайдера
export const isProviderAvailable = (provider: WalletProvider): boolean => {
    return !!getProvider(provider);
};

// Получение списка доступных провайдеров
export const getAvailableProviders = (): WalletProvider[] => {
    const providers: WalletProvider[] = [];
    if (isProviderAvailable('okx')) providers.push('okx');
    if (isProviderAvailable('phantom')) providers.push('phantom');
    if (isProviderAvailable('solflare')) providers.push('solflare');
    return providers;
};

export const connectSolanaWallet = async (provider: WalletProvider) => {
    try {
        const walletProvider = getProvider(provider);
        if (!walletProvider) {
            throw new Error(`${provider} wallet provider not found`);
        }

        const response = await walletProvider.connect();
        return response.publicKey;
    } catch (error) {
        console.error(`Error connecting to ${provider} wallet:`, error);
        throw error;
    }
};

export const disconnectSolanaWallet = async (provider: WalletProvider) => {
    try {
        const walletProvider = getProvider(provider);
        if (!walletProvider) {
            throw new Error(`${provider} wallet provider not found`);
        }

        await walletProvider.disconnect();
    } catch (error) {
        console.error(`Error disconnecting from ${provider} wallet:`, error);
        throw error;
    }
};

export const signSolanaTransaction = async (provider: WalletProvider, transaction: Transaction) => {
    try {
        const walletProvider = getProvider(provider);
        if (!walletProvider) {
            throw new Error(`${provider} wallet provider not found`);
        }

        return await walletProvider.signTransaction(transaction);
    } catch (error) {
        console.error(`Error signing Solana transaction with ${provider}:`, error);
        throw error;
    }
};

export const signSolanaMessage = async (provider: WalletProvider, message: string) => {
    try {
        const walletProvider = getProvider(provider);
        if (!walletProvider) {
            throw new Error(`${provider} wallet provider not found`);
        }

        const encodedMessage = new TextEncoder().encode(message);
        return await walletProvider.signMessage(encodedMessage, 'utf8');
    } catch (error) {
        console.error(`Error signing Solana message with ${provider}:`, error);
        throw error;
    }
};

export const addSolanaWalletListener = (provider: WalletProvider, event: string, callback: (args: any) => void) => {
    const walletProvider = getProvider(provider);
    if (!walletProvider) {
        throw new Error(`${provider} wallet provider not found`);
    }

    walletProvider.on(event, callback);
};

export const removeSolanaWalletListener = (provider: WalletProvider, event: string, callback: (args: any) => void) => {
    const walletProvider = getProvider(provider);
    if (!walletProvider) {
        throw new Error(`${provider} wallet provider not found`);
    }

    walletProvider.removeListener(event, callback);
}; 