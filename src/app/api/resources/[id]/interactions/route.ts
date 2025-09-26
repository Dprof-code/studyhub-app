import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { awardActivityPoints } from '@/lib/gamification';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { resourceId, interactionType } = await req.json();

        if (!resourceId || !interactionType) {
            return NextResponse.json(
                { error: 'resourceId and interactionType are required' },
                { status: 400 }
            );
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Record the interaction in activity log
        await db.activityLog.create({
            data: {
                userId: user.id,
                activityType: interactionType === 'view' ? 'RESOURCE_UPLOAD' : 'RESOURCE_COMMENT', // Map to existing activity types
                description: `${interactionType} resource`,
                resourceId: resourceId,
                metadata: {
                    interactionType,
                    timestamp: new Date().toISOString()
                }
            }
        });

        // Award points for meaningful interactions
        if (interactionType === 'download') {
            await awardActivityPoints(user.id, 'RESOURCE_UPLOAD', {
                resourceId
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking interaction:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}