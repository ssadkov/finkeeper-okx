import fs from 'fs/promises';
import path from 'path';
import { TokenInfo } from '../tokens/types';
import { ProtocolData } from '../protocols/types';
import pool from '@/app/config/database';

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

        // Для SUI и APTOS используем полный адрес
        const searchAddress = ['SUI', 'APTOS'].includes(network)
            ? tokenAddress
            : tokenAddress.toLowerCase();

        console.log(`Searching for token: ${searchAddress}`);

        const query = `
            SELECT token_id, logo_url, token_decimal::text
            FROM token_lists
            WHERE token_address = $1
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [searchAddress]);
                
        if (rows.length === 0) {
            console.warn(`Token not found: ${tokenAddress}`);
            return null;
        }

        const tokenInfo = rows[0];
        console.log(`Found token info:`, {
            tokenId: tokenInfo.token_id,
            tokenAddress: tokenAddress
        });

        return {
            tokenId: tokenInfo.token_id,
            logoUrl: tokenInfo.logo_url,
            tokenDecimal: tokenInfo.token_decimal
        };
    } catch (error) {
        console.error('Error getting token info from database:', error);
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

        const query = `
            SELECT platform_id, platform_name, logo, platform_website
            FROM protocols_list
            WHERE platform_id = $1
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [platformId]);

        if (rows.length === 0) {
            console.warn(`Protocol not found: platformId ${platformId}`);
            return null;
        }

        const protocol = rows[0];
        console.log(`Found protocol info:`, {
            platformId: protocol.platform_id,
            platformName: protocol.platform_name,
            hasLogo: !!protocol.logo,
            hasWebsite: !!protocol.platform_website
        });

        return {
            logo: protocol.logo,
            platformWebSite: protocol.platform_website
        };
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