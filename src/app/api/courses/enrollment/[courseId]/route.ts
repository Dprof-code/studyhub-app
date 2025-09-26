import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
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

        const { courseId } = await params;
        const courseIdNum = parseInt(courseId);

        // Find the enrollment
        const enrollment = await db.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: courseIdNum
                }
            },
            include: {
                course: true
            }
        });

        if (!enrollment) {
            return NextResponse.json(
                { error: 'Not enrolled in this course' },
                { status: 404 }
            );
        }

        // Update enrollment status to DROPPED instead of deleting
        const updatedEnrollment = await db.enrollment.update({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: courseIdNum
                }
            },
            data: {
                status: 'DROPPED'
            },
            include: {
                course: true
            }
        });

        return NextResponse.json({
            message: 'Successfully dropped from course',
            enrollment: updatedEnrollment
        });

    } catch (error) {
        console.error('Error dropping course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Re-enroll in a dropped course
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
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

        const { courseId } = await params;
        const courseIdNum = parseInt(courseId);

        // Find the enrollment
        const enrollment = await db.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: courseIdNum
                }
            }
        });

        if (!enrollment) {
            return NextResponse.json(
                { error: 'No enrollment record found' },
                { status: 404 }
            );
        }

        if (enrollment.status === 'ACTIVE') {
            return NextResponse.json(
                { error: 'Already actively enrolled in this course' },
                { status: 400 }
            );
        }

        // Re-activate enrollment
        const updatedEnrollment = await db.enrollment.update({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: courseIdNum
                }
            },
            data: {
                status: 'ACTIVE'
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
            message: 'Successfully re-enrolled in course',
            enrollment: updatedEnrollment
        });

    } catch (error) {
        console.error('Error re-enrolling in course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}