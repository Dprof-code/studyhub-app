import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const ConceptUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    category: z.string().min(1).max(100).optional(),
    parentConceptId: z.number().nullable().optional(),
    aiSummary: z.string().optional()
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ conceptId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const conceptId = parseInt(resolvedParams.conceptId);

        if (isNaN(conceptId)) {
            return NextResponse.json({ error: 'Invalid concept ID' }, { status: 400 });
        }

        const concept = await db.concept.findUnique({
            where: { id: conceptId },
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        _count: {
                            select: {
                                questions: true
                            }
                        }
                    }
                },
                questions: {
                    include: {
                        question: {
                            include: {
                                resource: {
                                    select: {
                                        id: true,
                                        title: true,
                                        fileType: true,
                                        course: {
                                            select: {
                                                code: true,
                                                title: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        confidence: 'desc'
                    }
                },
                resources: {
                    include: {
                        resource: {
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                fileType: true,
                                uploader: {
                                    select: {
                                        username: true
                                    }
                                },
                                course: {
                                    select: {
                                        code: true,
                                        title: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        relevanceScore: 'desc'
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

        if (!concept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
        }

        return NextResponse.json(concept);

    } catch (error) {
        console.error('Error fetching concept:', error);
        return NextResponse.json(
            { error: 'Failed to fetch concept' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ conceptId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const conceptId = parseInt(resolvedParams.conceptId);

        if (isNaN(conceptId)) {
            return NextResponse.json({ error: 'Invalid concept ID' }, { status: 400 });
        }

        const body = await request.json();
        const data = ConceptUpdateSchema.parse(body);

        // Check if concept exists
        const existingConcept = await db.concept.findUnique({
            where: { id: conceptId }
        });

        if (!existingConcept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
        }

        // Check for name conflicts if name is being updated
        if (data.name && data.name !== existingConcept.name) {
            const nameConflict = await db.concept.findFirst({
                where: {
                    name: {
                        equals: data.name,
                        mode: 'insensitive'
                    },
                    id: {
                        not: conceptId
                    }
                }
            });

            if (nameConflict) {
                return NextResponse.json(
                    { error: 'Concept with this name already exists' },
                    { status: 409 }
                );
            }
        }

        // Validate parent concept if provided
        if (data.parentConceptId !== undefined && data.parentConceptId !== null) {
            if (data.parentConceptId === conceptId) {
                return NextResponse.json(
                    { error: 'Concept cannot be its own parent' },
                    { status: 400 }
                );
            }

            const parentConcept = await db.concept.findUnique({
                where: { id: data.parentConceptId }
            });

            if (!parentConcept) {
                return NextResponse.json(
                    { error: 'Parent concept not found' },
                    { status: 404 }
                );
            }

            // Check for circular references
            let currentParentId: number | null = data.parentConceptId;
            const visited = new Set([conceptId]);

            while (currentParentId) {
                if (visited.has(currentParentId)) {
                    return NextResponse.json(
                        { error: 'Circular reference detected' },
                        { status: 400 }
                    );
                }

                visited.add(currentParentId);
                const parent: { parentConceptId: number | null } | null = await db.concept.findUnique({
                    where: { id: currentParentId },
                    select: { parentConceptId: true }
                });

                currentParentId = parent?.parentConceptId || null;
            }
        }

        const updatedConcept = await db.concept.update({
            where: { id: conceptId },
            data,
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                },
                children: {
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

        return NextResponse.json(updatedConcept);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error updating concept:', error);
        return NextResponse.json(
            { error: 'Failed to update concept' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ conceptId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const conceptId = parseInt(resolvedParams.conceptId);

        if (isNaN(conceptId)) {
            return NextResponse.json({ error: 'Invalid concept ID' }, { status: 400 });
        }

        // Check if concept exists and get its relationships
        const concept = await db.concept.findUnique({
            where: { id: conceptId },
            include: {
                _count: {
                    select: {
                        questions: true,
                        resources: true,
                        children: true
                    }
                }
            }
        });

        if (!concept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
        }

        // Check if concept has children (prevent deletion)
        if (concept._count.children > 0) {
            return NextResponse.json(
                { error: 'Cannot delete concept with child concepts' },
                { status: 400 }
            );
        }

        // Soft delete approach - just remove relationships, keep concept for reference
        await db.$transaction([
            // Remove question-concept relationships
            db.questionConcept.deleteMany({
                where: { conceptId }
            }),
            // Remove concept-resource relationships
            db.conceptResource.deleteMany({
                where: { conceptId }
            }),
            // Delete the concept
            db.concept.delete({
                where: { id: conceptId }
            })
        ]);

        return NextResponse.json({ message: 'Concept deleted successfully' });

    } catch (error) {
        console.error('Error deleting concept:', error);
        return NextResponse.json(
            { error: 'Failed to delete concept' },
            { status: 500 }
        );
    }
}