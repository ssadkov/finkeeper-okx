import { saveToLocalStorage, loadFromLocalStorage } from './storage';
import { fetchProducts } from './api';
import { enrichProductWithTokenInfo } from './storage';
import { 
    Product, 
    EnrichedProduct, 
    ProductStorageData, 
    AllProductsStorageData,
    UpdateProductsResult 
} from './types';

type NetworkType = 'ETH' | 'APTOS' | 'SOL' | 'SUI';

type StorageDataWithNullTimestamp = Omit<ProductStorageData, 'timestamp'> & { timestamp: string | null };
type AllStorageDataWithNullTimestamp = Omit<AllProductsStorageData, 'timestamp'> & { timestamp: string | null };

// Storage keys for each network
const STORAGE_KEYS = {
    ETH: 'defi_products_eth',
    APTOS: 'defi_products_aptos',
    SOL: 'defi_products_sol',
    SUI: 'defi_products_sui',
    ALL: 'defi_products_all'
} as const;

// Delay function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get current timestamp in ISO format without milliseconds
const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toISOString().split('.')[0] + 'Z';
};

export async function updateProducts(): Promise<UpdateProductsResult> {
    try {
        console.log('Starting products update process...');
        const timestamp = getCurrentTimestamp();
        
        // Fetch products for all networks
        console.log('Fetching products from API...');
        const networks = ['ETH', 'APTOS', 'SOL', 'SUI'] as const;
        const networkProducts: Record<string, EnrichedProduct[]> = {};
        const allProducts: EnrichedProduct[] = [];
        
        for (const network of networks) {
            const products = await fetchProducts(network);
            console.log(`Fetched ${products.length} products for ${network}`);
            
            // Enrich products with token information
            console.log(`Enriching ${network} products with token information...`);
            const enrichedProducts = await Promise.all(
                products.map(async (product) => {
                    // Проверяем наличие необходимых данных
                    if (!product.tokenAddr || !product.network) {
                        console.warn('Product missing required data:', {
                            id: product.investmentId,
                            name: product.investmentName,
                            tokenAddr: product.tokenAddr,
                            network: product.network
                        });
                        return product as EnrichedProduct;
                    }

                    // Логируем данные о токене перед обогащением
                    console.log(`Processing token: ${product.tokenAddr} on network: ${product.network}`);
                    
                    const enriched = await enrichProductWithTokenInfo(product);
                    
                    // Проверяем результат обогащения
                    if (!enriched.tokenId) {
                        console.warn('Token info not found:', {
                            tokenAddr: product.tokenAddr,
                            network: product.network
                        });
                    } else {
                        console.log(`Successfully enriched token ${product.tokenAddr} with ID ${enriched.tokenId}`);
                    }

                    return enriched as EnrichedProduct;
                })
            );
            
            // Подсчитываем статистику по обогащению
            const enrichedCount = enrichedProducts.filter(p => p.tokenId).length;
            console.log(`Enriched ${enrichedCount} out of ${products.length} products for ${network}`);
            
            networkProducts[network] = enrichedProducts;
            allProducts.push(...enrichedProducts);
            
            // Save network-specific data
            const networkData: ProductStorageData = {
                timestamp,
                network,
                products: enrichedProducts
            };
            await saveToLocalStorage(STORAGE_KEYS[network], networkData);
            
            // Add delay between requests
            if (network !== networks[networks.length - 1]) {
                await sleep(1000);
            }
        }
        
        // Save combined data
        const combinedData: AllProductsStorageData = {
            timestamp,
            networks: networkProducts,
            products: allProducts
        };
        
        await saveToLocalStorage(STORAGE_KEYS.ALL, combinedData);
        
        // Calculate statistics
        const networkCounts = allProducts.reduce((acc, product) => {
            const network = product.network;
            if (network) {
                acc[network] = (acc[network] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const result: UpdateProductsResult = {
            timestamp,
            totalCount: allProducts.length,
            networkCounts,
            enrichedCount: allProducts.filter(p => p.tokenId).length
        };
        
        console.log('Products updated successfully:', result);
        return result;

    } catch (error) {
        console.error('Error in updateProducts:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

export async function getProducts(network?: NetworkType): Promise<StorageDataWithNullTimestamp | AllStorageDataWithNullTimestamp> {
    try {
        if (network) {
            // Return data for specific network
            const data = await loadFromLocalStorage(STORAGE_KEYS[network]) as ProductStorageData | null;
            return data || { timestamp: null, products: [], network };
        } else {
            // Return all data
            const data = await loadFromLocalStorage(STORAGE_KEYS.ALL) as AllProductsStorageData | null;
            return data || { timestamp: null, networks: {}, products: [] };
        }
    } catch (error) {
        console.error('Error getting products:', error);
        return network 
            ? { timestamp: null, products: [], network }
            : { timestamp: null, networks: {}, products: [] };
    }
} 