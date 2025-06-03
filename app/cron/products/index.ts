import { fetchProducts } from './api';
import { enrichProductWithTokenInfo } from './storage';
import { 
    Product, 
    EnrichedProduct, 
    UpdateProductsResult 
} from './types';
import pool from '@/app/config/database';

type NetworkType = 'ETH' | 'APTOS' | 'SOL' | 'SUI';

// Delay function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get current timestamp in ISO format without milliseconds
const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toISOString().split('.')[0] + 'Z';
};

// Функция для сохранения одного продукта в БД
async function saveProductToDatabase(client: any, product: EnrichedProduct) {
    try {
        // Проверяем обязательные поля
        if (!product.investmentId) {
            console.warn('Missing investment_id, skipping product');
            return null;
        }

        // Для отладки: логируем входящие данные
        console.log('Checking token with params:', {
            tokenAddr: product.tokenAddr,
            network: product.network
        });

        // Проверяем существование токена
        const checkTokenQuery = `
            SELECT token_id, token_symbol, token_decimal::text
            FROM token_lists 
            WHERE token_address = $1
            LIMIT 1
        `;
        
        // Используем полный адрес токена для SUI и APTOS
        const tokenAddress = ['SUI', 'APTOS'].includes(product.network || '') 
            ? product.tokenAddr 
            : product.tokenAddr?.toLowerCase() || '';
        
        // Для отладки: логируем SQL запрос и параметры
        console.log('Token search query:', {
            query: checkTokenQuery,
            params: [tokenAddress]
        });

        const tokenResult = await client.query(checkTokenQuery, [tokenAddress]);

        if (tokenResult.rows.length === 0) {
            console.warn(`Token not found in token_lists, full details:`, {
                searchedAddress: tokenAddress,
                originalAddress: product.tokenAddr
            });
            return null;
        }

        const tokenData = tokenResult.rows[0];

        // Для отладки: логируем найденные данные токена
        console.log('Found token data:', tokenData);

        // Проверяем существование протокола
        const checkProtocolQuery = `
            SELECT platform_id, platform_name, logo, platform_website
            FROM protocols_list 
            WHERE platform_id = $1
            LIMIT 1
        `;

        // Для отладки: логируем поиск протокола
        console.log('Searching for protocol:', {
            platformId: product.platformId
        });

        const protocolResult = await client.query(checkProtocolQuery, [product.platformId]);
        
        // Для отладки: логируем результат поиска протокола
        console.log('Protocol search result:', {
            found: protocolResult.rows.length > 0,
            platformId: product.platformId,
            data: protocolResult.rows[0]
        });

        const protocolData = protocolResult.rows[0] || {};

        // Используем UPSERT с указанием token_id
        const query = `
            INSERT INTO products_list (
                investment_id,
                investment_name,
                chain_id,
                network,
                rate,
                invest_type,
                platform_name,
                platform_id,
                platform_url,
                platform_logo,
                pool_version,
                rate_type,
                tvl,
                token_address,
                token_symbol,
                token_id,
                token_logo,
                token_decimal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (investment_id) DO UPDATE SET
                investment_name = EXCLUDED.investment_name,
                chain_id = EXCLUDED.chain_id,
                network = EXCLUDED.network,
                rate = EXCLUDED.rate,
                invest_type = EXCLUDED.invest_type,
                platform_name = EXCLUDED.platform_name,
                platform_id = EXCLUDED.platform_id,
                platform_url = EXCLUDED.platform_url,
                platform_logo = EXCLUDED.platform_logo,
                pool_version = EXCLUDED.pool_version,
                rate_type = EXCLUDED.rate_type,
                tvl = EXCLUDED.tvl,
                token_address = EXCLUDED.token_address,
                token_symbol = EXCLUDED.token_symbol,
                token_id = EXCLUDED.token_id,
                token_logo = EXCLUDED.token_logo,
                token_decimal = EXCLUDED.token_decimal,
                updated_at = NOW()
            RETURNING *, 
                xmax = 0 as is_inserted
        `;
        
        const values = [
            product.investmentId,
            product.investmentName || '',
            product.chainId || '',
            product.network || '',
            product.rate ? parseFloat(product.rate) : null,
            product.investType || '',
            protocolData.platform_name || product.platformName || '',
            product.platformId || null,
            protocolData.platform_website || product.platformUrl || '',
            protocolData.logo || product.protocolLogo || null,
            product.poolVersion || '',
            product.rateType || '',
            product.tvl ? parseFloat(product.tvl) : null,
            tokenAddress,
            tokenData.token_symbol,
            tokenData.token_id,
            product.logoUrl || null,
            tokenData.token_decimal
        ];

        // Логируем запрос для отладки
        console.log('Saving product to database:', {
            investmentId: product.investmentId,
            network: product.network,
            platformId: product.platformId,
            tokenId: tokenData.token_id,
            tokenSymbol: tokenData.token_symbol
        });

        return await client.query(query, values);
    } catch (error) {
        console.error('Error in saveProductToDatabase:', {
            error,
            investmentId: product.investmentId,
            network: product.network
        });
        throw error;
    }
}

export async function updateProducts(): Promise<UpdateProductsResult> {
    const client = await pool.connect();
    
    try {
        console.log('Starting products update process...');
        const timestamp = getCurrentTimestamp();
        
        // Fetch products for all networks
        console.log('Fetching products from API...');
        const networks = ['ETH', 'APTOS', 'SOL', 'SUI'] as const;
        let totalSaved = 0;
        let totalUpdated = 0;
        let totalFailed = 0;
        let enrichedCount = 0;
        const networkCounts: Record<string, number> = {};
        
        for (const network of networks) {
            const products = await fetchProducts(network);
            console.log(`Fetched ${products.length} products for ${network}`);
            networkCounts[network] = products.length;
            
            // Enrich products with token information
            console.log(`Enriching ${network} products with token information...`);
            for (const product of products) {
                try {
                    if (!product.tokenAddr || !product.network) {
                        console.warn('Product missing required data:', {
                            id: product.investmentId,
                            name: product.investmentName,
                            tokenAddr: product.tokenAddr,
                            network: product.network
                        });
                        continue;
                    }
                    
                    const enriched = await enrichProductWithTokenInfo(product);
                    
                    if (enriched.tokenId) {
                        enrichedCount++;
                    }

                    // Сохраняем в БД и проверяем результат
                    const result = await saveProductToDatabase(client, enriched);
                    
                    // Проверяем что результат не null прежде чем обращаться к его свойствам
                    if (result && result.rowCount > 0) {
                        if (result.rows[0].created_at === result.rows[0].updated_at) {
                            totalSaved++;
                    } else {
                            totalUpdated++;
                    }
                    }

                    await sleep(10);

                } catch (error) {
                    console.error('Error processing product:', {
                        productId: product.investmentId,
                        error
                    });
                    totalFailed++;
                }

                // Логируем прогресс каждые 10 продуктов
                if ((totalSaved + totalUpdated + totalFailed) % 10 === 0) {
                    console.log(`Progress: saved=${totalSaved}, updated=${totalUpdated}, failed=${totalFailed}`);
                }
            }
            
            // Add delay between networks
            if (network !== networks[networks.length - 1]) {
                await sleep(1000);
            }
        }

        const result: UpdateProductsResult = {
            timestamp,
            totalCount: totalSaved + totalUpdated,
            networkCounts,
            enrichedCount,
            savedProducts: totalSaved,
            updatedProducts: totalUpdated,
            failedProducts: totalFailed
        };
        
        console.log('Products updated successfully:', result);
        return result;

    } catch (error) {
        console.error('Error in updateProducts:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function getProducts(network?: NetworkType) {
    const client = await pool.connect();
    try {
        let query = `
            SELECT *
            FROM products_list
        `;
        
        const params: string[] = [];
        if (network) {
            query += ' WHERE network = $1';
            params.push(network);
        }

        query += ' ORDER BY rate DESC';
        
        const { rows } = await client.query(query, params);
        
        return {
            timestamp: new Date().toISOString(),
            networks: network ? { [network]: rows } : rows.reduce((acc, product) => {
                const network = product.network;
                if (!acc[network]) acc[network] = [];
                acc[network].push(product);
                return acc;
            }, {} as Record<string, any[]>)
        };
    } finally {
        client.release();
    }
} 