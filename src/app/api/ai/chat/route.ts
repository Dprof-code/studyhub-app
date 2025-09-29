/**
 * AI Chat API Endpoint
 * Phase 5B: Core Features Implementation
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geminiAI } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            message,
            contextType = 'general',
            contextId,
            conversationHistory = []
        } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Prepare context based on type
        let systemContext = '';
        let userContext = '';

        switch (contextType) {
            case 'course':
                systemContext = 'You are an AI learning assistant specialized in helping students with course-related questions. Provide educational, accurate, and helpful responses.';
                if (contextId) {
                    // In a real implementation, fetch course details
                    userContext = `The user is asking about course ID: ${contextId}. `;
                }
                break;

            case 'question':
                systemContext = 'You are an AI tutor helping students solve academic questions. Break down problems step by step and explain concepts clearly.';
                if (contextId) {
                    userContext = `The user is working on question ID: ${contextId}. `;
                }
                break;

            case 'concept':
                systemContext = 'You are an AI concept explainer. Help students understand complex topics through clear explanations, examples, and analogies.';
                if (contextId) {
                    userContext = `The user is learning about concept: ${contextId}. `;
                }
                break;

            default:
                systemContext = 'You are an AI learning assistant. Help students with their studies, provide explanations, create study plans, analyze documents, and answer academic questions. Be helpful, educational, and encouraging.';
        }

        // Build conversation context
        const conversationContext = conversationHistory
            .slice(-5) // Last 5 messages for context
            .map((msg: any) => `${msg.role}: ${msg.content}`)
            .join('\n');

        const fullPrompt = `${systemContext}

${userContext}

Previous conversation:
${conversationContext}

User: ${message}

Please provide a helpful, educational response. If the question relates to:
1. Document analysis - offer to help analyze or extract information
2. Study planning - suggest creating personalized study schedules
3. Concept explanation - provide clear, step-by-step explanations
4. Question solving - break down the problem and guide through solutions
5. Course recommendations - suggest learning paths and resources

Response:`;

        // Generate AI response
        const result = await geminiAI.generateContent(fullPrompt);
        const aiResponse = result.response.text();

        // Analyze message for suggestions
        const suggestions = await generateSuggestions(message, contextType);

        // Detect if any files or resources should be attached
        const attachments = await detectAttachments(message, contextType, contextId);

        return NextResponse.json({
            id: `chat_${Date.now()}`,
            content: aiResponse,
            suggestions,
            attachments,
            contextType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI Chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat message' },
            { status: 500 }
        );
    }
}

/**
 * Generate contextual suggestions based on the user's message
 */
async function generateSuggestions(message: string, _contextType: string): Promise<string[]> {
    const messageLower = message.toLowerCase();

    // Common educational suggestions
    const baseSuggestions = [
        "Can you explain this concept in simpler terms?",
        "What are some practice problems for this topic?",
        "How does this relate to other concepts I've learned?",
        "Can you create a study plan for this subject?"
    ];

    // Context-specific suggestions
    if (messageLower.includes('explain') || messageLower.includes('what is')) {
        return [
            "Can you provide examples?",
            "How is this used in real applications?",
            "What are the key principles?",
            "Can you break this down step by step?"
        ];
    }

    if (messageLower.includes('study plan') || messageLower.includes('schedule')) {
        return [
            "How many hours should I study daily?",
            "What's the best order to learn these topics?",
            "Can you suggest practice resources?",
            "How can I track my progress?"
        ];
    }

    if (messageLower.includes('problem') || messageLower.includes('solve')) {
        return [
            "Can you show me the solution steps?",
            "What approach should I use?",
            "Are there similar problems I can practice?",
            "What are common mistakes to avoid?"
        ];
    }

    if (messageLower.includes('document') || messageLower.includes('analyze')) {
        return [
            "Can you extract key concepts from this document?",
            "What are the main topics covered?",
            "Can you generate questions from this content?",
            "How can I better understand this material?"
        ];
    }

    return baseSuggestions.slice(0, 3);
}

/**
 * Detect if any attachments should be included in the response
 */
async function detectAttachments(
    message: string,
    contextType: string,
    contextId?: string
): Promise<any[]> {
    const attachments = [];

    // If user asks about documents or resources
    if (message.toLowerCase().includes('document') || message.toLowerCase().includes('resource')) {
        // In a real implementation, you would fetch relevant documents
        if (contextType === 'course' && contextId) {
            attachments.push({
                type: 'document',
                id: 'doc_sample',
                name: 'Course Materials.pdf'
            });
        }
    }

    // If user asks about concepts
    if (message.toLowerCase().includes('concept') || message.toLowerCase().includes('theory')) {
        attachments.push({
            type: 'concept',
            id: 'concept_sample',
            name: 'Related Concepts Map'
        });
    }

    // If user asks about questions or problems
    if (message.toLowerCase().includes('question') || message.toLowerCase().includes('problem')) {
        attachments.push({
            type: 'question',
            id: 'question_sample',
            name: 'Practice Problems'
        });
    }

    return attachments;
}

/**
 * GET endpoint for chat history (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const contextType = searchParams.get('contextType') || 'general';
        const contextId = searchParams.get('contextId');

        // In a real implementation, fetch chat history from database
        // For now, return empty history
        return NextResponse.json({
            messages: [],
            contextType,
            contextId
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat history' },
            { status: 500 }
        );
    }
}