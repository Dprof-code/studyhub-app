import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const enrollmentSchema = z.object({
    courseId: z.number(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { courseId } = enrollmentSchema.parse(body);

        // Check if course exists
        const course = await db.course.findUnique({
            where: { id: courseId },
            include: { department: true }
        });

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Check if already enrolled
        const existingEnrollment = await db.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: courseId
                }
            }
        });

        if (existingEnrollment) {
            return NextResponse.json(
                { error: 'Already enrolled in this course' },
                { status: 400 }
            );
        }

        // Create enrollment
        const enrollment = await db.enrollment.create({
            data: {
                userId: user.id,
                courseId: courseId,
                status: 'ACTIVE',
                isAutoEnrolled: false
            },
            include: {
                course: {
                    include: {
                        department: {
                            include: {
                                faculty: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            message: 'Successfully enrolled in course',
            enrollment
        });

    } catch (error) {
        console.error('Error enrolling in course:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get user's enrollments
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get('status');

        const whereClause: any = {
            userId: user.id
        };

        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const enrollments = await db.enrollment.findMany({
            where: whereClause,
            include: {
                course: {
                    include: {
                        department: {
                            include: {
                                faculty: true
                            }
                        },
                        _count: {
                            select: {
                                resources: true,
                                enrollments: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { enrolledAt: 'desc' }
            ]
        });

        return NextResponse.json({ enrollments });

    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}