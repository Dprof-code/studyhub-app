'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationCenter from './NotificationCenter';

interface NotificationStats {
    totalCount: number;
    unreadCount: number;
    highPriorityCount: number;
}

export function NotificationBell() {
    const [stats, setStats] = useState<NotificationStats>({
        totalCount: 0,
        unreadCount: 0,
        highPriorityCount: 0,
    });
    const [showCenter, setShowCenter] = useState(false);
    const [hasNewNotification, setHasNewNotification] = useState(false);

    useEffect(() => {
        fetchStats();

        // Set up periodic polling for new notifications
        const interval = setInterval(fetchStats, 30000); // Poll every 30 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Set up service worker message listener for real-time updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'notification-received') {
                    setHasNewNotification(true);
                    fetchStats();

                    // Clear the animation after 3 seconds
                    setTimeout(() => setHasNewNotification(false), 3000);
                }
            });
        }
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/notifications/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching notification stats:', error);
        }
    };

    const handleBellClick = () => {
        setShowCenter(!showCenter);
        setHasNewNotification(false);
    };

    const handleCenterClose = () => {
        setShowCenter(false);
        // Refresh stats when closing to update unread count
        fetchStats();
    };

    return (
        <>
            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBellClick}
                    className={cn(
                        "relative hover:bg-gray-100 transition-colors",
                        hasNewNotification && "animate-pulse"
                    )}
                >
                    {stats.unreadCount > 0 || stats.highPriorityCount > 0 ? (
                        <BellRing className={cn(
                            "h-5 w-5",
                            stats.highPriorityCount > 0 ? "text-red-500" : "text-blue-500",
                            hasNewNotification && "animate-bounce"
                        )} />
                    ) : (
                        <Bell className="h-5 w-5 text-gray-600" />
                    )}

                    {stats.unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className={cn(
                                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                                stats.unreadCount > 99 && "w-6",
                                hasNewNotification && "animate-ping"
                            )}
                        >
                            {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
                        </Badge>
                    )}

                    {stats.highPriorityCount > 0 && stats.unreadCount === 0 && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                </Button>

                {/* Notification center overlay */}
                <NotificationCenter
                    isOpen={showCenter}
                    onClose={handleCenterClose}
                />
            </div>
        </>
    );
}

export default NotificationBell;