import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const ConceptQuerySchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    resourceId: z.number().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    includeRelated: z.boolean().default(true),
    sortBy: z.enum(['relevance', 'name', 'usage', 'created']).default('relevance')
});

const ConceptCreateSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().min(1).max(100),
    parentConceptId: z.number().optional(),
    aiSummary: z.string().optional()
});

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const params = ConceptQuerySchema.parse({
            query: searchParams.get('query'),
            category: searchParams.get('category'),
            resourceId: searchParams.get('resourceId') ? parseInt(searchParams.get('resourceId')!) : undefined,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
            includeRelated: searchParams.get('includeRelated') === 'true',
            sortBy: searchParams.get('sortBy') as 'relevance' | 'name' | 'usage' | 'created' || 'relevance'
        });

        // Build where clause for filtering
        const whereClause: any = {};

        if (params.query) {
            whereClause.OR = [
                { name: { contains: params.query, mode: 'insensitive' } },
                { description: { contains: params.query, mode: 'insensitive' } },
                { aiSummary: { contains: params.query, mode: 'insensitive' } }
            ];
        }

        if (params.category) {
            whereClause.category = {
                contains: params.category,
                mode: 'insensitive'
            };
        }

        if (params.resourceId) {
            whereClause.resources = {
                some: {
                    resourceId: params.resourceId
                }
            };
        }

        // Build order clause
        let orderBy: any;
        switch (params.sortBy) {
            case 'name':
                orderBy = { name: 'asc' };
                break;
            case 'usage':
                orderBy = { questions: { _count: 'desc' } };
                break;
            case 'created':
                orderBy = { createdAt: 'desc' };
                break;
            default:
                orderBy = { questions: { _count: 'desc' } };
        }

        const concepts = await db.concept.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: {
                        questions: true,
                        resources: true,
                        children: true
                    }
                },
                parent: params.includeRelated ? {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                } : false,
                children: params.includeRelated ? {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    },
                    take: 5
                } : false,
                questions: {
                    include: {
                        question: {
                            include: {
                                resource: {
                                    select: {
                                        id: true,
                                        title: true
                                    }
                                }
                            }
                        }
                    },
                    take: 3
                }
            },
            orderBy,
            take: params.limit,
            skip: params.offset
        });

        // Get total count for pagination
        const totalCount = await db.concept.count({ where: whereClause });

        return NextResponse.json({
            concepts,
            pagination: {
                total: totalCount,
                limit: params.limit,
                offset: params.offset,
                hasMore: params.offset + params.limit < totalCount
            }
        });

    } catch (error) {
        console.error('Error fetching concepts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch concepts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const data = ConceptCreateSchema.parse(body);

        // Check if concept already exists
        const existingConcept = await db.concept.findFirst({
            where: {
                name: {
                    equals: data.name,
                    mode: 'insensitive'
                }
            }
        });

        if (existingConcept) {
            return NextResponse.json(
                { error: 'Concept already exists' },
                { status: 409 }
            );
        }

        // Validate parent concept if provided
        if (data.parentConceptId) {
            const parentConcept = await db.concept.findUnique({
                where: { id: data.parentConceptId }
            });

            if (!parentConcept) {
                return NextResponse.json(
                    { error: 'Parent concept not found' },
                    { status: 404 }
                );
            }
        }

        const concept = await db.concept.create({
            data,
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                },
                _count: {
                    select: {
                        questions: true,
                        resources: true,
                        children: true
                    }
                }
            }
        });

        return NextResponse.json(concept, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error creating concept:', error);
        return NextResponse.json(
            { error: 'Failed to create concept' },
            { status: 500 }
        );
    }
}