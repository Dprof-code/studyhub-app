import { NextRequest, NextResponse } from 'next/server';
import { Server as HTTPServer } from 'http';
import { initIO, getIO } from '@/lib/socketio';

export async function GET(req: NextRequest) {
    console.log('🌐 Socket.IO API route accessed');

    // Try to get existing instance or initialize if needed
    let io = getIO();

    if (!io) {
        console.log('⚠️ Socket.IO not found, attempting to access global instance...');

        // Check if it's available globally
        if (globalThis.__socketio) {
            console.log('✅ Found global Socket.IO instance');
            io = globalThis.__socketio;
        } else {
            console.log('❌ No Socket.IO instance available');
            return NextResponse.json(
                { error: 'Socket.IO not initialized' },
                { status: 500 }
            );
        }
    }

    console.log('✅ Socket.IO instance available:', !!io);

    return NextResponse.json({
        status: 'Socket.IO server running',
        connected: !!io,
        clientsCount: io ? io.sockets.sockets.size : 0
    });
}

export const dynamic = 'force-dynamic';