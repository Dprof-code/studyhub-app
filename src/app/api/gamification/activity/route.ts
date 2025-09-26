import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// import { db } from '@/lib/dbconfig';
import { awardActivityPoints } from '@/lib/gamification';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { activityType, metadata } = await req.json();

        if (!activityType) {
            return NextResponse.json(
                { error: 'Activity type is required' },
                { status: 400 }
            );
        }

        // Record the activity and get results
        const result = await awardActivityPoints(
            parseInt(session.user.id),
            activityType,
            metadata || {}
        );

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error recording activity:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}