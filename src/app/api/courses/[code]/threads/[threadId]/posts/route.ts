import { NextResponse } from 'next/server';
import { getIO } from '@/lib/socketio';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const postSchema = z.object({
    content: z.string().min(1),
    parentId: z.number().nullable().optional(),
    attachments: z.array(z.string()).optional(),
});

export async function POST(
    req: Request,
    { params }: { params: { code: string; threadId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const thread = await db.thread.findFirst({
            where: {
                id: parseInt(params.threadId),
                course: {
                    code: params.code,
                },
            },
            select: { isLocked: true },
        });

        if (!thread) {
            return NextResponse.json(
                { error: 'Thread not found' },
                { status: 404 }
            );
        }

        if (thread.isLocked) {
            return NextResponse.json(
                { error: 'Thread is locked' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { content, parentId, attachments } = postSchema.parse(body);

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const post = await db.post.create({
            data: {
                content,
                parentId,
                threadId: parseInt(params.threadId),
                authorId: user.id,
                attachments: attachments || [],
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
                reactions: true,
                _count: {
                    select: {
                        reactions: true,
                    },
                },
            },
        });

        // Get Socket.IO instance and emit event
        const io = getIO();
        if (io) {
            io.to(`thread-${params.threadId}`).emit('new-post', post);
        }
        
        return NextResponse.json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}