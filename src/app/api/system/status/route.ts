import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemStatus } from '@/lib/queue/init';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Add admin check here if needed
        // if (!session.user.isAdmin) {
        //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        // }

        const systemStatus = await getSystemStatus();

        return NextResponse.json(systemStatus);

    } catch (error) {
        console.error('System status error:', error);
        return NextResponse.json(
            { error: 'Failed to get system status' },
            { status: 500 }
        );
    }
}