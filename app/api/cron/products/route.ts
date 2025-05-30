import { NextResponse } from 'next/server';
import { updateProducts } from '@/app/cron/products';

// Обработка GET запроса
export async function GET() {
    try {
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