interface CacheData<T> {
    data: T;
    timestamp: number;
}

const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Local storage cache implementation for client-side
export const getCachedData = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    try {
        const cachedData = localStorage.getItem(key);
        if (!cachedData) return null;

        const { data, timestamp } = JSON.parse(cachedData) as CacheData<T>;
        if (Date.now() - timestamp > CACHE_EXPIRATION) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
};

export const setCachedData = <T>(key: string, data: T): void => {
    if (typeof window === 'undefined') return;
    
    try {
        const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error writing to localStorage:', error);
    }
}; 