import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CacheData<T> {
    data: T;
    timestamp: number;
}

export class FileCache {
    private cacheDir: string;
    private defaultTTL: number;

    constructor(cacheDir: string = CACHE_DIR, defaultTTL: number = 5 * 60 * 1000) {
        this.cacheDir = cacheDir;
        this.defaultTTL = defaultTTL;
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

            // Check if cache is expired
            if (Date.now() - cacheData.timestamp > this.defaultTTL) {
                await this.delete(key);
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    async set<T>(key: string, data: T): Promise<void> {
        try {
            const cachePath = this.getCachePath(key);
            const cacheData: CacheData<T> = {
                data,
                timestamp: Date.now()
            };

            await fs.promises.writeFile(
                cachePath,
                JSON.stringify(cacheData, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const cachePath = this.getCachePath(key);
            if (fs.existsSync(cachePath)) {
                await fs.promises.unlink(cachePath);
            }
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
}

// Create a singleton instance
export const fileCache = new FileCache(); 