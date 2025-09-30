import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ resourceId: string }> }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const resourceId = parseInt(resolvedParams.resourceId);

        if (isNaN(resourceId)) {
            return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
        }

        console.log(`🔍 Fetching analysis data for resource: ${resourceId}`);

        // Get the resource to verify ownership and basic info
        const resource = await db.resource.findUnique({
            where: { id: resourceId },
            select: {
                id: true,
                uploaderId: true,
                title: true,
                aiProcessingStatus: true,
                isPastQuestion: true,
                course: {
                    select: { title: true }
                }
            }
        });

        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        if (resource.uploaderId !== parseInt(session.user.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Try the complex query first, with fallback for simpler schemas
        let extractedQuestions: any[] = [];
        try {
            extractedQuestions = await db.extractedQuestion.findMany({
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
                                        take: 5
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
                orderBy: { id: 'asc' }
            });
        } catch (complexError) {
            console.log('⚠️ Complex query failed, trying simple query:', complexError);

            // Fallback: Simple query without relationships
            try {
                extractedQuestions = await db.extractedQuestion.findMany({
                    where: { resourceId },
                    orderBy: { id: 'asc' }
                });

                // Transform to expected format with empty relationships
                extractedQuestions = extractedQuestions.map(q => ({
                    ...q,
                    concepts: []
                }));
            } catch (simpleError) {
                console.error('❌ Both complex and simple queries failed:', simpleError);
                extractedQuestions = [];
            }
        }

        // Format response with enhanced debugging information
        const response = {
            resource: {
                id: resource.id || resourceId,
                title: resource.title || `Resource ${resourceId}`,
                course: resource.course?.title || 'Unknown Course',
                isPastQuestion: resource.isPastQuestion || false,
                aiProcessingStatus: resource.aiProcessingStatus || 'UNKNOWN'
            },
            questions: extractedQuestions.map(question => ({
                id: question.id,
                questionNumber: question.questionNumber || `Q${question.id}`,
                questionText: question.questionText || 'No question text available',
                marks: question.marks || 0,
                difficulty: question.difficulty || 'MEDIUM',
                concepts: (question.concepts || []).map((qc: any) => ({
                    id: qc.concept?.id || qc.id || 0,
                    name: qc.concept?.name || qc.name || 'Unknown Concept',
                    description: qc.concept?.description || qc.description || '',
                    category: qc.concept?.category || qc.category || 'General',
                    confidence: qc.confidence || 0.5,
                    isMainConcept: qc.isMainConcept || false,
                    aiSummary: qc.concept?.aiSummary || qc.aiSummary || '',
                    relatedResources: (qc.concept?.resources || qc.resources || []).map((cr: any) => ({
                        id: cr.resource?.id || cr.id || 0,
                        title: cr.resource?.title || cr.title || 'Unknown Resource',
                        description: cr.resource?.description || cr.description || '',
                        fileType: cr.resource?.fileType || cr.fileType || 'unknown',
                        relevanceScore: cr.relevanceScore || 0.5,
                        extractedContent: cr.extractedContent || ''
                    }))
                }))
            })),
            totalQuestions: extractedQuestions.length,
            totalConcepts: extractedQuestions.reduce((total, q) =>
                total + (q.concepts || []).length, 0
            ),
            debug: {
                hasComplexRelationships: extractedQuestions.length > 0 && extractedQuestions[0].concepts !== undefined,
                schemaVersion: 'v2-fallback-compatible',
                queryTimestamp: new Date().toISOString()
            }
        };

        console.log(`✅ Returning analysis data: ${response.totalQuestions} questions, ${response.totalConcepts} total concept mappings`);

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching question concepts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch question concepts' },
            { status: 500 }
        );
    }
}