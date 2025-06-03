import { NextResponse } from 'next/server';
import pool from '@/app/config/database';

interface InvestmentIdea {
    network: string;
    token_symbol: string;
    platform_name: string;
    rate: string | number;
    rate_type: string;
    tvl: number;
    token_address: string;
    token_logo: string;
    platform_logo: string;
    platform_url: string;
    invest_type: string;
}

export async function GET() {
    try {
        const client = await pool.connect();
        
        try {
            // Получаем все продукты из базы данных
            const query = `
                SELECT 
                    network,
                    token_symbol,
                    platform_name,
                    rate,
                    rate_type,
                    tvl,
                    token_address,
                    token_logo,
                    platform_logo,
                    platform_url,
                    invest_type
                FROM products_list
                ORDER BY rate DESC
            `;
            
            const { rows } = await client.query(query);

            // Преобразуем данные в нужный формат
            const ideas: InvestmentIdea[] = rows.map(row => ({
                network: row.network,
                token_symbol: row.token_symbol,
                platform_name: row.platform_name,
                rate: row.rate,
                rate_type: row.rate_type,
                tvl: parseFloat(row.tvl) || 0,
                token_address: row.token_address,
                token_logo: row.token_logo,
                platform_logo: row.platform_logo,
                platform_url: row.platform_url,
                invest_type: row.invest_type
            }));

        // Логируем первый элемент для проверки
            if (ideas.length > 0) {
            console.log('Sample idea:', {
                    platform_name: ideas[0].platform_name,
                    platform_logo: ideas[0].platform_logo,
                    platform_url: ideas[0].platform_url
            });
        }

            return NextResponse.json({ ideas });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error reading investment ideas:', error);
        return NextResponse.json(
            { error: 'Failed to fetch investment ideas' },
            { status: 500 }
        );
    }
} 