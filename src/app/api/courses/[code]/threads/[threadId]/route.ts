import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: Request,
    { params }: { params: { code: string; threadId: string } }
) {
    try {
        const thread = await db.thread.findFirst({
            where: {
                id: parseInt(params.threadId),
                course: {
                    code: params.code,
                },
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                posts: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                firstname: true,
                                lastname: true,
                                avatarUrl: true,
                            },
                        },
                        reactions: {
                            select: {
                                type: true,
                                userId: true,
                            },
                        },
                        _count: {
                            select: {
                                reactions: true,
                            },
                        },
                    },
                },
            },
        });

        if (!thread) {
            return NextResponse.json(
                { error: 'Thread not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(thread);
    } catch (error) {
        console.error('Error fetching thread:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}