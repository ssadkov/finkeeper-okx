import { NextRequest, NextResponse } from 'next/server';
import { updateProtocolList } from '@/app/cron/protocols';

export async function GET(req: NextRequest) {
    try {
        // Проверка авторизации
        if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('Starting protocol list update...');
        const result = await updateProtocolList();
        console.log('Protocol list update completed:', result);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error instanceof Error ? error.stack : undefined;
        
        console.error('Error in /api/cron/protocols:', {
            message: errorMessage,
            details: errorDetails
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to update protocol list',
                details: errorMessage,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
} 