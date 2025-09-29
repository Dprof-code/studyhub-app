/**
 * Notification Stats API Route
 * Phase 7: Notification statistics and analytics
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notificationService';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

        const stats = await notificationService.getNotificationStats(userId);

        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error('[Notification Stats API] GET error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch notification stats',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}