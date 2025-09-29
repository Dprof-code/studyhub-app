'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellRing, Check, Clock, MessageSquare, Users, BookOpen, Award, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    status: 'UNREAD' | 'READ' | 'DISMISSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    actionUrl?: string;
    groupKey?: string;
    createdAt: string;
    readAt?: string;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const notificationIcons = {
    SYSTEM: AlertTriangle,
    COURSE: BookOpen,
    ASSIGNMENT: Clock,
    DISCUSSION: MessageSquare,
    PEER_MATCH: Users,
    ACHIEVEMENT: Award,
    REMINDER: Bell,
    COLLABORATION: Users,
    RESOURCE: BookOpen,
    GAMIFICATION: Award,
    AI_RECOMMENDATION: CheckCircle,
    GENERAL: Bell,
};

const priorityColors = {
    LOW: 'text-gray-500',
    MEDIUM: 'text-blue-500',
    HIGH: 'text-orange-500',
    URGENT: 'text-red-500',
};

const priorityBadgeColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
};

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            } else {
                throw new Error('Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast({
                title: 'Error',
                description: 'Failed to load notifications',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'markAsRead',
                    notificationId,
                }),
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === notificationId
                            ? { ...notif, status: 'READ' as const, readAt: new Date().toISOString() }
                            : notif
                    )
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'markAllAsRead',
                }),
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notif => ({
                        ...notif,
                        status: 'READ' as const,
                        readAt: new Date().toISOString(),
                    }))
                );
                toast({
                    title: 'Success',
                    description: 'All notifications marked as read',
                });
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast({
                title: 'Error',
                description: 'Failed to mark all notifications as read',
                variant: 'destructive',
            });
        }
    };

    const dismissNotification = async (notificationId: number) => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'dismiss',
                    notificationId,
                }),
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.filter(notif => notif.id !== notificationId)
                );
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (notification.status === 'UNREAD') {
            await markAsRead(notification.id);
        }

        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'unread') return notif.status === 'UNREAD';
        if (filter === 'read') return notif.status === 'READ';
        return true;
    });

    const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="fixed right-4 top-16 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border">
                <Card className="h-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BellRing className="h-5 w-5" />
                                    Notifications
                                    {unreadCount > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Stay updated with your learning progress
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                                <Button
                                    variant={filter === 'all' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilter('all')}
                                    className="h-7 px-3"
                                >
                                    All
                                </Button>
                                <Button
                                    variant={filter === 'unread' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilter('unread')}
                                    className="h-7 px-3"
                                >
                                    Unread
                                </Button>
                                <Button
                                    variant={filter === 'read' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilter('read')}
                                    className="h-7 px-3"
                                >
                                    Read
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchNotifications}
                                disabled={loading}
                                className="h-7 px-2"
                            >
                                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                            </Button>

                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="h-7 px-2 text-xs"
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <ScrollArea className="h-[60vh]">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">No notifications</p>
                                    <p className="text-sm">
                                        {filter === 'unread'
                                            ? "You're all caught up!"
                                            : "You'll see notifications here when they arrive"}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredNotifications.map((notification, index) => {
                                        const IconComponent = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell;

                                        return (
                                            <div
                                                key={notification.id}
                                                className={cn(
                                                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors relative",
                                                    notification.status === 'UNREAD' && "bg-blue-50/50"
                                                )}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                                                        notification.status === 'UNREAD' ? "bg-blue-100" : "bg-gray-100"
                                                    )}>
                                                        <IconComponent className={cn(
                                                            "h-4 w-4",
                                                            notification.status === 'UNREAD'
                                                                ? priorityColors[notification.priority]
                                                                : "text-gray-500"
                                                        )} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={cn(
                                                                "text-sm font-medium truncate",
                                                                notification.status === 'UNREAD' ? "text-gray-900" : "text-gray-600"
                                                            )}>
                                                                {notification.title}
                                                            </p>

                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                {notification.priority !== 'LOW' && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className={cn(
                                                                            "text-xs px-1.5 py-0",
                                                                            priorityBadgeColors[notification.priority]
                                                                        )}
                                                                    >
                                                                        {notification.priority}
                                                                    </Badge>
                                                                )}

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        dismissNotification(notification.id);
                                                                    }}
                                                                    className="h-6 w-6 p-0 hover:bg-gray-200"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>

                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-xs text-gray-500">
                                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                            </p>

                                                            {notification.status === 'UNREAD' && (
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default NotificationCenter;