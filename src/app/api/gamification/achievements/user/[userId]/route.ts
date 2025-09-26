import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const targetUserId = parseInt(userId);

        if (isNaN(targetUserId)) {
            return NextResponse.json(
                { error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        const userAchievements = await db.userAchievement.findMany({
            where: {
                userId: targetUserId,
                unlockedAt: { not: null }
            },
            include: {
                achievement: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        category: true,
                        tier: true,
                        iconUrl: true,
                        xpReward: true,
                        reputationReward: true,
                        isSecret: true
                    }
                }
            },
            orderBy: {
                unlockedAt: 'desc'
            }
        });

        const achievementProgress = await db.userAchievement.findMany({
            where: {
                userId: targetUserId,
                unlockedAt: null,
                progress: { gt: 0 }
            },
            include: {
                achievement: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        category: true,
                        tier: true,
                        iconUrl: true,
                        requiredActions: true,
                        isSecret: true
                    }
                }
            },
            orderBy: {
                progress: 'desc'
            }
        });

        return NextResponse.json({
            unlockedAchievements: userAchievements,
            progressAchievements: achievementProgress,
            totalUnlocked: userAchievements.length,
            totalInProgress: achievementProgress.length
        });

    } catch (error) {
        console.error('Error fetching user achievements:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}