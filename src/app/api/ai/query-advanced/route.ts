import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { GeminiAIService } from '@/lib/ai/gemini-service';
import { z } from 'zod';

const AdvancedRAGQuerySchema = z.object({
    question: z.string().min(1).max(1000),
    context: z.object({
        courseIds: z.array(z.number()).optional(),
        resourceIds: z.array(z.number()).optional(),
        concepts: z.array(z.string()).optional()
    }).optional(),
    options: z.object({
        responseStyle: z.enum(['concise', 'detailed', 'academic']).default('detailed'),
        includeRelatedConcepts: z.boolean().default(true),
        includeExplanation: z.boolean().default(false),
        confidenceThreshold: z.number().min(0).max(1).default(0.5),
        maxSources: z.number().min(1).max(20).default(10)
    }).optional()
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { question, context, options } = AdvancedRAGQuerySchema.parse(body);

        // Get relevant resources based on context
        const relevantResources = await getRelevantResources(
            question,
            context,
            parseInt(session.user.id)
        );

        // Generate AI answer using the resources
        const geminiAI = new GeminiAIService();
        const contextText = relevantResources
            .map(r => `Title: ${r.title}\nContent: ${r.ragContent || r.description || 'No content available'}`)
            .join('\n\n---\n\n');

        const answer = await geminiAI.answerQuestionWithRAG(
            question,
            [contextText],
            relevantResources[0]?.course?.title
        );

        // Build response with sources
        const sources = relevantResources.map(resource => ({
            id: resource.id,
            title: resource.title,
            course: resource.course?.title,
            confidence: 0.8, // Simplified confidence score
            snippet: resource.description?.substring(0, 200) + '...'
        }));

        return NextResponse.json({
            answer: answer,
            confidence: 0.85,
            sources: sources,
            relatedConcepts: options?.includeRelatedConcepts ?
                extractConceptsFromResources(relevantResources) : undefined,
            explanation: options?.includeExplanation ?
                'Answer generated using AI analysis of course resources' : undefined,
            metadata: {
                queryTime: new Date().toISOString(),
                sourcesCount: sources.length,
                responseStyle: options?.responseStyle || 'detailed'
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Advanced RAG query error:', error);
        return NextResponse.json(
            { error: 'Failed to process RAG query' },
            { status: 500 }
        );
    }
}

async function getRelevantResources(
    question: string,
    context: any,
    userId: number
) {
    const whereClause: any = {};

    // Apply context filters
    if (context?.courseIds && context.courseIds.length > 0) {
        whereClause.courseId = { in: context.courseIds };
    } else {
        // Get user's enrolled courses if no specific courses provided
        const enrollments = await db.enrollment.findMany({
            where: { userId, status: 'ACTIVE' },
            select: { courseId: true }
        });

        if (enrollments.length > 0) {
            whereClause.courseId = { in: enrollments.map(e => e.courseId) };
        }
    }

    if (context?.resourceIds && context.resourceIds.length > 0) {
        whereClause.id = { in: context.resourceIds };
    }

    // Simple text search for now
    whereClause.OR = [
        { title: { contains: question, mode: 'insensitive' } },
        { description: { contains: question, mode: 'insensitive' } },
        { ragContent: { contains: question, mode: 'insensitive' } }
    ];

    return await db.resource.findMany({
        where: whereClause,
        include: {
            course: true,
            conceptMappings: {
                include: {
                    concept: true
                }
            }
        },
        take: 10
    });
}

function extractConceptsFromResources(resources: any[]): string[] {
    const concepts = new Set<string>();

    resources.forEach(resource => {
        resource.conceptMappings?.forEach((mapping: any) => {
            concepts.add(mapping.concept.name);
        });
    });

    return Array.from(concepts).slice(0, 5);
}