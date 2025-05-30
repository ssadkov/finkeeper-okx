export function getTokenIconUrl(tokenSymbol: string): string {
    const baseUrl = 'https://finkeeper.pro/images/cryptologo';
    const defaultIcon = `${baseUrl}/default_coin.webp`;
    
    if (!tokenSymbol) {
        return defaultIcon;
    }

    // Преобразуем символ токена в нижний регистр для URL
    const tokenLower = tokenSymbol.toLowerCase().trim();
    return `${baseUrl}/${tokenLower}.webp`;
}

// Кэш для уже проверенных URL иконок
const iconUrlCache: Record<string, string> = {};

export async function getCachedTokenIconUrl(tokenSymbol: string): Promise<string> {
    // Очищаем символ токена от возможных спецсимволов и пробелов
    const cleanSymbol = tokenSymbol.trim();
    
    if (iconUrlCache[cleanSymbol]) {
        return iconUrlCache[cleanSymbol];
    }

    const iconUrl = await getTokenIconUrl(cleanSymbol);
    iconUrlCache[cleanSymbol] = iconUrl;
    return iconUrl;
} 