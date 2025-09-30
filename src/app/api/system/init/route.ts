import { NextResponse } from 'next/server';
import { initializeJobSystem } from '@/lib/queue/init';

export async function POST() {
    try {
        // Initialize the job processing system
        initializeJobSystem();

        return NextResponse.json({
            success: true,
            message: 'Job system initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing job system:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to initialize job system',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}