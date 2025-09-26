import { db } from '@/lib/dbconfig';

/**
 * Auto-enroll a user in courses based on their department and level
 * This is typically called when a user first completes their profile
 */
export async function autoEnrollUserBasedOnProfile(userId: number) {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                department: true,
                enrollments: {
                    where: {
                        status: {
                            in: ['ACTIVE', 'PENDING']
                        }
                    },
                    select: {
                        courseId: true
                    }
                }
            }
        });

        if (!user || !user.level || !user.departmentId) {
            return {
                success: false,
                message: 'User level and department are required for auto-enrollment'
            };
        }

        // Get currently enrolled course IDs
        const enrolledCourseIds = user.enrollments.map(e => e.courseId);

        // Find popular courses for this user's cohort
        const popularCourses = await db.course.findMany({
            where: {
                AND: [
                    { departmentId: user.departmentId },
                    {
                        level: {
                            lte: user.level * 100 + 99, // e.g., for 500L, include up to 599
                            gte: Math.max(100, (user.level - 1) * 100) // e.g., for 500L, include from 400L
                        }
                    },
                    {
                        id: {
                            notIn: enrolledCourseIds
                        }
                    },
                    {
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
                    }
                ]
            },
            include: {
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
            },
            orderBy: {
                enrollments: {
                    _count: 'desc'
                }
            },
            take: 8 // Limit to top 8 most popular courses
        });

        if (popularCourses.length === 0) {
            return {
                success: true,
                message: 'No additional courses found for auto-enrollment',
                enrollments: []
            };
        }

        // Create enrollments for popular courses
        const newEnrollments = await Promise.all(
            popularCourses.map(course =>
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

        return {
            success: true,
            message: `Successfully auto-enrolled in ${newEnrollments.length} courses`,
            enrollments: newEnrollments,
            basedOn: {
                department: user.department?.name,
                level: user.level,
                totalAvailable: popularCourses.length
            }
        };

    } catch (error) {
        console.error('Error in auto-enrollment:', error);
        return {
            success: false,
            message: 'Failed to auto-enroll user',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get course enrollment statistics for a department/level combination
 */
export async function getCourseEnrollmentStats(departmentId: number, level: number) {
    try {
        const stats = await db.course.findMany({
            where: {
                departmentId,
                level: {
                    lte: level * 100 + 99,
                    gte: Math.max(100, (level - 1) * 100)
                }
            },
            include: {
                _count: {
                    select: {
                        enrollments: {
                            where: {
                                user: {
                                    departmentId,
                                    level
                                },
                                status: {
                                    in: ['ACTIVE', 'COMPLETED']
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                enrollments: {
                    _count: 'desc'
                }
            }
        });

        return {
            success: true,
            stats: stats.map(course => ({
                id: course.id,
                code: course.code,
                title: course.title,
                enrollmentCount: course._count.enrollments
            }))
        };

    } catch (error) {
        console.error('Error getting enrollment stats:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}