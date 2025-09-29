import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';

const SimilarityRequestSchema = z.object({
    resourceId: z.number(),
    limit: z.number().min(1).max(50).default(10),
    threshold: z.number().min(0).max(1).default(0.3),
    includeMetrics: z.boolean().default(false),
    filters: z.object({
        courseId: z.number().optional(),
        fileType: z.string().optional(),
        concepts: z.array(z.string()).optional(),
        excludeIds: z.array(z.number()).optional()
    }).optional()
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { resourceId, limit, threshold, includeMetrics, filters } = SimilarityRequestSchema.parse(body);

        // Get the source resource with its concepts and embeddings
        const sourceResource = await db.resource.findUnique({
            where: { id: resourceId },
            include: {
                conceptMappings: {
                    include: {
                        concept: true
                    }
                },
                course: true,
                aiProcessingJobs: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!sourceResource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        // Find similar resources using multiple similarity metrics
        const similarResources = await findSimilarResources(
            sourceResource,
            limit,
            threshold,
            filters
        );

        // Calculate detailed similarity metrics if requested
        const enrichedResults = includeMetrics
            ? await enrichWithMetrics(similarResources, sourceResource)
            : similarResources;

        // Track user interaction for recommendation improvements
        await trackSimilaritySearch(parseInt(session.user.id), resourceId, similarResources.length);

        return NextResponse.json({
            sourceResource: {
                id: sourceResource.id,
                title: sourceResource.title,
                course: sourceResource.course?.title,
                concepts: sourceResource.conceptMappings.map(cm => cm.concept.name)
            },
            similarResources: enrichedResults,
            searchMetadata: {
                totalFound: similarResources.length,
                threshold,
                searchTime: new Date().toISOString(),
                filters: filters || {}
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Similarity search error:', error);
        return NextResponse.json(
            { error: 'Failed to find similar resources' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const resourceId = parseInt(searchParams.get('resourceId') || '0');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!resourceId) {
            return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
        }

        // Get quick similarity matches without detailed metrics
        const sourceResource = await db.resource.findUnique({
            where: { id: resourceId },
            include: {
                conceptMappings: {
                    include: {
                        concept: true
                    }
                }
            }
        });

        if (!sourceResource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        const similarResources = await findSimilarResources(sourceResource, limit, 0.3);

        return NextResponse.json({
            similarResources: similarResources.map(r => ({
                id: r.id,
                title: r.title,
                course: r.course?.title,
                fileType: r.fileType,
                similarityScore: r.similarityScore,
                sharedConcepts: r.sharedConcepts
            }))
        });

    } catch (error) {
        console.error('Error fetching similar resources:', error);
        return NextResponse.json(
            { error: 'Failed to fetch similar resources' },
            { status: 500 }
        );
    }
}

async function findSimilarResources(
    sourceResource: any,
    limit: number,
    threshold: number = 0.3,
    filters?: any
) {
    const sourceConcepts = sourceResource.conceptMappings.map((cm: any) => cm.concept.name);

    // Build where clause for filtering
    const whereClause: any = {
        id: { not: sourceResource.id }, // Exclude self
        NOT: { conceptMappings: { none: {} } } // Only resources with concepts
    };

    // Apply filters
    if (filters) {
        if (filters.courseId) {
            whereClause.courseId = filters.courseId;
        }
        if (filters.fileType) {
            whereClause.fileType = filters.fileType;
        }
        if (filters.excludeIds && filters.excludeIds.length > 0) {
            whereClause.id = { notIn: filters.excludeIds };
        }
        if (filters.concepts && filters.concepts.length > 0) {
            whereClause.conceptMappings = {
                some: {
                    concept: {
                        name: { in: filters.concepts }
                    }
                }
            };
        }
    }

    // Get potential matches
    const candidateResources = await db.resource.findMany({
        where: whereClause,
        include: {
            conceptMappings: {
                include: {
                    concept: true
                }
            },
            course: true,
            extractedQuestions: {
                take: 3
            },
            uploader: {
                select: {
                    username: true
                }
            }
        },
        take: limit * 3 // Get more candidates to filter from
    });

    // Calculate similarity scores
    const scoredResources = candidateResources.map(resource => {
        const resourceConcepts = resource.conceptMappings.map((cm: any) => cm.concept.name);

        // Calculate concept similarity
        const conceptSimilarity = calculateConceptSimilarity(sourceConcepts, resourceConcepts);

        // Calculate content similarity (based on file type, course, etc.)
        const contentSimilarity = calculateContentSimilarity(sourceResource, resource);

        // Calculate question similarity if available
        const questionSimilarity = calculateQuestionSimilarity(
            sourceResource.extractedQuestions || [],
            resource.extractedQuestions || []
        );

        // Combined similarity score
        const combinedScore = (
            conceptSimilarity * 0.5 +
            contentSimilarity * 0.3 +
            questionSimilarity * 0.2
        );

        return {
            ...resource,
            similarityScore: combinedScore,
            conceptSimilarity,
            contentSimilarity,
            questionSimilarity,
            sharedConcepts: resourceConcepts.filter(concept => sourceConcepts.includes(concept)),
            resourceConcepts
        };
    });

    // Filter by threshold and sort by similarity
    const filteredResources = scoredResources
        .filter(resource => resource.similarityScore >= threshold)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

    return filteredResources;
}

function calculateConceptSimilarity(sourceConcepts: string[], targetConcepts: string[]): number {
    if (sourceConcepts.length === 0 || targetConcepts.length === 0) {
        return 0;
    }

    const intersection = sourceConcepts.filter(concept => targetConcepts.includes(concept));
    const union = [...new Set([...sourceConcepts, ...targetConcepts])];

    // Jaccard similarity coefficient
    return intersection.length / union.length;
}

function calculateContentSimilarity(sourceResource: any, targetResource: any): number {
    let score = 0;

    // Same course - high similarity
    if (sourceResource.courseId === targetResource.courseId) {
        score += 0.4;
    }

    // Same file type
    if (sourceResource.fileType === targetResource.fileType) {
        score += 0.2;
    }

    // Similar titles (basic text similarity)
    const titleSimilarity = calculateTextSimilarity(
        sourceResource.title.toLowerCase(),
        targetResource.title.toLowerCase()
    );
    score += titleSimilarity * 0.4;

    return Math.min(score, 1.0);
}

function calculateQuestionSimilarity(sourceQuestions: any[], targetQuestions: any[]): number {
    if (sourceQuestions.length === 0 || targetQuestions.length === 0) {
        return 0;
    }

    // Simple similarity based on question count and type similarity
    const sourceTypes = sourceQuestions.map(q => q.type || 'unknown');
    const targetTypes = targetQuestions.map(q => q.type || 'unknown');

    const sharedTypes = sourceTypes.filter(type => targetTypes.includes(type));
    const allTypes = [...new Set([...sourceTypes, ...targetTypes])];

    if (allTypes.length === 0) return 0;

    return sharedTypes.length / allTypes.length;
}

function calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    if (union.length === 0) return 0;

    return intersection.length / union.length;
}

async function enrichWithMetrics(resources: any[], sourceResource: any) {
    return resources.map(resource => ({
        id: resource.id,
        title: resource.title,
        course: {
            id: resource.course?.id,
            name: resource.course?.title
        },
        fileType: resource.fileType,
        uploader: resource.uploader,
        similarity: {
            overall: resource.similarityScore,
            concept: resource.conceptSimilarity,
            content: resource.contentSimilarity,
            question: resource.questionSimilarity,
            sharedConcepts: resource.sharedConcepts,
            totalConcepts: resource.resourceConcepts.length
        },
        stats: {
            questionsCount: resource.extractedQuestions?.length || 0,
            conceptsCount: resource.conceptMappings?.length || 0
        },
        createdAt: resource.createdAt
    }));
}

async function trackSimilaritySearch(userId: number, resourceId: number, resultCount: number) {
    try {
        await db.userInteraction.create({
            data: {
                userId,
                interactionType: 'SIMILARITY_SEARCH',
                resourceId,
                metadata: {
                    resultCount,
                    searchType: 'similarity',
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Error tracking similarity search:', error);
        // Don't throw - this is non-critical
    }
}