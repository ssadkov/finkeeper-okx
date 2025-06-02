import { fetchTokenList } from './api';
import { TokenData, TokenInfo } from './types';
import pool from '@/app/config/database';

// Функция для сохранения одного токена
async function saveTokenToDatabase(client: any, tokenInfo: TokenInfo | null) {
    if (!tokenInfo) {
        console.warn('Skipping null tokenInfo');
        return null;
    }

    const query = `
        INSERT INTO token_lists (
            token_id,
            token_symbol,
            network,
            logo_url,
            token_address,
            token_decimal
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (token_id) 
        DO UPDATE SET
            token_symbol = EXCLUDED.token_symbol,
            network = EXCLUDED.network,
            logo_url = EXCLUDED.logo_url,
            token_address = EXCLUDED.token_address,
            token_decimal = EXCLUDED.token_decimal,
            updated_at = NOW()
        RETURNING *
    `;

    const values = [
        tokenInfo.tokenId,
        tokenInfo.tokenSymbol,
        tokenInfo.network,
        tokenInfo.logoUrl,
        tokenInfo.tokenAddress,
        tokenInfo.tokenDecimal
    ];

    return client.query(query, values);
}

export async function updateTokenList() {
    const client = await pool.connect();
    
    try {
        console.log('Starting token list update process...');
        const timestamp = new Date().toISOString();
        
        // Получаем список токенов
        console.log('Fetching token list from API...');
        const tokens = await fetchTokenList();
        console.log(`Received ${tokens.length} tokens from API`);
        
        if (tokens.length === 0) {
            throw new Error('No tokens received from API');
        }

        // Фильтруем токены с пустыми tokenInfos и невалидными данными
        const validTokens = tokens.filter(token => 
            token.tokenInfos && 
            Array.isArray(token.tokenInfos) && 
            token.tokenInfos.length > 0 &&
            token.tokenInfos.some(info => info && info.tokenId) // Добавляем проверку на наличие tokenId
        );
        
        console.log(`Filtered ${validTokens.length} valid tokens out of ${tokens.length} total tokens`);
        
        let savedTokens = 0;
        let updatedTokens = 0;
        let failedTokens = 0;

        // Обрабатываем каждый токен отдельно
        for (const token of validTokens) {
            for (const tokenInfo of token.tokenInfos) {
                try {
                    // Пропускаем null или невалидные tokenInfo
                    if (!tokenInfo || !tokenInfo.tokenId) {
                        console.warn(`Skipping invalid tokenInfo for symbol: ${token.symbol}`);
                        continue;
                    }

                    const result = await saveTokenToDatabase(client, tokenInfo);
                    
                    if (result && result.rowCount > 0) {
                        if (result.rows[0].created_at === result.rows[0].updated_at) {
                            savedTokens++;
                        } else {
                            updatedTokens++;
                        }
                    }

                    // Добавляем небольшую задержку между запросами
                    await new Promise(resolve => setTimeout(resolve, 10));

                } catch (error) {
                    console.error('Error processing token:', {
                        tokenSymbol: token.symbol,
                        tokenInfo,
                        error
                    });
                    failedTokens++;
                }
            }

            // Логируем прогресс каждые 100 токенов
            if ((savedTokens + updatedTokens + failedTokens) % 100 === 0) {
                console.log(`Progress: saved=${savedTokens}, updated=${updatedTokens}, failed=${failedTokens}`);
            }
        }

        // Получаем итоговую статистику
        const { rows: [stats] } = await client.query(`
            SELECT 
                COUNT(*) as total_count,
                COUNT(DISTINCT network) as network_count,
                json_object_agg(network, count) as network_counts
            FROM (
                SELECT network, COUNT(*) as count 
                FROM token_lists 
                GROUP BY network
            ) as network_stats
        `);

        const result = {
            timestamp,
            totalCount: parseInt(stats.total_count),
            networkCount: parseInt(stats.network_count),
            networkCounts: stats.network_counts,
            savedTokens,
            updatedTokens,
            failedTokens,
            invalidTokens: tokens.length - validTokens.length
        };

        console.log('Token list updated successfully:', result);
        return result;

    } catch (error) {
        console.error('Error in updateTokenList:', error);
        throw error;
    } finally {
        client.release();
    }
} 