/**
 * Push Notification Subscription API Route
 * Phase 7: Push notification management
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { subscription, userAgent } = body;

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json(
                { success: false, error: 'Invalid subscription data' },
                { status: 400 }
            );
        }

        const result = await notificationService.subscribeToPush(userId, {
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            userAgent,
        });

        return NextResponse.json({
            success: true,
            subscription: result,
        });
    } catch (error) {
        console.error('[Push Subscribe API] POST error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to subscribe to push notifications',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                { success: false, error: 'Missing endpoint' },
                { status: 400 }
            );
        }

        const result = await notificationService.unsubscribeFromPush(userId, endpoint);

        return NextResponse.json({
            success: true,
            updated: result.count,
        });
    } catch (error) {
        console.error('[Push Subscribe API] DELETE error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to unsubscribe from push notifications',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}