'use client';

import { useEffect } from 'react';
import { useGamification } from '@/hooks/useGamification';

interface ActivityTrackerProps {
    activity: string;
    metadata?: any;
    triggerOn?: 'mount' | 'unmount' | 'both';
    delay?: number;
}

export default function ActivityTracker({
    activity,
    metadata,
    triggerOn = 'mount',
    delay = 0
}: ActivityTrackerProps) {
    const { recordActivity } = useGamification();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const trackActivity = async () => {
            try {
                await recordActivity(activity, metadata);
            } catch (error) {
                // Silently fail - don't interrupt user experience
                console.debug('Activity tracking failed:', error);
            }
        };

        if (triggerOn === 'mount' || triggerOn === 'both') {
            if (delay > 0) {
                timeoutId = setTimeout(trackActivity, delay);
            } else {
                trackActivity();
            }
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (triggerOn === 'unmount' || triggerOn === 'both') {
                trackActivity();
            }
        };
    }, [activity, metadata, triggerOn, delay, recordActivity]);

    return null; // This component renders nothing
}

// Helper function to create activity tracker easily
export function trackActivity(activity: string, metadata?: any) {
    return <ActivityTracker activity={activity} metadata={metadata} />;
}

// Specific activity trackers for common use cases
export function TrackPageView({ page, delay = 2000 }: { page: string; delay?: number }) {
    return (
        <ActivityTracker
            activity="PAGE_VIEW"
            metadata={{ page }}
            delay={delay}
        />
    );
}

export function TrackResourceView({ resourceId, delay = 5000 }: { resourceId: number; delay?: number }) {
    return (
        <ActivityTracker
            activity="RESOURCE_VIEW"
            metadata={{ resourceId }}
            delay={delay}
        />
    );
}

export function TrackDiscussionView({ discussionId, delay = 3000 }: { discussionId: number; delay?: number }) {
    return (
        <ActivityTracker
            activity="DISCUSSION_VIEW"
            metadata={{ discussionId }}
            delay={delay}
        />
    );
}