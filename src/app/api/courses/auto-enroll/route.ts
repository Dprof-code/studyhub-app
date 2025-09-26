import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
            include: {
                department: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.level || !user.departmentId) {
            return NextResponse.json(
                { error: 'User level and department are required for auto-enrollment' },
                { status: 400 }
            );
        }

        // Find courses commonly taken by students in the same department and level
        const recommendedCourses = await db.course.findMany({
            where: {
                departmentId: user.departmentId,
                level: {
                    lte: user.level * 100 + 99, // e.g., for 500L, include courses up to 599
                    gte: user.level * 100 - 99  // e.g., for 500L, include courses from 401
                },
                enrollments: {
                    some: {
                        user: {
                            departmentId: user.departmentId,
                            level: user.level
                        },
                        status: {
                            in: ['ACTIVE', 'COMPLETED']
                        }
                    }
                }
            },
            include: {
                department: true,
                _count: {
                    select: {
                        enrollments: {
                            where: {
                                user: {
                                    departmentId: user.departmentId,
                                    level: user.level
                                },
                                status: {
                                    in: ['ACTIVE', 'COMPLETED']
                                }
                            }
                        }
                    }
                }
            }
        });

        // Sort by popularity (number of similar students enrolled)
        const sortedCourses = recommendedCourses.sort((a, b) =>
            b._count.enrollments - a._count.enrollments
        );

        // Get user's current enrollments to avoid duplicates
        const currentEnrollments = await db.enrollment.findMany({
            where: {
                userId: user.id,
                status: {
                    in: ['ACTIVE', 'PENDING']
                }
            },
            select: {
                courseId: true
            }
        });

        const enrolledCourseIds = currentEnrollments.map(e => e.courseId);

        // Filter out courses already enrolled in
        const coursesToEnroll = sortedCourses.filter(course =>
            !enrolledCourseIds.includes(course.id)
        );

        const body = await request.json();
        const maxEnrollments = body.maxEnrollments || 10; // Default to 10 courses

        const selectedCourses = coursesToEnroll.slice(0, maxEnrollments);

        if (selectedCourses.length === 0) {
            return NextResponse.json({
                message: 'No new courses available for auto-enrollment',
                enrollments: []
            });
        }

        // Create enrollments
        const enrollments = await Promise.all(
            selectedCourses.map(course =>
                db.enrollment.create({
                    data: {
                        userId: user.id,
                        courseId: course.id,
                        status: 'ACTIVE',
                        isAutoEnrolled: true
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
                })
            )
        );

        return NextResponse.json({
            message: `Successfully auto-enrolled in ${enrollments.length} courses`,
            enrollments,
            basedOn: {
                department: user.department?.name,
                level: user.level,
                totalRecommendations: coursesToEnroll.length
            }
        });

    } catch (error) {
        console.error('Error in auto-enrollment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get recommended courses for a user (without enrolling)
export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
            include: {
                department: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.level || !user.departmentId) {
            return NextResponse.json({
                recommendations: [],
                message: 'User level and department are required for recommendations'
            });
        }

        // Find courses commonly taken by students in the same department and level
        const recommendedCourses = await db.course.findMany({
            where: {
                departmentId: user.departmentId,
                level: {
                    lte: user.level * 100 + 99,
                    gte: user.level * 100 - 99
                },
                enrollments: {
                    some: {
                        user: {
                            departmentId: user.departmentId,
                            level: user.level
                        },
                        status: {
                            in: ['ACTIVE', 'COMPLETED']
                        }
                    }
                }
            },
            include: {
                department: {
                    include: {
                        faculty: true
                    }
                },
                _count: {
                    select: {
                        enrollments: {
                            where: {
                                user: {
                                    departmentId: user.departmentId,
                                    level: user.level
                                },
                                status: {
                                    in: ['ACTIVE', 'COMPLETED']
                                }
                            }
                        },
                        resources: true
                    }
                }
            }
        });

        // Get user's current enrollments
        const currentEnrollments = await db.enrollment.findMany({
            where: {
                userId: user.id,
                status: {
                    in: ['ACTIVE', 'PENDING']
                }
            },
            select: {
                courseId: true
            }
        });

        const enrolledCourseIds = currentEnrollments.map(e => e.courseId);

        // Filter and sort recommendations
        const recommendations = recommendedCourses
            .filter(course => !enrolledCourseIds.includes(course.id))
            .sort((a, b) => b._count.enrollments - a._count.enrollments)
            .map(course => ({
                ...course,
                popularity: course._count.enrollments,
                resourceCount: course._count.resources
            }));

        return NextResponse.json({
            recommendations,
            basedOn: {
                department: user.department?.name,
                level: user.level,
                totalStudentsInCohort: await db.user.count({
                    where: {
                        departmentId: user.departmentId,
                        level: user.level
                    }
                })
            }
        });

    } catch (error) {
        console.error('Error getting course recommendations:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}