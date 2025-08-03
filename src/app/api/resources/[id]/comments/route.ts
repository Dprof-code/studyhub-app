import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const commentSchema = z.object({
    content: z.string().min(1),
    resourceId: z.number(),
    parentId: z.number().optional(),
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const comments = await db.resourceComment.findMany({
            where: {
                resourceId: parseInt(params.id),
                parentId: null, // Only fetch top-level comments
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { content, resourceId, parentId } = commentSchema.parse(body);

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const comment = await db.resourceComment.create({
            data: {
                content,
                resourceId,
                authorId: user.id,
                parentId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return NextResponse.json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json(
            { error: 'Failed to create comment' },
            { status: 500 }
        );
    }
}