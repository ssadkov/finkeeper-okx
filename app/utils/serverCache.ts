import fs from 'fs';
import path from 'path';

interface CacheData<T> {
    data: T;
    timestamp: number;
}

const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds

// File-based cache implementation for server-side
class FileCache {
    private cacheDir: string;

    constructor() {
        this.cacheDir = path.join(process.cwd(), '.cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    private getCachePath(key: string): string {
        return path.join(this.cacheDir, `${key}.json`);
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const cachePath = this.getCachePath(key);
            if (!fs.existsSync(cachePath)) {
                return null;
            }

            const fileContent = await fs.promises.readFile(cachePath, 'utf-8');
            const cacheData: CacheData<T> = JSON.parse(fileContent);

            if (Date.now() - cacheData.timestamp > CACHE_EXPIRATION) {
                await this.delete(key);
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    async set<T>(key: string, data: T): Promise<void> {
        try {
            const cachePath = this.getCachePath(key);
            const cacheData: CacheData<T> = {
                data,
                timestamp: Date.now(),
            };

            await fs.promises.writeFile(cachePath, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error writing to cache:', error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const cachePath = this.getCachePath(key);
            if (fs.existsSync(cachePath)) {
                await fs.promises.unlink(cachePath);
            }
        } catch (error) {
            console.error('Error deleting cache:', error);
        }
    }
}

// Export file cache instance
export const fileCache = new FileCache(); 