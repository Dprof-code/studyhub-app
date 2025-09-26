import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category') || 'overall';
        const period = url.searchParams.get('period') || 'current';
        const departmentId = url.searchParams.get('departmentId');
        const limit = parseInt(url.searchParams.get('limit') || '10');

        const whereClause: any = {
            category,
            period
        };

        if (departmentId && departmentId !== 'all') {
            whereClause.departmentId = parseInt(departmentId);
        }

        const leaderboard = await db.leaderboardEntry.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                        department: {
                            select: {
                                name: true,
                                code: true
                            }
                        }
                    }
                },
                department: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: {
                rank: 'asc'
            },
            take: limit
        });

        return NextResponse.json({
            leaderboard,
            category,
            period,
            departmentId: departmentId || null
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Recalculate leaderboard (admin only)
export async function POST(_request: NextRequest) {
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

        await recalculateLeaderboards();

        return NextResponse.json({
            success: true,
            message: 'Leaderboards recalculated successfully'
        });

    } catch (error) {
        console.error('Error recalculating leaderboards:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Recalculate all leaderboard entries
 */
async function recalculateLeaderboards() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Overall leaderboard
    await calculateOverallLeaderboard();

    // Weekly leaderboard
    await calculatePeriodLeaderboard('weekly', startOfWeek);

    // Monthly leaderboard
    await calculatePeriodLeaderboard('monthly', startOfMonth);

    // Department leaderboards
    await calculateDepartmentLeaderboards();
}

async function calculateOverallLeaderboard() {
    const users = await db.userStats.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    departmentId: true
                }
            }
        },
        orderBy: {
            reputationScore: 'desc'
        }
    });

    // Clear existing overall leaderboard
    await db.leaderboardEntry.deleteMany({
        where: {
            category: 'overall',
            period: 'current'
        }
    });

    // Create new entries
    const entries = users.map((userStat, index) => ({
        userId: userStat.userId,
        category: 'overall',
        period: 'current',
        score: userStat.reputationScore,
        rank: index + 1,
        departmentId: userStat.user.departmentId
    }));

    await db.leaderboardEntry.createMany({
        data: entries
    });
}

async function calculatePeriodLeaderboard(period: 'weekly' | 'monthly', startDate: Date) {
    const activities = await db.activityLog.findMany({
        where: {
            createdAt: {
                gte: startDate
            }
        }
    });

    const userScores = activities.reduce((acc, activity) => {
        acc[activity.userId] = (acc[activity.userId] || 0) + activity.reputationGained;
        return acc;
    }, {} as Record<number, number>);

    const sortedUsers = Object.entries(userScores)
        .map(([userId, score]) => ({ userId: parseInt(userId), score }))
        .sort((a, b) => b.score - a.score);

    // Clear existing period leaderboard
    await db.leaderboardEntry.deleteMany({
        where: {
            category: period,
            period: 'current'
        }
    });

    // Get user department info
    const users = await db.user.findMany({
        where: {
            id: { in: sortedUsers.map(u => u.userId) }
        },
        select: {
            id: true,
            departmentId: true
        }
    });

    const userDepartments = users.reduce((acc, user) => {
        acc[user.id] = user.departmentId;
        return acc;
    }, {} as Record<number, number | null>);

    const entries = sortedUsers.map((user, index) => ({
        userId: user.userId,
        category: period,
        period: 'current',
        score: user.score,
        rank: index + 1,
        departmentId: userDepartments[user.userId]
    }));

    await db.leaderboardEntry.createMany({
        data: entries
    });
}

async function calculateDepartmentLeaderboards() {
    const departments = await db.department.findMany();

    for (const dept of departments) {
        const users = await db.userStats.findMany({
            where: {
                user: {
                    departmentId: dept.id
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        departmentId: true
                    }
                }
            },
            orderBy: {
                reputationScore: 'desc'
            }
        });

        // Clear existing department leaderboard
        await db.leaderboardEntry.deleteMany({
            where: {
                category: 'department',
                period: 'current',
                departmentId: dept.id
            }
        });

        const entries = users.map((userStat, index) => ({
            userId: userStat.userId,
            category: 'department',
            period: 'current',
            score: userStat.reputationScore,
            rank: index + 1,
            departmentId: dept.id
        }));

        if (entries.length > 0) {
            await db.leaderboardEntry.createMany({
                data: entries
            });
        }
    }
}