import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';
import { getIO } from '@/lib/socketio';

const updatePostSchema = z.object({
    content: z.string().min(1),
});

export async function PATCH(
    req: Request,
    { params }: { params: { code: string; threadId: string; postId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { content } = updatePostSchema.parse(body);

        const post = await db.post.findUnique({
            where: { id: parseInt(params.postId) },
            include: { author: true },
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.author.email !== session.user.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const updatedPost = await db.post.update({
            where: { id: parseInt(params.postId) },
            data: { content },
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
            },
        });

        // Emit socket event for real-time updates
        const io = getIO();
        if (io) {
            io.to(`thread-${params.threadId}`).emit('update-post', updatedPost);
        }

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { code: string; threadId: string; postId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const post = await db.post.findUnique({
            where: { id: parseInt(params.postId) },
            include: { author: true },
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.author.email !== session.user.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        await db.post.delete({
            where: { id: parseInt(params.postId) },
        });

        // Emit socket event for real-time updates
        const io = getIO();
        if (io) {
            io.to(`thread-${params.threadId}`).emit('delete-post', parseInt(params.postId));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}