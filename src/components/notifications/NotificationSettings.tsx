'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellRing, Clock, Smartphone, Mail, Settings, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPreferences {
    enablePush: boolean;
    enableEmail: boolean;
    enableInApp: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    digest: {
        enabled: boolean;
        frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        time: string;
    };
    categories: {
        SYSTEM: boolean;
        COURSE: boolean;
        ASSIGNMENT: boolean;
        DISCUSSION: boolean;
        PEER_MATCH: boolean;
        ACHIEVEMENT: boolean;
        REMINDER: boolean;
        COLLABORATION: boolean;
        RESOURCE: boolean;
        GAMIFICATION: boolean;
        AI_RECOMMENDATION: boolean;
        GENERAL: boolean;
    };
}

const categoryLabels = {
    SYSTEM: 'System Updates',
    COURSE: 'Course Activities',
    ASSIGNMENT: 'Assignment Reminders',
    DISCUSSION: 'Discussion Posts',
    PEER_MATCH: 'Peer Matching',
    ACHIEVEMENT: 'Achievements & Badges',
    REMINDER: 'General Reminders',
    COLLABORATION: 'Collaboration Requests',
    RESOURCE: 'New Resources',
    GAMIFICATION: 'Points & Leaderboards',
    AI_RECOMMENDATION: 'AI Recommendations',
    GENERAL: 'General Notifications',
};

const categoryDescriptions = {
    SYSTEM: 'Important system messages and maintenance updates',
    COURSE: 'New courses, updates, and course-related notifications',
    ASSIGNMENT: 'Assignment deadlines and submission reminders',
    DISCUSSION: 'New posts and replies in discussion forums',
    PEER_MATCH: 'Study partner matches and collaboration invites',
    ACHIEVEMENT: 'Earned badges, achievements, and milestones',
    REMINDER: 'Study reminders and scheduled notifications',
    COLLABORATION: 'Invitations to collaborative study sessions',
    RESOURCE: 'New learning resources and materials',
    GAMIFICATION: 'Points earned, level ups, and leaderboard changes',
    AI_RECOMMENDATION: 'Personalized AI-generated study suggestions',
    GENERAL: 'Miscellaneous platform notifications',
};

export function NotificationSettings() {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        enablePush: true,
        enableEmail: true,
        enableInApp: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        digest: {
            enabled: true,
            frequency: 'DAILY',
            time: '09:00',
        },
        categories: {
            SYSTEM: true,
            COURSE: true,
            ASSIGNMENT: true,
            DISCUSSION: true,
            PEER_MATCH: true,
            ACHIEVEMENT: true,
            REMINDER: true,
            COLLABORATION: true,
            RESOURCE: true,
            GAMIFICATION: true,
            AI_RECOMMENDATION: true,
            GENERAL: true,
        },
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const { toast } = useToast();

    useEffect(() => {
        fetchPreferences();
        checkPushSupport();
    }, []);

    const checkPushSupport = () => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setPushSupported(true);
            setPushPermission(Notification.permission);
        }
    };

    const fetchPreferences = async () => {
        try {
            const response = await fetch('/api/notifications/preferences');
            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
            toast({
                title: 'Error',
                description: 'Failed to load notification preferences',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences),
            });

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Notification preferences saved successfully',
                });
            } else {
                throw new Error('Failed to save preferences');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            toast({
                title: 'Error',
                description: 'Failed to save notification preferences',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const requestPushPermission = async () => {
        if (!pushSupported) {
            toast({
                title: 'Not Supported',
                description: 'Push notifications are not supported in your browser',
                variant: 'destructive',
            });
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPushPermission(permission);

            if (permission === 'granted') {
                // Subscribe to push notifications
                const response = await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    toast({
                        title: 'Success',
                        description: 'Push notifications enabled successfully',
                    });
                    setPreferences(prev => ({ ...prev, enablePush: true }));
                }
            } else if (permission === 'denied') {
                toast({
                    title: 'Permission Denied',
                    description: 'Push notifications have been blocked. Please enable them in your browser settings.',
                    variant: 'destructive',
                });
                setPreferences(prev => ({ ...prev, enablePush: false }));
            }
        } catch (error) {
            console.error('Error requesting push permission:', error);
            toast({
                title: 'Error',
                description: 'Failed to enable push notifications',
                variant: 'destructive',
            });
        }
    };

    const updatePreference = (key: string, value: any) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const updateDigestPreference = (key: string, value: any) => {
        setPreferences(prev => ({
            ...prev,
            digest: {
                ...prev.digest,
                [key]: value,
            },
        }));
    };

    const updateCategoryPreference = (category: string, enabled: boolean) => {
        setPreferences(prev => ({
            ...prev,
            categories: {
                ...prev.categories,
                [category]: enabled,
            },
        }));
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Notification Settings
                    </CardTitle>
                    <CardDescription>
                        Customize how you receive notifications across StudyHub
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Delivery Methods */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Delivery Methods</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        <Label htmlFor="push-notifications">Push Notifications</Label>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Receive notifications directly on your device
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {pushPermission !== 'granted' && pushSupported && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={requestPushPermission}
                                        >
                                            Enable
                                        </Button>
                                    )}
                                    <Switch
                                        id="push-notifications"
                                        checked={preferences.enablePush && pushPermission === 'granted'}
                                        onCheckedChange={(checked) => {
                                            if (checked && pushPermission !== 'granted') {
                                                requestPushPermission();
                                            } else {
                                                updatePreference('enablePush', checked);
                                            }
                                        }}
                                        disabled={!pushSupported || (preferences.enablePush && pushPermission !== 'granted')}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <Label htmlFor="email-notifications">Email Notifications</Label>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Receive notifications via email
                                    </p>
                                </div>
                                <Switch
                                    id="email-notifications"
                                    checked={preferences.enableEmail}
                                    onCheckedChange={(checked) => updatePreference('enableEmail', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4" />
                                        <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Show notifications within the StudyHub app
                                    </p>
                                </div>
                                <Switch
                                    id="in-app-notifications"
                                    checked={preferences.enableInApp}
                                    onCheckedChange={(checked) => updatePreference('enableInApp', checked)}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Quiet Hours */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Quiet Hours</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Pause non-urgent notifications during specified hours
                                    </p>
                                </div>
                                <Switch
                                    id="quiet-hours"
                                    checked={preferences.quietHoursEnabled}
                                    onCheckedChange={(checked) => updatePreference('quietHoursEnabled', checked)}
                                />
                            </div>

                            {preferences.quietHoursEnabled && (
                                <div className="grid grid-cols-2 gap-4 ml-6">
                                    <div>
                                        <Label htmlFor="quiet-start">Start Time</Label>
                                        <Input
                                            id="quiet-start"
                                            type="time"
                                            value={preferences.quietHoursStart}
                                            onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="quiet-end">End Time</Label>
                                        <Input
                                            id="quiet-end"
                                            type="time"
                                            value={preferences.quietHoursEnd}
                                            onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Digest Settings */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Email Digest</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label htmlFor="digest-enabled">Enable Email Digest</Label>
                                    <p className="text-sm text-gray-500">
                                        Receive a summary of your notifications via email
                                    </p>
                                </div>
                                <Switch
                                    id="digest-enabled"
                                    checked={preferences.digest.enabled}
                                    onCheckedChange={(checked) => updateDigestPreference('enabled', checked)}
                                />
                            </div>

                            {preferences.digest.enabled && (
                                <div className="grid grid-cols-2 gap-4 ml-6">
                                    <div>
                                        <Label htmlFor="digest-frequency">Frequency</Label>
                                        <Select
                                            value={preferences.digest.frequency}
                                            onValueChange={(value) => updateDigestPreference('frequency', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DAILY">Daily</SelectItem>
                                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="digest-time">Time</Label>
                                        <Input
                                            id="digest-time"
                                            type="time"
                                            value={preferences.digest.time}
                                            onChange={(e) => updateDigestPreference('time', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Category Preferences */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Notification Categories</h3>
                        <div className="space-y-3">
                            {Object.entries(categoryLabels).map(([category, label]) => (
                                <div key={category} className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor={`category-${category}`}>{label}</Label>
                                        <p className="text-sm text-gray-500">
                                            {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                                        </p>
                                    </div>
                                    <Switch
                                        id={`category-${category}`}
                                        checked={preferences.categories[category as keyof typeof preferences.categories]}
                                        onCheckedChange={(checked) => updateCategoryPreference(category, checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button onClick={savePreferences} disabled={saving}>
                            {saving ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Preferences
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default NotificationSettings;