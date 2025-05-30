import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface InvestmentIdea {
    networks: string;
    tokenSymbol: string;
    platformName: string;
    rate: string | number;
    tvl: number;
    tokenAddress: string;
    logoUrl: string;
    name?: string;
    protocolLogo?: string;
    platformWebSite?: string;
}

interface NetworkProducts {
    [network: string]: any[];
}

export async function GET() {
    try {
        // Путь к директории с данными
        const dataDirectory = path.join(process.cwd(), 'data');
        
        // Читаем все файлы из директории data
        const files = await fs.readdir(dataDirectory);
        
        // Ищем файл с общими данными
        const allProductsFile = files.find(file => file === 'defi_products_all.json');
        if (!allProductsFile) {
            throw new Error('Products data file not found');
        }

        // Читаем данные из файла
        const filePath = path.join(dataDirectory, allProductsFile);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        let allIdeas: InvestmentIdea[] = [];

        // Обрабатываем данные из всех сетей
        if (data.networks) {
            const networks = data.networks as NetworkProducts;
            Object.entries(networks).forEach(([network, products]) => {
                products.forEach(product => {
                    // Получаем данные из первого элемента массива underlyingToken
                    const underlyingToken = product.underlyingToken && product.underlyingToken[0] ? product.underlyingToken[0] : {};
                    
                    allIdeas.push({
                        networks: network,
                        tokenSymbol: underlyingToken.tokenSymbol || product.tokenSymbol || '',
                        platformName: product.platformName || 'Unknown',
                        rate: product.rate || 0,
                        tvl: parseFloat(product.tvl) || 0,
                        tokenAddress: underlyingToken.tokenAddress || product.tokenAddr || '',
                        logoUrl: product.logoUrl || '',
                        name: product.name || underlyingToken.tokenSymbol || '',
                        protocolLogo: product.protocolLogo || '',
                        platformWebSite: product.platformWebSite || ''
                    });
                });
            });
        }

        // Сортируем по rate по убыванию
        allIdeas.sort((a, b) => parseFloat(String(b.rate)) - parseFloat(String(a.rate)));

        // Логируем первый элемент для проверки
        if (allIdeas.length > 0) {
            console.log('Sample idea:', {
                platformName: allIdeas[0].platformName,
                protocolLogo: allIdeas[0].protocolLogo,
                platformWebSite: allIdeas[0].platformWebSite
            });
        }

        return NextResponse.json({ ideas: allIdeas });
    } catch (error) {
        console.error('Error reading investment ideas:', error);
        return NextResponse.json(
            { error: 'Failed to fetch investment ideas' },
            { status: 500 }
        );
    }
} 