import { NextRequest, NextResponse } from 'next/server';
import { updateProducts } from '@/app/cron/products';

// Обработка GET запроса
export async function GET(req: NextRequest) {
    try {
        // Проверка авторизации
        if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Обновляем данные и получаем статистику
        const result = await updateProducts();
        
        return NextResponse.json({ 
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Cron products error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { status: 500 }
        );
    }
} 