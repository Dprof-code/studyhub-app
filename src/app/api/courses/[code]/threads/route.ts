import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const threads = await db.thread.findMany({
            where: {
                course: {
                    code: code,
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
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
            orderBy: [
                { isStickied: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        return NextResponse.json(threads);
    } catch (error) {
        console.error('Error fetching threads:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { title, content } = body;

        const course = await db.course.findUnique({
            where: { code: code },
        });

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const thread = await db.thread.create({
            data: {
                title,
                courseId: course.id,
                authorId: user.id,
                posts: {
                    create: {
                        content,
                        authorId: user.id,
                    },
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
                },
            },
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error('Error creating thread:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}