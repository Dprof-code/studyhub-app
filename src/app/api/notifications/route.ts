/**
 * Notifications API Route
 * Phase 7: Complete notification management API
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService, NotificationFilters } from '@/lib/notificationService';
import { NotificationType, NotificationPriority } from '@/generated/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const filters: NotificationFilters = {
            userId,
            type: searchParams.get('type') as NotificationType || undefined,
            status: searchParams.get('status') as any || undefined,
            priority: searchParams.get('priority') as NotificationPriority || undefined,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
        };

        // Date range filtering
        if (searchParams.get('dateFrom')) {
            filters.dateFrom = new Date(searchParams.get('dateFrom')!);
        }
        if (searchParams.get('dateTo')) {
            filters.dateTo = new Date(searchParams.get('dateTo')!);
        }

        const result = await notificationService.getNotifications(filters);

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('[Notifications API] GET error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch notifications',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case 'create':
                const notification = await notificationService.createNotification({
                    userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    actionUrl: data.actionUrl,
                    actionText: data.actionText,
                    data: data.data,
                    priority: data.priority,
                    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
                    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
                    groupKey: data.groupKey,
                    immediate: data.immediate,
                });

                return NextResponse.json({
                    success: true,
                    notification,
                });

            case 'createBatch':
                const batchResult = await notificationService.createBatchNotifications({
                    notifications: data.notifications.map((notif: any) => ({
                        userId: notif.userId || userId,
                        type: notif.type,
                        title: notif.title,
                        message: notif.message,
                        actionUrl: notif.actionUrl,
                        actionText: notif.actionText,
                        data: notif.data,
                        priority: notif.priority,
                        scheduledFor: notif.scheduledFor ? new Date(notif.scheduledFor) : undefined,
                        expiresAt: notif.expiresAt ? new Date(notif.expiresAt) : undefined,
                        groupKey: notif.groupKey,
                    })),
                    delay: data.delay,
                    immediate: data.immediate,
                });

                return NextResponse.json({
                    success: true,
                    notifications: batchResult,
                    count: batchResult.length,
                });

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[Notifications API] POST error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process notification request',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { action, notificationIds, notificationId } = body;

        switch (action) {
            case 'markAsRead':
                if (notificationId) {
                    // Single notification
                    const result = await notificationService.markAsRead(notificationId, userId);
                    return NextResponse.json({
                        success: true,
                        updated: result.count,
                    });
                } else if (notificationIds?.length) {
                    // Multiple notifications
                    const result = await notificationService.markMultipleAsRead(notificationIds, userId);
                    return NextResponse.json({
                        success: true,
                        updated: result.count,
                    });
                } else {
                    return NextResponse.json(
                        { success: false, error: 'Missing notificationId or notificationIds' },
                        { status: 400 }
                    );
                }

            case 'archive':
                if (!notificationId) {
                    return NextResponse.json(
                        { success: false, error: 'Missing notificationId' },
                        { status: 400 }
                    );
                }

                const archiveResult = await notificationService.archiveNotification(notificationId, userId);
                return NextResponse.json({
                    success: true,
                    updated: archiveResult.count,
                });

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[Notifications API] PATCH error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update notification',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}