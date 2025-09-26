import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';
import { recommendationEngine } from '@/lib/recommendations';

// This endpoint can be called by a cron job to update user recommendations
export async function POST(req: Request) {
    try {
        // Verify this is being called by an authorized source
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all active users (users who have interacted in the last 30 days)
        const recentUsers = await db.user.findMany({
            where: {
                activityLogs: {
                    some: {
                        createdAt: {
                            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
                        }
                    }
                }
            },
            select: { id: true },
            take: 100 // Limit to prevent timeout
        });

        const updatePromises = recentUsers.map(async (user) => {
            try {
                // Generate fresh recommendations for each user
                const recommendations = await recommendationEngine.generateRecommendations(user.id, 50);

                // Store recommendations in database (you might want to create a UserRecommendation model)
                // For now, we'll just log them or store in Redis if available
                console.log(`Updated recommendations for user ${user.id}: ${recommendations.length} items`);

                return { userId: user.id, count: recommendations.length };
            } catch (error) {
                console.error(`Failed to update recommendations for user ${user.id}:`, error);
                return { userId: user.id, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        const results = await Promise.all(updatePromises);

        const successful = results.filter(r => !r.error).length;
        const failed = results.filter(r => r.error).length;

        return NextResponse.json({
            message: `Recommendation update completed`,
            successful,
            failed,
            totalUsers: recentUsers.length
        });

    } catch (error) {
        console.error('Error in recommendation update job:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Optional: Add a GET endpoint for manual testing
export async function GET() {
    return NextResponse.json({
        message: 'Recommendation update endpoint is working',
        timestamp: new Date().toISOString()
    });
}