export const OKX_CONFIG = {
    // API credentials
    API_KEY: process.env.NEXT_PUBLIC_OKX_API_KEY || '',
    SECRET_KEY: process.env.NEXT_PUBLIC_OKX_SECRET_KEY || '',
    PASSPHRASE: process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
    
    // API endpoints
    BASE_URL: 'https://web3.okx.com',
    API_VERSION: 'v5',
    
    // Endpoints
    ENDPOINTS: {
        DEFI_PRODUCTS: '/api/v5/defi/explore/product/list'
    }
} as const;

// Типы для конфигурации
export type OkxConfig = typeof OKX_CONFIG;

// Проверка наличия необходимых переменных окружения
export const validateConfig = () => {
    const requiredEnvVars = [
        'NEXT_PUBLIC_OKX_API_KEY',
        'NEXT_PUBLIC_OKX_SECRET_KEY',
        'NEXT_PUBLIC_OKX_PASSPHRASE',
        'NEXT_PUBLIC_OKX_PROJECT_ID'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}; 