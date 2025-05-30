import fs from 'fs/promises';
import path from 'path';
import { TokenInfo } from '../tokens/types';
import { ProtocolData } from '../protocols/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Убедимся, что директория существует
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function loadFromLocalStorage(key: string) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${key}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

export async function saveToLocalStorage(key: string, data: any) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

interface TokenStorageData {
    timestamp: string;
    tokens: {
        symbol: string;
        tokenInfos: TokenInfo[];
    }[];
}

// Функция для нормализации адреса токена
function normalizeTokenAddress(address: string): string {
    if (!address) return '';
    
    // Убираем окончания вида ::token::TOKEN для SUI
    const suiFormat = address.split('::')[0];
    
    // Приводим к нижнему регистру
    return (suiFormat || address).toLowerCase();
}

// Функция для получения информации о токене по адресу
export async function getTokenInfo(tokenAddress: string, network: string): Promise<{
    tokenId: string;
    logoUrl: string;
    tokenDecimal: string;
} | null> {
    try {
        if (!tokenAddress) {
            console.warn('Missing tokenAddress parameter');
            return null;
        }

        const tokenData = await loadFromLocalStorage('token_lists') as TokenStorageData | null;
        if (!tokenData?.tokens) {
            console.warn('No token data found in storage');
            return null;
        }

        console.log(`Searching for token: ${tokenAddress}`);
        console.log(`Total tokens in storage: ${tokenData.tokens.length}`);

        // Нормализуем искомый адрес
        const normalizedSearchAddress = normalizeTokenAddress(tokenAddress);
        console.log(`Normalized search address: ${normalizedSearchAddress}`);

        // Ищем токен с совпадающим адресом
        for (const token of tokenData.tokens) {
            // Проверяем наличие tokenInfos и что это массив
            if (!token?.tokenInfos || !Array.isArray(token.tokenInfos)) {
                console.warn('Invalid token data structure:', token);
                continue;
            }

            // Фильтруем невалидные элементы
            const validTokenInfos = token.tokenInfos.filter(info => 
                info && typeof info === 'object' && 'tokenAddress' in info && info.tokenAddress
            );

            const tokenInfo = validTokenInfos.find(info => {
                // Нормализуем адрес из хранилища для сравнения
                const normalizedStoredAddress = normalizeTokenAddress(info.tokenAddress);
                const isMatch = normalizedStoredAddress === normalizedSearchAddress;
                
                if (isMatch) {
                    console.log(`Found match:`, {
                        original: info.tokenAddress,
                        normalized: normalizedStoredAddress,
                        searchFor: normalizedSearchAddress
                    });
                }
                
                return isMatch;
            });

            if (tokenInfo) {
                console.log(`Found token info:`, {
                    symbol: token.symbol,
                    tokenId: tokenInfo.tokenId,
                    network: tokenInfo.network,
                    originalAddress: tokenInfo.tokenAddress,
                    searchAddress: tokenAddress
                });

                // Проверяем наличие всех необходимых полей
                if (!tokenInfo.tokenId || !tokenInfo.logoUrl || !tokenInfo.tokenDecimal) {
                    console.warn('Found token info is incomplete:', tokenInfo);
                    continue;
                }

                return {
                    tokenId: tokenInfo.tokenId,
                    logoUrl: tokenInfo.logoUrl,
                    tokenDecimal: tokenInfo.tokenDecimal
                };
            }
        }

        console.warn(`Token not found: ${tokenAddress} (normalized: ${normalizedSearchAddress})`);
        return null;
    } catch (error) {
        console.error('Error getting token info:', error);
        return null;
    }
}

// Функция для получения информации о протоколе по platformId
export async function getProtocolInfo(platformId: number): Promise<{
    logo: string;
    platformWebSite: string;
} | null> {
    try {
        if (!platformId) {
            console.warn('Missing platformId parameter');
            return null;
        }

        const protocolData = await loadFromLocalStorage('protocols_list') as { protocols: ProtocolData[] } | null;
        if (!protocolData?.protocols) {
            console.warn('No protocol data found in storage');
            return null;
        }

        console.log(`Searching for protocol with platformId: ${platformId}`);
        console.log(`Total protocols in storage: ${protocolData.protocols.length}`);

        // Выводим первые несколько протоколов для проверки структуры
        console.log('Sample protocols from storage:', 
            protocolData.protocols.slice(0, 3).map(p => ({
                platformId: p.platformId,
                platformName: p.platformName
            }))
        );

        // Ищем протокол с совпадающим platformId
        const protocol = protocolData.protocols.find(p => p.platformId === platformId);

        if (protocol) {
            console.log(`Found protocol info:`, {
                platformId: protocol.platformId,
                platformName: protocol.platformName,
                hasLogo: !!protocol.logo,
                hasWebsite: !!protocol.platformWebSite
            });

            return {
                logo: protocol.logo,
                platformWebSite: protocol.platformWebSite
            };
        }

        console.warn(`Protocol not found: platformId ${platformId}`);
        return null;
    } catch (error) {
        console.error('Error getting protocol info:', error);
        return null;
    }
}

// Функция для обогащения продукта информацией о токене и протоколе
export async function enrichProductWithTokenInfo<T extends { tokenAddr: string; network: string; platformId?: string | number; investmentName?: string }>(product: T): Promise<T & Partial<{
    tokenId: string;
    logoUrl: string;
    tokenDecimal: string;
    protocolLogo: string;
    platformWebSite: string;
}>> {
    try {
        let enrichedProduct = { ...product };

        // Обогащаем информацией о токене
        if (product.tokenAddr) {
            const tokenInfo = await getTokenInfo(product.tokenAddr, product.network);
            if (tokenInfo) {
                console.log(`Enriched product with token info:`, {
                    tokenAddr: product.tokenAddr,
                    tokenId: tokenInfo.tokenId
                });
                enrichedProduct = {
                    ...enrichedProduct,
                    ...tokenInfo
                };
            } else {
                console.warn(`No token info found for enrichment:`, {
                    tokenAddr: product.tokenAddr
                });
            }
        } else {
            console.warn('Product missing tokenAddr for enrichment');
        }

        // Обогащаем информацией о протоколе
        if (product.platformId) {
            // Преобразуем platformId в число
            const platformIdNumber = typeof product.platformId === 'string' 
                ? parseInt(product.platformId, 10) 
                : product.platformId;

            console.log('Processing protocol info:', {
                originalPlatformId: product.platformId,
                convertedPlatformId: platformIdNumber,
                productName: product.investmentName || 'Unknown'
            });

            const protocolInfo = await getProtocolInfo(platformIdNumber);
            if (protocolInfo) {
                console.log(`Enriched product with protocol info:`, {
                    platformId: platformIdNumber,
                    hasLogo: !!protocolInfo.logo,
                    hasWebsite: !!protocolInfo.platformWebSite
                });
                enrichedProduct = {
                    ...enrichedProduct,
                    protocolLogo: protocolInfo.logo,
                    platformWebSite: protocolInfo.platformWebSite
                };
            } else {
                console.warn(`No protocol info found for enrichment:`, {
                    platformId: platformIdNumber
                });
            }
        }

        return enrichedProduct;
    } catch (error) {
        console.error('Error enriching product:', {
            error,
            product: {
                tokenAddr: product.tokenAddr,
                network: product.network,
                platformId: product.platformId
            }
        });
        return product;
    }
} 