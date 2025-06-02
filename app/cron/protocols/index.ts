import { fetchProtocolList } from './api';
import { ProtocolData } from './types';
import pool from '@/app/config/database';

// Функция для сохранения одного протокола
async function saveProtocolToDatabase(client: any, protocol: ProtocolData) {
    const query = `
        INSERT INTO protocols_list (
            platform_id,
            platform_name,
            logo,
            network,
            platform_website,
            platform_min_infos
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (platform_id) 
        DO UPDATE SET
            platform_name = EXCLUDED.platform_name,
            logo = EXCLUDED.logo,
            network = EXCLUDED.network,
            platform_website = EXCLUDED.platform_website,
            platform_min_infos = EXCLUDED.platform_min_infos,
            updated_at = NOW()
        RETURNING *
    `;

    const values = [
        protocol.platformId,
        protocol.platformName,
        protocol.logo,
        protocol.network,
        protocol.platformWebSite,
        JSON.stringify(protocol.platformMinInfos)
    ];

    return client.query(query, values);
}

export async function updateProtocolList() {
    const client = await pool.connect();
    
    try {
        console.log('Starting protocol list update process...');
        const timestamp = new Date().toISOString();
        
        // Fetch protocols list
        console.log('Fetching protocol list from API...');
        const protocols = await fetchProtocolList();
        console.log(`Received ${protocols.length} protocols from API`);
        
        if (protocols.length === 0) {
            throw new Error('No protocols received from API');
        }

        // Модифицированная логика фильтрации
        const validProtocols = protocols.filter(protocol => {
            // Проверяем обязательные поля
            const hasRequiredFields = protocol && 
                typeof protocol === 'object' &&
                'platformId' in protocol &&
                'platformName' in protocol &&
                'logo' in protocol &&
                'network' in protocol &&
                'platformWebSite' in protocol &&
                'platformMinInfos' in protocol;

            if (!hasRequiredFields) {
                console.log('Protocol missing required fields:', protocol);
                return false;
            }

            // Проверяем platformMinInfos
            const platformMinInfos = protocol.platformMinInfos || [];
            const isValidPlatformMinInfos = Array.isArray(platformMinInfos) && platformMinInfos.length > 0;

            if (!isValidPlatformMinInfos) {
                console.log('Invalid platformMinInfos for protocol:', protocol.platformName);
                return false;
            }

            // Проверяем каждый platformMinInfo на наличие обязательных полей
            const hasValidInfo = platformMinInfos.every(info => 
                info &&
                typeof info === 'object' &&
                'investmentId' in info &&
                'protocolId' in info &&
                'network' in info &&
                'chainId' in info
            );

            if (!hasValidInfo) {
                console.log('Invalid platform info found for protocol:', protocol.platformName);
                return false;
            }

            return true;
        });
        
        console.log(`Filtered ${validProtocols.length} valid protocols out of ${protocols.length} total protocols`);
        
        let savedProtocols = 0;
        let updatedProtocols = 0;
        let failedProtocols = 0;

        // Обрабатываем каждый протокол
        for (const protocol of validProtocols) {
            try {
                const result = await saveProtocolToDatabase(client, protocol);
                
                if (result.rowCount > 0) {
                    if (result.rows[0].created_at === result.rows[0].updated_at) {
                        savedProtocols++;
                    } else {
                        updatedProtocols++;
                    }
                }

                // Добавляем небольшую задержку между запросами
                await new Promise(resolve => setTimeout(resolve, 10));

            } catch (error) {
                console.error('Error processing protocol:', {
                    platformName: protocol.platformName,
                    error
                });
                failedProtocols++;
            }

            // Логируем прогресс каждые 10 протоколов
            if ((savedProtocols + updatedProtocols + failedProtocols) % 10 === 0) {
                console.log(`Progress: saved=${savedProtocols}, updated=${updatedProtocols}, failed=${failedProtocols}`);
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
                FROM protocols_list 
                GROUP BY network
            ) as network_stats
        `);

        const result = {
            timestamp,
            totalCount: parseInt(stats.total_count),
            networkCount: parseInt(stats.network_count),
            networkCounts: stats.network_counts,
            savedProtocols,
            updatedProtocols,
            failedProtocols,
            invalidProtocols: protocols.length - validProtocols.length
        };

        console.log('Protocol list updated successfully:', result);
        return result;

    } catch (error) {
        console.error('Error in updateProtocolList:', error);
        throw error;
    } finally {
        client.release();
    }
} 