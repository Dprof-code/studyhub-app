import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { recommendationEngine } from '@/lib/recommendations';
import { db } from '@/lib/dbconfig';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const user = await db.user.findUnique({
            where: { email: session.user.email! }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate personalized recommendations
        const recommendedIds = await recommendationEngine.generateRecommendations(user.id, limit);

        // Fetch full resource details
        const recommendations = await db.resource.findMany({
            where: { id: { in: recommendedIds } },
            include: {
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                },
                uploader: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Sort recommendations in the order returned by the algorithm
        const sortedRecommendations = recommendedIds
            .map(id => recommendations.find(r => r.id === id))
            .filter(Boolean);

        return NextResponse.json({
            recommendations: sortedRecommendations,
            total: sortedRecommendations.length
        });
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}