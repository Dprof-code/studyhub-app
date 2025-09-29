/**
 * Bull/Redis Queue System for Notifications & Background Jobs
 * Phase 7: Enhanced queue system with Redis persistence
 */
import Bull from 'bull';
import IORedis from 'ioredis';
import { db } from '../dbconfig';

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
};

// Create Redis connections
export const redisClient = new IORedis(redisConfig);
export const redisSubscriber = new IORedis(redisConfig);

// Queue definitions
export const notificationQueue = new Bull('notification processing', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

export const emailQueue = new Bull('email processing', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});

export const aiQueue = new Bull('ai processing', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 10000,
        },
    },
});

export const cleanupQueue = new Bull('cleanup tasks', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 1,
    },
});

// Job types
export const JOB_TYPES = {
    // Notification jobs
    SEND_PUSH_NOTIFICATION: 'send-push-notification',
    SEND_EMAIL_NOTIFICATION: 'send-email-notification',
    BATCH_NOTIFICATIONS: 'batch-notifications',
    NOTIFICATION_DIGEST: 'notification-digest',
    SCHEDULE_NOTIFICATION: 'schedule-notification',

    // Email jobs
    WELCOME_EMAIL: 'welcome-email',
    PASSWORD_RESET: 'password-reset',
    COURSE_REMINDER: 'course-reminder',
    WEEKLY_DIGEST: 'weekly-digest',

    // AI jobs (migrated from old system)
    ANALYZE_DOCUMENT: 'analyze-document',
    EXTRACT_QUESTIONS: 'extract-questions',
    IDENTIFY_CONCEPTS: 'identify-concepts',
    UPDATE_RAG_INDEX: 'update-rag-index',
    GENERATE_INSIGHTS: 'generate-insights',

    // Cleanup jobs
    CLEANUP_OLD_NOTIFICATIONS: 'cleanup-old-notifications',
    CLEANUP_EXPIRED_SESSIONS: 'cleanup-expired-sessions',
    CLEANUP_TEMP_FILES: 'cleanup-temp-files',
} as const;

// Job data interfaces
export interface NotificationJobData {
    userId: number;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    data?: any;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    scheduledFor?: Date;
    expiresAt?: Date;
    groupKey?: string;
}

export interface PushNotificationJobData extends NotificationJobData {
    subscriptions: {
        endpoint: string;
        p256dhKey: string;
        authKey: string;
    }[];
    payload: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        data?: any;
        actions?: {
            action: string;
            title: string;
        }[];
    };
}

export interface EmailNotificationJobData {
    to: string;
    subject: string;
    template: string;
    data: any;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    scheduledFor?: Date;
}

export interface BatchNotificationJobData {
    notifications: NotificationJobData[];
    batchId: string;
    delay?: number;
}

// Queue processors
class QueueProcessors {
    async processPushNotification(job: Bull.Job<PushNotificationJobData>) {
        const { userId, subscriptions, payload } = job.data;

        console.log(`[Push Notification] Processing for user ${userId}`);

        try {
            // Import webpush dynamically to avoid issues
            const webpush = await import('web-push');

            // Configure VAPID keys
            webpush.setVapidDetails(
                'mailto:' + (process.env.VAPID_EMAIL || 'your-email@example.com'),
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
                process.env.VAPID_PRIVATE_KEY || ''
            );

            const results = await Promise.allSettled(
                subscriptions.map(subscription =>
                    webpush.sendNotification(
                        {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.p256dhKey,
                                auth: subscription.authKey,
                            },
                        },
                        JSON.stringify(payload)
                    )
                )
            );

            // Update notification delivery status
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failedCount = results.length - successCount;

            console.log(`[Push Notification] Sent to ${successCount}/${results.length} subscriptions`);

            // Update database with delivery status
            await db.notification.updateMany({
                where: {
                    userId,
                    groupKey: job.data.groupKey,
                },
                data: {
                    pushSent: true,
                    delivered: successCount > 0,
                    deliveredAt: new Date(),
                },
            });

            return {
                success: true,
                sent: successCount,
                failed: failedCount,
                results,
            };
        } catch (error) {
            console.error('[Push Notification] Error:', error);
            throw error;
        }
    }

    async processEmailNotification(job: Bull.Job<EmailNotificationJobData>) {
        const { to, subject, template, data } = job.data;

        console.log(`[Email Notification] Processing email to ${to}`);

        try {
            // Mock email sending - replace with actual email service
            console.log(`[Email] Sending "${subject}" to ${to} using template ${template}`);

            // Simulate email sending delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                success: true,
                to,
                subject,
                template,
                sentAt: new Date(),
            };
        } catch (error) {
            console.error('[Email Notification] Error:', error);
            throw error;
        }
    }

    async processBatchNotifications(job: Bull.Job<BatchNotificationJobData>) {
        const { notifications, batchId, delay = 0 } = job.data;

        console.log(`[Batch Notifications] Processing batch ${batchId} with ${notifications.length} notifications`);

        try {
            // Add delay if specified
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }

            // Process notifications in parallel
            const results = await Promise.allSettled(
                notifications.map(async (notificationData) => {
                    // Create notification in database
                    const notification = await db.notification.create({
                        data: {
                            userId: notificationData.userId,
                            type: notificationData.type as any,
                            title: notificationData.title,
                            message: notificationData.message,
                            actionUrl: notificationData.actionUrl,
                            actionText: notificationData.actionText,
                            data: notificationData.data,
                            priority: notificationData.priority as any || 'NORMAL',
                            scheduledFor: notificationData.scheduledFor,
                            expiresAt: notificationData.expiresAt,
                            groupKey: notificationData.groupKey || batchId,
                            batchId,
                        },
                    });

                    // Queue push notification if user has subscriptions
                    const subscriptions = await db.notificationSubscription.findMany({
                        where: {
                            userId: notificationData.userId,
                            isActive: true,
                        },
                    });

                    if (subscriptions.length > 0) {
                        await notificationQueue.add(JOB_TYPES.SEND_PUSH_NOTIFICATION, {
                            ...notificationData,
                            subscriptions: subscriptions.map((sub: any) => ({
                                endpoint: sub.endpoint,
                                p256dhKey: sub.p256dhKey,
                                authKey: sub.authKey,
                            })),
                            payload: {
                                title: notificationData.title,
                                body: notificationData.message,
                                icon: '/icons/icon-192x192.png',
                                badge: '/icons/badge-72x72.png',
                                data: {
                                    notificationId: notification.id,
                                    actionUrl: notificationData.actionUrl,
                                },
                                actions: notificationData.actionUrl ? [{
                                    action: 'open',
                                    title: notificationData.actionText || 'Open',
                                }] : undefined,
                            },
                            groupKey: batchId,
                        });
                    }

                    return notification;
                })
            );

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failedCount = results.length - successCount;

            console.log(`[Batch Notifications] Processed ${successCount}/${notifications.length} notifications`);

            return {
                success: true,
                batchId,
                processed: successCount,
                failed: failedCount,
                results,
            };
        } catch (error) {
            console.error('[Batch Notifications] Error:', error);
            throw error;
        }
    }

    async processNotificationDigest(job: Bull.Job<{ userId: number; frequency: 'daily' | 'weekly' }>) {
        const { userId, frequency } = job.data;

        console.log(`[Notification Digest] Processing ${frequency} digest for user ${userId}`);

        try {
            const user = await db.user.findUnique({
                where: { id: userId },
                include: {
                    notificationPreferences: true,
                },
            });

            if (!user || !user.notificationPreferences?.digestEnabled) {
                console.log(`[Notification Digest] User ${userId} has digest disabled`);
                return { success: true, skipped: true };
            }

            // Calculate time range for digest
            const now = new Date();
            const startDate = new Date(now);
            if (frequency === 'daily') {
                startDate.setDate(startDate.getDate() - 1);
            } else {
                startDate.setDate(startDate.getDate() - 7);
            }

            // Get unread notifications
            const notifications = await db.notification.findMany({
                where: {
                    userId,
                    status: 'UNREAD',
                    createdAt: {
                        gte: startDate,
                        lte: now,
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 50,
            });

            if (notifications.length === 0) {
                console.log(`[Notification Digest] No notifications for user ${userId}`);
                return { success: true, empty: true };
            }

            // Group notifications by type
            const grouped = notifications.reduce((acc: Record<string, any[]>, notification: any) => {
                if (!acc[notification.type]) {
                    acc[notification.type] = [];
                }
                acc[notification.type].push(notification);
                return acc;
            }, {} as Record<string, any[]>);

            // Send digest email
            await emailQueue.add(JOB_TYPES.WEEKLY_DIGEST, {
                to: user.email,
                subject: `StudyHub ${frequency} digest - ${notifications.length} updates`,
                template: 'notification-digest',
                data: {
                    user: user.firstname,
                    frequency,
                    notifications,
                    grouped,
                    totalCount: notifications.length,
                    date: now.toDateString(),
                },
            });

            return {
                success: true,
                userId,
                frequency,
                notificationCount: notifications.length,
                types: Object.keys(grouped),
            };
        } catch (error) {
            console.error('[Notification Digest] Error:', error);
            throw error;
        }
    }

    async processCleanupOldNotifications(job: Bull.Job<{ maxAge: number }>) {
        const { maxAge } = job.data;

        console.log(`[Cleanup] Removing notifications older than ${maxAge} days`);

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAge);

            const result = await db.notification.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                    status: 'ARCHIVED',
                },
            });

            console.log(`[Cleanup] Removed ${result.count} old notifications`);

            return {
                success: true,
                removedCount: result.count,
                cutoffDate,
            };
        } catch (error) {
            console.error('[Cleanup] Error:', error);
            throw error;
        }
    }
}

// Initialize processors
const processors = new QueueProcessors();

// Register queue processors
notificationQueue.process(JOB_TYPES.SEND_PUSH_NOTIFICATION, 5, processors.processPushNotification.bind(processors));
notificationQueue.process(JOB_TYPES.BATCH_NOTIFICATIONS, 3, processors.processBatchNotifications.bind(processors));
notificationQueue.process(JOB_TYPES.NOTIFICATION_DIGEST, 1, processors.processNotificationDigest.bind(processors));

emailQueue.process(JOB_TYPES.SEND_EMAIL_NOTIFICATION, 10, processors.processEmailNotification.bind(processors));
emailQueue.process(JOB_TYPES.WELCOME_EMAIL, 5, processors.processEmailNotification.bind(processors));
emailQueue.process(JOB_TYPES.WEEKLY_DIGEST, 2, processors.processEmailNotification.bind(processors));

cleanupQueue.process(JOB_TYPES.CLEANUP_OLD_NOTIFICATIONS, 1, processors.processCleanupOldNotifications.bind(processors));

// Queue event handlers
notificationQueue.on('completed', (job) => {
    console.log(`[Notification Queue] Job ${job.id} completed`);
});

notificationQueue.on('failed', (job, error) => {
    console.error(`[Notification Queue] Job ${job.id} failed:`, error.message);
});

emailQueue.on('completed', (job) => {
    console.log(`[Email Queue] Job ${job.id} completed`);
});

emailQueue.on('failed', (job, error) => {
    console.error(`[Email Queue] Job ${job.id} failed:`, error.message);
});

// Helper functions
export async function queueNotification(data: NotificationJobData, options?: Bull.JobOptions) {
    return notificationQueue.add(JOB_TYPES.BATCH_NOTIFICATIONS, {
        notifications: [data],
        batchId: `single-${Date.now()}`,
    }, options);
}

export async function queueBatchNotifications(notifications: NotificationJobData[], options?: Bull.JobOptions & { delay?: number }) {
    return notificationQueue.add(JOB_TYPES.BATCH_NOTIFICATIONS, {
        notifications,
        batchId: `batch-${Date.now()}`,
        delay: options?.delay,
    }, options);
}

export async function queueEmail(data: EmailNotificationJobData, options?: Bull.JobOptions) {
    return emailQueue.add(JOB_TYPES.SEND_EMAIL_NOTIFICATION, data, options);
}

export async function scheduleNotificationDigest(userId: number, frequency: 'daily' | 'weekly') {
    const preferences = await db.notificationPreference.findUnique({
        where: { userId },
    });

    if (!preferences?.digestEnabled) return null;

    const digestTime = preferences.digestTime || '09:00';
    const [hours, minutes] = digestTime.split(':').map(Number);

    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (frequency === 'daily') {
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
    } else {
        // Weekly - find next occurrence of the same day
        const daysDiff = 7;
        scheduledTime.setDate(scheduledTime.getDate() + daysDiff);
    }

    return notificationQueue.add(
        JOB_TYPES.NOTIFICATION_DIGEST,
        { userId, frequency },
        { delay: scheduledTime.getTime() - now.getTime() }
    );
}

export async function getQueueStats() {
    const [notificationStats, emailStats, cleanupStats] = await Promise.all([
        {
            waiting: await notificationQueue.getWaiting(),
            active: await notificationQueue.getActive(),
            completed: await notificationQueue.getCompleted(),
            failed: await notificationQueue.getFailed(),
            delayed: await notificationQueue.getDelayed(),
        },
        {
            waiting: await emailQueue.getWaiting(),
            active: await emailQueue.getActive(),
            completed: await emailQueue.getCompleted(),
            failed: await emailQueue.getFailed(),
            delayed: await emailQueue.getDelayed(),
        },
        {
            waiting: await cleanupQueue.getWaiting(),
            active: await cleanupQueue.getActive(),
            completed: await cleanupQueue.getCompleted(),
            failed: await cleanupQueue.getFailed(),
            delayed: await cleanupQueue.getDelayed(),
        },
    ]);

    return {
        notification: {
            waiting: notificationStats.waiting.length,
            active: notificationStats.active.length,
            completed: notificationStats.completed.length,
            failed: notificationStats.failed.length,
            delayed: notificationStats.delayed.length,
        },
        email: {
            waiting: emailStats.waiting.length,
            active: emailStats.active.length,
            completed: emailStats.completed.length,
            failed: emailStats.failed.length,
            delayed: emailStats.delayed.length,
        },
        cleanup: {
            waiting: cleanupStats.waiting.length,
            active: cleanupStats.active.length,
            completed: cleanupStats.completed.length,
            failed: cleanupStats.failed.length,
            delayed: cleanupStats.delayed.length,
        },
        redis: {
            status: redisClient.status,
            connected: redisClient.status === 'ready',
        },
    };
}

// Initialize cleanup job
export async function initializeCleanupJobs() {
    // Schedule daily cleanup at 2 AM
    await cleanupQueue.add(
        JOB_TYPES.CLEANUP_OLD_NOTIFICATIONS,
        { maxAge: 30 }, // Remove notifications older than 30 days
        {
            repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
            removeOnComplete: 1,
            removeOnFail: 1,
        }
    );

    console.log('[Queue System] Cleanup jobs scheduled');
}

// Graceful shutdown
export async function shutdownQueues() {
    console.log('[Queue System] Shutting down queues...');

    await Promise.all([
        notificationQueue.close(),
        emailQueue.close(),
        cleanupQueue.close(),
    ]);

    await redisClient.disconnect();
    await redisSubscriber.disconnect();
    await db.$disconnect();

    console.log('[Queue System] All queues and connections closed');
}

// Handle process termination
process.on('SIGTERM', shutdownQueues);
process.on('SIGINT', shutdownQueues);

export default {
    notificationQueue,
    emailQueue,
    aiQueue,
    cleanupQueue,
    queueNotification,
    queueBatchNotifications,
    queueEmail,
    getQueueStats,
    initializeCleanupJobs,
    shutdownQueues,
};