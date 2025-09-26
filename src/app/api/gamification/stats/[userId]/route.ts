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
        // const session = await getServerSession(authOptions);

        // Allow users to view their own stats or public stats
        const targetUserId = parseInt(userId);

        if (isNaN(targetUserId)) {
            return NextResponse.json(
                { error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        // Get user stats
        const userStats = await db.userStats.findUnique({
            where: { userId: targetUserId },
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
                                id: true,
                                name: true,
                                code: true
                            }
                        }
                    }
                }
            }
        });

        if (!userStats) {
            // Create default stats if they don't exist
            const newStats = await db.userStats.create({
                data: { userId: targetUserId },
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
                                    id: true,
                                    name: true,
                                    code: true
                                }
                            }
                        }
                    }
                }
            });

            return NextResponse.json(newStats);
        }

        return NextResponse.json(userStats);

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}