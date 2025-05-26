interface CacheData<T> {
    data: T;
    timestamp: number;
}

const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Local storage cache implementation for client-side
export function getCachedData<T>(key: string): T | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp }: CacheData<T> = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp > CACHE_EXPIRATION) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

export function setCachedData<T>(key: string, data: T): void {
    try {
        const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
} 