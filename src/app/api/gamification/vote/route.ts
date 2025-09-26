import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { handleContentVote } from '@/lib/gamification';
import { z } from 'zod';

const VoteSchema = z.object({
    voteType: z.enum(['UPVOTE', 'HELPFUL', 'EXPERT_APPROVAL', 'QUALITY_CONTENT']),
    contentType: z.enum(['resource', 'post', 'comment']),
    contentId: z.number()
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { voteType, contentType, contentId } = VoteSchema.parse(body);

        const result = await handleContentVote(userId, voteType, contentType, contentId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error handling vote:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid vote data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const contentType = url.searchParams.get('contentType');
        const contentId = url.searchParams.get('contentId');

        if (!contentType || !contentId) {
            return NextResponse.json(
                { error: 'Missing contentType or contentId' },
                { status: 400 }
            );
        }

        const votes = await db.contentVote.findMany({
            where: {
                ...(contentType === 'resource' && { resourceId: parseInt(contentId) }),
                ...(contentType === 'post' && { postId: parseInt(contentId) }),
                ...(contentType === 'comment' && { commentId: parseInt(contentId) })
            },
            include: {
                voter: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Aggregate vote counts
        const voteCounts = votes.reduce((acc, vote) => {
            acc[vote.voteType] = (acc[vote.voteType] || 0) + vote.voteWeight;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            votes: votes.map(vote => ({
                id: vote.id,
                type: vote.voteType,
                weight: vote.voteWeight,
                voter: vote.voter,
                createdAt: vote.createdAt
            })),
            counts: voteCounts,
            total: votes.reduce((sum, vote) => sum + vote.voteWeight, 0)
        });

    } catch (error) {
        console.error('Error fetching votes:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}