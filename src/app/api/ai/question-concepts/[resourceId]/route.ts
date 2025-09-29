import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ resourceId: string }> }
) {
    try {
        // Check authentication
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const resourceId = parseInt(resolvedParams.resourceId);

        if (isNaN(resourceId)) {
            return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
        }

        // Get extracted questions and concepts
        const extractedQuestions = await db.extractedQuestion.findMany({
            where: { resourceId },
            include: {
                concepts: {
                    include: {
                        concept: {
                            include: {
                                resources: {
                                    include: {
                                        resource: {
                                            select: {
                                                id: true,
                                                title: true,
                                                description: true,
                                                fileType: true
                                            }
                                        }
                                    },
                                    orderBy: {
                                        relevanceScore: 'desc'
                                    },
                                    take: 5 // Top 5 related resources per concept
                                }
                            }
                        }
                    },
                    orderBy: [
                        { isMainConcept: 'desc' },
                        { confidence: 'desc' }
                    ]
                }
            },
            orderBy: {
                id: 'asc'
            }
        });

        // Get resource details
        const resource = await db.resource.findUnique({
            where: { id: resourceId },
            include: {
                course: true,
                aiProcessingJobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        // Format response
        const response = {
            resource: {
                id: resource.id,
                title: resource.title,
                course: resource.course.title,
                isPastQuestion: resource.isPastQuestion,
                aiProcessingStatus: resource.aiProcessingStatus,
                lastProcessed: resource.aiProcessingJobs[0]?.completedAt
            },
            questions: extractedQuestions.map(question => ({
                id: question.id,
                questionNumber: question.questionNumber,
                questionText: question.questionText,
                marks: question.marks,
                difficulty: question.difficulty,
                concepts: question.concepts.map(qc => ({
                    id: qc.concept.id,
                    name: qc.concept.name,
                    description: qc.concept.description,
                    category: qc.concept.category,
                    confidence: qc.confidence,
                    isMainConcept: qc.isMainConcept,
                    aiSummary: qc.concept.aiSummary,
                    relatedResources: qc.concept.resources.map(cr => ({
                        id: cr.resource.id,
                        title: cr.resource.title,
                        description: cr.resource.description,
                        fileType: cr.resource.fileType,
                        relevanceScore: cr.relevanceScore,
                        extractedContent: cr.extractedContent
                    }))
                }))
            })),
            totalQuestions: extractedQuestions.length,
            totalConcepts: new Set(
                extractedQuestions.flatMap(q => q.concepts.map(c => c.concept.id))
            ).size
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching question concepts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch question concepts' },
            { status: 500 }
        );
    }
}