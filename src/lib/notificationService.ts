/**
 * Notification Service
 * Phase 7: Complete notification management system
 */
import { NotificationType, NotificationPriority, NotificationStatus } from '@/generated/prisma';
import { db } from './dbconfig';
import { queueNotification, queueBatchNotifications, scheduleNotificationDigest } from './queue/bullQueues';

export interface CreateNotificationOptions {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    data?: any;
    priority?: NotificationPriority;
    scheduledFor?: Date;
    expiresAt?: Date;
    groupKey?: string;
    immediate?: boolean; // Send immediately via push
}

export interface BatchNotificationOptions {
    notifications: CreateNotificationOptions[];
    delay?: number; // Delay in seconds for batching
    immediate?: boolean;
}

export interface NotificationFilters {
    userId?: number;
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    groupKey?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}

export class NotificationService {
    /**
     * Create a single notification
     */
    async createNotification(options: CreateNotificationOptions) {
        const {
            userId,
            type,
            title,
            message,
            actionUrl,
            actionText,
            data,
            priority = NotificationPriority.NORMAL,
            expiresAt,
            groupKey,
            immediate = false,
        } = options;

        let scheduledFor = options.scheduledFor;

        try {
            // Check if user exists and get preferences
            const user = await db.user.findUnique({
                where: { id: userId },
                include: {
                    notificationPreferences: true,
                },
            });

            if (!user) {
                throw new Error(`User ${userId} not found`);
            }

            // Check if user has this notification type enabled
            const preferences = user.notificationPreferences;
            if (preferences?.typePreferences) {
                const typePrefs = preferences.typePreferences as any;
                if (typePrefs[type] === false) {
                    console.log(`[Notification] Type ${type} disabled for user ${userId}`);
                    return null;
                }
            }

            // Check quiet hours
            if (this.isQuietHours(preferences)) {
                console.log(`[Notification] Quiet hours active for user ${userId}, scheduling for later`);
                scheduledFor = this.getNextActiveTime(preferences);
            }

            // Create notification in database
            const notification = await db.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    actionUrl,
                    actionText,
                    data: data ? JSON.parse(JSON.stringify(data)) : undefined,
                    priority,
                    scheduledFor: scheduledFor || new Date(),
                    expiresAt,
                    groupKey: groupKey || `single-${Date.now()}`,
                },
            });

            // Queue for processing if immediate or scheduled
            if (immediate || !scheduledFor || scheduledFor <= new Date()) {
                await queueNotification({
                    userId,
                    type,
                    title,
                    message,
                    actionUrl,
                    actionText,
                    data,
                    priority,
                    scheduledFor,
                    expiresAt,
                    groupKey: notification.groupKey || undefined,
                });
            } else {
                // Schedule for later
                const delay = scheduledFor.getTime() - Date.now();
                await queueNotification(
                    {
                        userId,
                        type,
                        title,
                        message,
                        actionUrl,
                        actionText,
                        data,
                        priority,
                        scheduledFor,
                        expiresAt,
                        groupKey: notification.groupKey || undefined,
                    },
                    { delay }
                );
            }

            console.log(`[Notification] Created notification ${notification.id} for user ${userId}`);
            return notification;
        } catch (error) {
            console.error('[Notification Service] Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Create multiple notifications as a batch
     */
    async createBatchNotifications(options: BatchNotificationOptions) {
        const { notifications, delay = 0 } = options;

        try {
            const validNotifications = [];

            // Validate and process each notification
            for (const notif of notifications) {
                const user = await db.user.findUnique({
                    where: { id: notif.userId },
                    include: { notificationPreferences: true },
                });

                if (!user) {
                    console.warn(`[Batch Notification] User ${notif.userId} not found, skipping`);
                    continue;
                }

                // Check preferences
                const preferences = user.notificationPreferences;
                if (preferences?.typePreferences) {
                    const typePrefs = preferences.typePreferences as any;
                    if (typePrefs[notif.type] === false) {
                        console.log(`[Batch Notification] Type ${notif.type} disabled for user ${notif.userId}`);
                        continue;
                    }
                }

                validNotifications.push({
                    ...notif,
                    priority: notif.priority || NotificationPriority.NORMAL,
                    groupKey: notif.groupKey || `batch-${Date.now()}`,
                });
            }

            if (validNotifications.length === 0) {
                console.log('[Batch Notification] No valid notifications to process');
                return [];
            }

            // Queue batch processing
            await queueBatchNotifications(validNotifications, { delay });

            console.log(`[Notification] Queued ${validNotifications.length} batch notifications`);
            return validNotifications;
        } catch (error) {
            console.error('[Notification Service] Error creating batch notifications:', error);
            throw error;
        }
    }

    /**
     * Get notifications for a user with filtering
     */
    async getNotifications(filters: NotificationFilters) {
        const {
            userId,
            type,
            status,
            priority,
            groupKey,
            dateFrom,
            dateTo,
            limit = 50,
            offset = 0,
        } = filters;

        try {
            const where: any = {};

            if (userId) where.userId = userId;
            if (type) where.type = type;
            if (status) where.status = status;
            if (priority) where.priority = priority;
            if (groupKey) where.groupKey = groupKey;

            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) where.createdAt.gte = dateFrom;
                if (dateTo) where.createdAt.lte = dateTo;
            }

            const [notifications, total] = await Promise.all([
                db.notification.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                }),
                db.notification.count({ where }),
            ]);

            return {
                notifications: notifications.map(notif => ({
                    ...notif,
                    data: notif.data ? JSON.parse(notif.data as string) : null,
                })),
                total,
                hasMore: offset + notifications.length < total,
            };
        } catch (error) {
            console.error('[Notification Service] Error getting notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: number) {
        try {
            const notification = await db.notification.updateMany({
                where: {
                    id: notificationId,
                    userId,
                    status: NotificationStatus.UNREAD,
                },
                data: {
                    status: NotificationStatus.READ,
                    readAt: new Date(),
                },
            });

            if (notification.count === 0) {
                throw new Error('Notification not found or already read');
            }

            console.log(`[Notification] Marked notification ${notificationId} as read`);
            return notification;
        } catch (error) {
            console.error('[Notification Service] Error marking as read:', error);
            throw error;
        }
    }

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(notificationIds: string[], userId: number) {
        try {
            const result = await db.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId,
                    status: NotificationStatus.UNREAD,
                },
                data: {
                    status: NotificationStatus.READ,
                    readAt: new Date(),
                },
            });

            console.log(`[Notification] Marked ${result.count} notifications as read`);
            return result;
        } catch (error) {
            console.error('[Notification Service] Error marking multiple as read:', error);
            throw error;
        }
    }

    /**
     * Archive notification
     */
    async archiveNotification(notificationId: string, userId: number) {
        try {
            const notification = await db.notification.updateMany({
                where: {
                    id: notificationId,
                    userId,
                },
                data: {
                    status: NotificationStatus.ARCHIVED,
                },
            });

            if (notification.count === 0) {
                throw new Error('Notification not found');
            }

            console.log(`[Notification] Archived notification ${notificationId}`);
            return notification;
        } catch (error) {
            console.error('[Notification Service] Error archiving notification:', error);
            throw error;
        }
    }

    /**
     * Get notification statistics for a user
     */
    async getNotificationStats(userId: number) {
        try {
            const [unreadCount, totalCount, typeStats] = await Promise.all([
                db.notification.count({
                    where: { userId, status: NotificationStatus.UNREAD },
                }),
                db.notification.count({
                    where: { userId },
                }),
                db.notification.groupBy({
                    by: ['type'],
                    where: { userId },
                    _count: { type: true },
                }),
            ]);

            return {
                unreadCount,
                totalCount,
                readCount: totalCount - unreadCount,
                typeStats: typeStats.reduce((acc, stat) => {
                    acc[stat.type] = stat._count.type;
                    return acc;
                }, {} as Record<string, number>),
            };
        } catch (error) {
            console.error('[Notification Service] Error getting stats:', error);
            throw error;
        }
    }

    /**
     * Subscribe to push notifications
     */
    async subscribeToPush(userId: number, subscription: {
        endpoint: string;
        p256dhKey: string;
        authKey: string;
        userAgent?: string;
    }) {
        try {
            const existing = await db.notificationSubscription.findUnique({
                where: {
                    userId_endpoint: {
                        userId,
                        endpoint: subscription.endpoint,
                    },
                },
            });

            if (existing) {
                // Update existing subscription
                return db.notificationSubscription.update({
                    where: { id: existing.id },
                    data: {
                        p256dhKey: subscription.p256dhKey,
                        authKey: subscription.authKey,
                        userAgent: subscription.userAgent,
                        isActive: true,
                        lastUsed: new Date(),
                    },
                });
            }

            // Create new subscription
            const newSubscription = await db.notificationSubscription.create({
                data: {
                    userId,
                    endpoint: subscription.endpoint,
                    p256dhKey: subscription.p256dhKey,
                    authKey: subscription.authKey,
                    userAgent: subscription.userAgent,
                    lastUsed: new Date(),
                },
            });

            console.log(`[Notification] New push subscription for user ${userId}`);
            return newSubscription;
        } catch (error) {
            console.error('[Notification Service] Error subscribing to push:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPush(userId: number, endpoint: string) {
        try {
            const result = await db.notificationSubscription.updateMany({
                where: {
                    userId,
                    endpoint,
                },
                data: {
                    isActive: false,
                },
            });

            console.log(`[Notification] Unsubscribed user ${userId} from push notifications`);
            return result;
        } catch (error) {
            console.error('[Notification Service] Error unsubscribing from push:', error);
            throw error;
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(userId: number, preferences: {
        emailEnabled?: boolean;
        pushEnabled?: boolean;
        inAppEnabled?: boolean;
        typePreferences?: Record<string, boolean>;
        quietHoursStart?: string;
        quietHoursEnd?: string;
        timezone?: string;
        digestEnabled?: boolean;
        digestFrequency?: string;
        digestTime?: string;
        batchingEnabled?: boolean;
        batchingDelay?: number;
    }) {
        try {
            const existing = await db.notificationPreference.findUnique({
                where: { userId },
            });

            let result;
            if (existing) {
                result = await db.notificationPreference.update({
                    where: { userId },
                    data: {
                        ...preferences,
                        typePreferences: preferences.typePreferences ?
                            JSON.stringify(preferences.typePreferences) : existing.typePreferences || '{}',
                    },
                });
            } else {
                result = await db.notificationPreference.create({
                    data: {
                        userId,
                        ...preferences,
                        typePreferences: preferences.typePreferences ?
                            JSON.stringify(preferences.typePreferences) : '{}',
                    },
                });
            }

            // Update digest schedule if preferences changed
            if (preferences.digestEnabled !== undefined ||
                preferences.digestFrequency !== undefined ||
                preferences.digestTime !== undefined) {

                if (result.digestEnabled && result.digestFrequency) {
                    await scheduleNotificationDigest(userId, result.digestFrequency as any);
                }
            }

            console.log(`[Notification] Updated preferences for user ${userId}`);
            return result;
        } catch (error) {
            console.error('[Notification Service] Error updating preferences:', error);
            throw error;
        }
    }

    /**
     * Get user notification preferences
     */
    async getPreferences(userId: number) {
        try {
            let preferences = await db.notificationPreference.findUnique({
                where: { userId },
            });

            if (!preferences) {
                // Create default preferences
                preferences = await db.notificationPreference.create({
                    data: {
                        userId,
                        emailEnabled: true,
                        pushEnabled: true,
                        inAppEnabled: true,
                        typePreferences: '{}',
                        timezone: 'UTC',
                        digestEnabled: false,
                        digestFrequency: 'daily',
                        digestTime: '09:00',
                        batchingEnabled: true,
                        batchingDelay: 300,
                    },
                });
            }

            return {
                ...preferences,
                typePreferences: JSON.parse(preferences.typePreferences as string),
            };
        } catch (error) {
            console.error('[Notification Service] Error getting preferences:', error);
            throw error;
        }
    }

    /**
     * Check if current time is within quiet hours
     */
    private isQuietHours(preferences: any): boolean {
        if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
            return false;
        }

        const now = new Date();
        // This is a simplified implementation - in production you'd use a proper timezone library
        const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
        const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const currentTime = currentHour * 60 + currentMinute;
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        if (startTime <= endTime) {
            // Same day quiet hours
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Overnight quiet hours
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    /**
     * Get next active time after quiet hours
     */
    private getNextActiveTime(preferences: any): Date {
        if (!preferences?.quietHoursEnd) {
            return new Date();
        }

        const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
        const now = new Date();
        const nextActive = new Date(now);

        nextActive.setHours(endHour, endMinute, 0, 0);

        if (nextActive <= now) {
            nextActive.setDate(nextActive.getDate() + 1);
        }

        return nextActive;
    }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Convenience functions
export const createNotification = (options: CreateNotificationOptions) =>
    notificationService.createNotification(options);

export const createBatchNotifications = (options: BatchNotificationOptions) =>
    notificationService.createBatchNotifications(options);

export const getNotifications = (filters: NotificationFilters) =>
    notificationService.getNotifications(filters);

export const markAsRead = (notificationId: string, userId: number) =>
    notificationService.markAsRead(notificationId, userId);

export default notificationService;