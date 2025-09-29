import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ragKnowledgeBase } from '@/lib/rag/knowledge-base';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { question, courseId } = body;

        if (!question || question.trim().length === 0) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        if (question.length > 1000) {
            return NextResponse.json({ error: 'Question is too long (max 1000 characters)' }, { status: 400 });
        }

        // Generate answer using RAG system
        const ragResult = await ragKnowledgeBase.generateContextualAnswer(
            question.trim(),
            courseId ? parseInt(courseId) : undefined
        );

        // Log the query for analytics (optional)
        console.log(`RAG Query: "${question}" - Confidence: ${ragResult.confidence}`);

        return NextResponse.json({
            answer: ragResult.answer,
            confidence: ragResult.confidence,
            sources: ragResult.sources.map(source => ({
                resourceId: source.resourceId,
                title: source.title,
                description: source.description,
                relevanceScore: source.relevanceScore,
                // Don't include full content in response for security/size reasons
                snippet: source.content.slice(0, 200) + (source.content.length > 200 ? '...' : '')
            })),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating RAG answer:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate answer',
                answer: 'I apologize, but I encountered an error while trying to answer your question. Please try again later or rephrase your question.',
                confidence: 0,
                sources: []
            },
            { status: 500 }
        );
    }
}