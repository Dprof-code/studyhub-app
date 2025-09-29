/**
 * Notification Preferences API Route
 * Phase 7: User notification preferences management
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notificationService';

export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const preferences = await notificationService.getPreferences(userId);

        return NextResponse.json({
            success: true,
            preferences,
        });
    } catch (error) {
        console.error('[Notification Preferences API] GET error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch notification preferences',
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

        // Validate preferences data
        const allowedFields = [
            'emailEnabled',
            'pushEnabled',
            'inAppEnabled',
            'typePreferences',
            'quietHoursStart',
            'quietHoursEnd',
            'timezone',
            'digestEnabled',
            'digestFrequency',
            'digestTime',
            'batchingEnabled',
            'batchingDelay',
        ];

        const preferences: any = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                preferences[field] = body[field];
            }
        }

        // Validate time formats
        if (preferences.quietHoursStart && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHoursStart)) {
            return NextResponse.json(
                { success: false, error: 'Invalid quietHoursStart format. Use HH:MM' },
                { status: 400 }
            );
        }

        if (preferences.quietHoursEnd && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHoursEnd)) {
            return NextResponse.json(
                { success: false, error: 'Invalid quietHoursEnd format. Use HH:MM' },
                { status: 400 }
            );
        }

        if (preferences.digestTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.digestTime)) {
            return NextResponse.json(
                { success: false, error: 'Invalid digestTime format. Use HH:MM' },
                { status: 400 }
            );
        }

        // Validate digest frequency
        if (preferences.digestFrequency && !['daily', 'weekly'].includes(preferences.digestFrequency)) {
            return NextResponse.json(
                { success: false, error: 'Invalid digestFrequency. Must be "daily" or "weekly"' },
                { status: 400 }
            );
        }

        // Validate batching delay
        if (preferences.batchingDelay !== undefined && (preferences.batchingDelay < 0 || preferences.batchingDelay > 3600)) {
            return NextResponse.json(
                { success: false, error: 'Invalid batchingDelay. Must be between 0 and 3600 seconds' },
                { status: 400 }
            );
        }

        const result = await notificationService.updatePreferences(userId, preferences);

        return NextResponse.json({
            success: true,
            preferences: {
                ...result,
                typePreferences: JSON.parse(result.typePreferences as string),
            },
        });
    } catch (error) {
        console.error('[Notification Preferences API] PATCH error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update notification preferences',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            },
            { status: 500 }
        );
    }
}