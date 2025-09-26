import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/dbconfig";
import { z } from "zod";

const courseSchema = z.object({
    code: z.string().regex(/^[A-Z]{3,4}\s?\d{3}$/),
    title: z.string().min(3).max(100),
    synopsis: z.string().min(10),
    faculty: z.object({
        name: z.string().min(2),
        id: z.number().optional()
    }),
    department: z.object({
        name: z.string().min(2),
        id: z.number().optional()
    }),
}).transform((data) => {
    // Extract level from course code (e.g., CSC101 -> 100)
    const match = data.code.match(/\d{3}/);
    if (!match) {
        throw new Error('Invalid course code format');
    }

    const level = parseInt(match[0].charAt(0)) * 100;

    return {
        ...data,
        level
    };
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = courseSchema.parse(body);

        // Check if course code already exists
        const existingCourse = await db.course.findUnique({
            where: { code: validatedData.code },
        });

        if (existingCourse) {
            return NextResponse.json(
                { error: 'Course code already exists' },
                { status: 400 }
            );
        }

        // Find or create faculty
        let faculty = await db.faculty.findFirst({
            where: {
                name: {
                    equals: validatedData.faculty.name,
                    mode: 'insensitive',
                },
            },
        });

        if (!faculty) {
            faculty = await db.faculty.create({
                data: {
                    name: validatedData.faculty.name,
                },
            });
        }

        // Find or create department
        let department = await db.department.findFirst({
            where: {
                AND: [
                    {
                        name: {
                            equals: validatedData.department.name,
                            mode: 'insensitive',
                        },
                    },
                    { facultyId: faculty.id },
                ],
            },
        });

        if (!department) {
            department = await db.department.create({
                data: {
                    name: validatedData.department.name,
                    code: validatedData.department.name.substring(0, 3).toUpperCase(),
                    facultyId: faculty.id,
                },
            });
        }

        const course = await db.course.create({
            data: {
                code: validatedData.code,
                title: validatedData.title,
                synopsis: validatedData.synopsis,
                departmentId: department.id,
                level: validatedData.level,
            },
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const department = searchParams.get('department');
        const level = searchParams.get('level');

        // Get current user if logged in
        let currentUser = null;
        if (session?.user) {
            currentUser = await db.user.findUnique({
                where: { email: session.user.email! },
                select: { id: true }
            });
        }

        const courses = await db.course.findMany({
            where: {
                AND: [
                    search ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { code: { contains: search, mode: 'insensitive' } },
                        ],
                    } : {},
                    department ? {
                        department: {
                            code: department
                        }
                    } : {},
                    level ? {
                        level: parseInt(level)
                    } : {},
                ],
            },
            include: {
                department: {
                    select: {
                        name: true,
                        code: true,
                    },
                },
                _count: {
                    select: {
                        resources: true,
                        enrollments: {
                            where: {
                                status: 'ACTIVE'
                            }
                        }
                    }
                },
                enrollments: currentUser ? {
                    where: {
                        userId: currentUser.id
                    },
                    select: {
                        status: true,
                        isAutoEnrolled: true
                    }
                } : false
            },
            orderBy: [
                { level: 'asc' },
                { code: 'asc' },
            ],
        });

        // Transform the data to include enrollment status
        const transformedCourses = courses.map(course => ({
            ...course,
            studentCount: course._count.enrollments,
            resourceCount: course._count.resources,
            isEnrolled: course.enrollments && course.enrollments.length > 0,
            enrollmentStatus: course.enrollments?.[0]?.status || null,
            isAutoEnrolled: course.enrollments?.[0]?.isAutoEnrolled || false,
            enrollments: undefined, // Remove from response
            _count: undefined // Remove from response
        }));

        return NextResponse.json(transformedCourses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch courses' },
            { status: 500 }
        );
    }
}