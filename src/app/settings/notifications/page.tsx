'use client';

import { SessionProvider } from 'next-auth/react';
import NotificationSettings from '@/components/notifications/NotificationSettings';

export default function NotificationsSettingsPage() {
    return (
        <SessionProvider>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Notification Settings
                    </h1>
                    <p className="text-gray-600">
                        Manage how and when you receive notifications from StudyHub.
                    </p>
                </div>

                <NotificationSettings />
            </div>
        </SessionProvider>
    );
}