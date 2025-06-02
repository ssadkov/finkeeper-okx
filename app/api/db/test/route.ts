import { NextResponse } from 'next/server';
import { testConnection } from '@/app/config/database';

export async function GET() {
    try {
        const isConnected = await testConnection();
        
        if (isConnected) {
            return NextResponse.json({ status: 'success', message: 'Successfully connected to database' });
        } else {
            return NextResponse.json(
                { status: 'error', message: 'Failed to connect to database' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Database connection test error:', error);
        return NextResponse.json(
            { 
                status: 'error', 
                message: 'Error testing database connection',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 