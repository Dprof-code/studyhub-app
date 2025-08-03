import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const resourceSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    courseId: z.number().optional(),
    courseName: z.string().optional(),
    tags: z.array(z.string()),
    fileUrl: z.string(),
    fileType: z.string(),
    year: z.number().optional(),
}).refine(data => data.courseId || data.courseName, {
    message: "Either courseId or courseName must be provided"
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const data = resourceSchema.parse(body);

        const user = await db.user.findUnique({
            where: { email: session.user.email! },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const resource = await db.resource.create({
            data: {
                title: data.title,
                description: data.description,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                courseId: data.courseId!,
                courseName: data.courseId ? undefined : data.courseName,
                uploaderId: user.id,
                tags: {
                    connectOrCreate: data.tags.map(tag => ({
                        where: { name: tag },
                        create: { name: tag },
                    })),
                },
                year: data?.year,
            },
        });

        return NextResponse.json(resource);
    } catch (error) {
        console.error('Error creating resource:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '12');
        const search = searchParams.get('search');
        const tags = searchParams.get('tags')?.split(',');
        const types = searchParams.get('types')?.split(',');
        const departments = searchParams.get('departments')?.split(',');
        const years = searchParams.get('years')?.split(',').map(Number);

        // Build the where clause based on filters
        const where: any = {};

        // Search filter
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { courseName: { contains: search, mode: 'insensitive' } },
                {
                    course: {
                        OR: [
                            { code: { contains: search, mode: 'insensitive' } },
                            { title: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }

        // Tags filter
        if (tags && tags.length > 0) {
            where.tags = {
                some: {
                    name: {
                        in: tags,
                    },
                },
            };
        }

        // Department filter
        if (departments && departments.length > 0) {
            where.course = {
                ...where.course,
                department: {
                    id: {
                        in: departments.map(Number)
                    }
                }
            };
        }

        // File type filter
        if (types && types.length > 0) {
            const typeFilters = types.map(type => {
                switch (type.toLowerCase()) {
                    case 'pdf':
                        return { fileType: { equals: 'application/pdf' } };
                    case 'word':
                        return {
                            fileType: {
                                in: [
                                    'application/msword',
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                ],
                            },
                        };
                    case 'powerpoint':
                        return {
                            fileType: {
                                in: [
                                    'application/vnd.ms-powerpoint',
                                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                                ],
                            },
                        };
                    case 'image':
                        return { fileType: { startsWith: 'image/' } };
                    default:
                        return {};
                }
            });
            where.OR = [...(where.OR || []), ...typeFilters];
        }

        // Year filter (only apply to resources tagged as past-questions)
        if (years && years.length > 0) {
            where.AND = [
                ...(where.AND || []),
                {
                    AND: [
                        { tags: { some: { name: 'past-question' } } },
                        { year: { in: years } }
                    ]
                }
            ];
        }

        // Get total count for pagination
        const total = await db.resource.count({ where });

        // Fetch resources with pagination and filters
        const resources = await db.resource.findMany({
            where,
            include: {
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                },
                uploader: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: page * limit,
            take: limit + 1, // Take one extra to check if there are more pages
        });

        // Check if there are more items
        const hasMore = resources.length > limit;
        const items = hasMore ? resources.slice(0, -1) : resources;

        return NextResponse.json({
            resources: items,
            hasMore,
            total,
            nextCursor: hasMore ? page + 1 : undefined,
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}