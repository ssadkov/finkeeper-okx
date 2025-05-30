import { saveToLocalStorage } from '../products/storage';
import { fetchProtocolList } from './api';
import { ProtocolData } from './types';

// Storage key for protocols data
const STORAGE_KEY = 'protocols_list';

// Get current timestamp in ISO format without milliseconds
const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toISOString().split('.')[0] + 'Z';
};

export async function updateProtocolList() {
    try {
        console.log('Starting protocol list update process...');
        const timestamp = getCurrentTimestamp();
        
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
        
        if (validProtocols.length > 0) {
            console.log('Sample valid protocol:', {
                name: validProtocols[0].platformName,
                network: validProtocols[0].network,
                minInfosCount: validProtocols[0].platformMinInfos.length
            });
        }
        
        // Save data with timestamp
        const protocolData = {
            timestamp,
            protocols: validProtocols
        };
        
        // Save to storage
        console.log('Saving protocol data to storage...');
        await saveToLocalStorage(STORAGE_KEY, protocolData);
        
        // Calculate statistics
        const networkCounts = validProtocols.reduce((acc, protocol) => {
            const network = protocol.network;
            acc[network] = (acc[network] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const result = {
            timestamp,
            totalCount: validProtocols.length,
            networkCounts,
            invalidProtocols: protocols.length - validProtocols.length
        };

        console.log('Protocol list updated successfully:', result);

        return result;
    } catch (error) {
        console.error('Error in updateProtocolList:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
} 