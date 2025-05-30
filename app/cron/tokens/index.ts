import { saveToLocalStorage } from '../products/storage';
import { fetchTokenList } from './api';
import { TokenData } from './types';

// Ключ для хранения данных
const STORAGE_KEY = 'token_lists';

// Функция для получения текущей даты в формате ISO без миллисекунд
const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toISOString().split('.')[0] + 'Z';
};

export async function updateTokenList() {
    try {
        console.log('Starting token list update process...');
        const timestamp = getCurrentTimestamp();
        
        // Получаем список токенов
        console.log('Fetching token list from API...');
        const tokens = await fetchTokenList();
        console.log(`Received ${tokens.length} tokens from API`);
        
        if (tokens.length === 0) {
            throw new Error('No tokens received from API');
        }

        // Фильтруем токены с пустыми tokenInfos
        const validTokens = tokens.filter(token => 
            token.tokenInfos && 
            Array.isArray(token.tokenInfos) && 
            token.tokenInfos.length > 0
        );
        
        console.log(`Filtered ${validTokens.length} valid tokens out of ${tokens.length} total tokens`);
        
        // Сохраняем данные с временной меткой
        const tokenData = {
            timestamp,
            tokens: validTokens
        };
        
        // Сохраняем в файл
        console.log('Saving token data to storage...');
        await saveToLocalStorage(STORAGE_KEY, tokenData);
        
        // Подсчитываем статистику
        const networkCounts = validTokens.reduce((acc, token) => {
            if (token.tokenInfos) {
                token.tokenInfos.forEach(info => {
                    if (info && info.network) {
                        acc[info.network] = (acc[info.network] || 0) + 1;
                    }
                });
            }
            return acc;
        }, {} as Record<string, number>);

        const result = {
            timestamp,
            totalCount: validTokens.length,
            networkCounts,
            invalidTokens: tokens.length - validTokens.length
        };

        console.log('Token list updated successfully:', result);

        return result;
    } catch (error) {
        console.error('Error in updateTokenList:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
} 