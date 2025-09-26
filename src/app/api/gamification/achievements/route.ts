import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');
        const userId = url.searchParams.get('userId');

        const whereClause: any = {
            isActive: true
        };

        if (category && category !== 'all') {
            whereClause.category = category.toUpperCase();
        }

        const achievements = await db.achievement.findMany({
            where: whereClause,
            include: {
                userAchievements: userId ? {
                    where: {
                        userId: parseInt(userId)
                    }
                } : false
            },
            orderBy: [
                { category: 'asc' },
                { tier: 'asc' },
                { id: 'asc' }
            ]
        });

        return NextResponse.json({
            achievements: achievements.map(achievement => ({
                ...achievement,
                userProgress: userId && achievement.userAchievements ? achievement.userAchievements[0] : null
            }))
        });

    } catch (error) {
        console.error('Error fetching achievements:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Create new achievement (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const user = await db.user.findUnique({
            where: { id: parseInt(session.user.id) }
        });

        if (user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            name,
            description,
            category,
            tier = 'BRONZE',
            iconUrl,
            xpReward = 0,
            reputationReward = 0,
            requiredActions,
            isSecret = false,
            isSeasonal = false,
            seasonStartDate,
            seasonEndDate,
            parentId
        } = body;

        const achievement = await db.achievement.create({
            data: {
                name,
                description,
                category: category.toUpperCase(),
                tier: tier.toUpperCase(),
                iconUrl,
                xpReward,
                reputationReward,
                requiredActions,
                isSecret,
                isSeasonal,
                seasonStartDate: seasonStartDate ? new Date(seasonStartDate) : null,
                seasonEndDate: seasonEndDate ? new Date(seasonEndDate) : null,
                parentId
            }
        });

        return NextResponse.json({
            success: true,
            achievement
        });

    } catch (error) {
        console.error('Error creating achievement:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}