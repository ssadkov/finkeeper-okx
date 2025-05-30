import { Product, ProductsResponse } from './types';
import { getOkxHeaders } from './okx';

interface ProductsRequestParams {
    simplifyInvestType: string;
    network: string;
    offset: string;
    sort: {
        orders: {
            direction: 'ASC' | 'DESC';
            property: string;
        }[];
    };
}

const FETCH_TIMEOUT = 10000; // 10 секунд таймаут
const PRODUCTS_LIMIT = 10; // Количество продуктов на странице
const DELAY_BETWEEN_REQUESTS = 1000; // Задержка между запросами в мс

async function fetchProductsPage(network: string, offset: number): Promise<ProductsResponse> {
    const requestPath = '/api/v5/defi/explore/product/list';
    const method = 'POST';
    
    const requestBody = {
        simplifyInvestType: '101',
        network,
        offset: offset.toString(),
        limit: PRODUCTS_LIMIT.toString(),
        sort: {
            orders: [{
                direction: 'DESC',
                property: 'RATE'
            }]
        }
    };

    const bodyStr = JSON.stringify(requestBody);
    const headers = getOkxHeaders(method, requestPath, bodyStr);

    console.log(`Fetching products page for ${network}, offset: ${offset}`, {
        url: `https://web3.okx.com${requestPath}`,
        method,
        body: requestBody
    });

    const response = await fetch(`https://web3.okx.com${requestPath}`, {
        method,
        headers,
        body: bodyStr
    });

    const responseText = await response.text();
    
    if (!response.ok) {
        console.error(`API error for ${network}:`, {
            status: response.status,
            statusText: response.statusText,
            response: responseText
        });
        throw new Error(`OKX API error! status: ${response.status}, details: ${responseText}`);
    }

    let data: ProductsResponse;
    try {
        data = JSON.parse(responseText);
        console.log(`Response data for ${network}, offset ${offset}:`, {
            code: data.code,
            msg: data.msg,
            productsCount: data.data?.investments?.length || 0,
            totalAvailable: data.data?.total || 'N/A'
        });
    } catch (e) {
        console.error('Failed to parse response JSON:', responseText);
        throw e;
    }

    return data;
}

async function fetchAllProductsForNetwork(network: string): Promise<Product[]> {
    console.log(`\n=== Starting to fetch all products for network ${network} ===`);
    
    // Получаем первую страницу и общее количество продуктов
    const firstPage = await fetchProductsPage(network, 0);
    const total = Number(firstPage.data?.total || 0);
    
    console.log(`Total products available for ${network}: ${total}`);
    
    // Обрабатываем первую страницу
    let allProducts: Product[] = [];
    if (firstPage.data?.investments) {
        allProducts = firstPage.data.investments.map(product => ({
            ...product,
            tokenAddr: product.underlyingToken?.[0]?.tokenAddress || '',
            network
        }));
    }

    if (total === 0) {
        console.log(`No products found for ${network}`);
        return allProducts;
    }

    // Вычисляем количество оставшихся страниц
    const remainingPages = Math.max(0, Math.ceil((total - PRODUCTS_LIMIT) / PRODUCTS_LIMIT));
    
    console.log(`Need to fetch ${remainingPages} more pages for ${network}`);
    
    // Получаем остальные страницы
    for (let page = 1; page <= remainingPages; page++) {
        const offset = page * PRODUCTS_LIMIT;
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        
        try {
            const pageData = await fetchProductsPage(network, offset);
            
            if (pageData.data?.investments) {
                const pageProducts = pageData.data.investments.map(product => ({
                    ...product,
                    tokenAddr: product.underlyingToken?.[0]?.tokenAddress || '',
                    network
                }));
                allProducts.push(...pageProducts);
            }
            
            console.log(`Fetched page ${page}/${remainingPages} for ${network}, total products so far: ${allProducts.length}`);
        } catch (error) {
            console.error(`Error fetching page ${page} for ${network}:`, error);
            // Продолжаем со следующей страницей в случае ошибки
        }
    }

    console.log(`=== Completed fetching all products for ${network}. Total products: ${allProducts.length} ===\n`);
    return allProducts;
}

export async function fetchProducts(network: string): Promise<Product[]> {
    try {
        return await fetchAllProductsForNetwork(network);
    } catch (error) {
        console.error(`Error fetching all products for ${network}:`, error);
        return [];
    }
} 