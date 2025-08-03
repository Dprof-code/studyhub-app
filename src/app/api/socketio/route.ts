import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getIO } from '@/lib/socketio';

export async function GET(req: NextRequest) {
    const io = getIO();

    if (!io) {
        return new Response('Socket.IO not initialized', { status: 500 });
    }

    // Handle Socket.IO upgrade
    const headersList = headers();
    const upgrade = headersList.get('upgrade');

    if (upgrade && upgrade.toLowerCase() === 'websocket') {
        return new Response(null, { status: 101 });
    }

    return new Response('Socket.IO server running');
}

export const dynamic = 'force-dynamic';