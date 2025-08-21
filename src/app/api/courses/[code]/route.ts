import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateCourseSchema = z.object({
    title: z.string().min(3),
    synopsis: z.string().min(10),
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const course = await db.course.findUnique({
            where: { code: code },
            include: {
                department: {
                    include: {
                        faculty: true,
                    },
                },
                synopsisHistory: {
                    include: {
                        user: {
                            select: {
                                firstname: true,
                                lastname: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                Thread: {
                    orderBy: [
                        { isStickied: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        author: {
                            select: {
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
                },
            },
        });

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // Use destructuring to exclude Thread
        const { Thread, ...courseWithoutThread } = course;
        const transformedCourse = {
            ...courseWithoutThread,
            threads: Thread,
        };

        return NextResponse.json(transformedCourse);
    } catch (error) {
        console.error('Error fetching course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
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
        const { title, synopsis } = updateCourseSchema.parse(body);

        const course = await db.course.update({
            where: { code: code },
            data: {
                title,
                synopsis,
                synopsisHistory: {
                    create: {
                        content: synopsis,
                        userId: Number(session.user.id),
                    },
                },
            },
            include: {
                department: {
                    include: {
                        faculty: true,
                    },
                },
                synopsisHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                firstname: true,
                                lastname: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                Thread: {
                    orderBy: [
                        { isStickied: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        author: {
                            select: {
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
                },
            },
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}