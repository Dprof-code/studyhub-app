/**
 * AI Question Generation API Endpoint
 * Phase 5B: Core Features Implementation
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geminiAI } from '@/lib/ai/gemini-service';
import { db } from '@/lib/dbconfig';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            subject,
            topic,
            difficulty = 'medium',
            questionType = 'practical',
            count = 1,
            courseId,
            conceptIds = []
        } = body;

        if (!subject || !topic) {
            return NextResponse.json({
                error: 'Subject and topic are required'
            }, { status: 400 });
        }

        // Validate question type and difficulty
        const validTypes = ['mcq', 'short', 'long', 'practical', 'essay'];
        const validDifficulties = ['easy', 'medium', 'hard'];

        if (!validTypes.includes(questionType)) {
            return NextResponse.json({
                error: 'Invalid question type'
            }, { status: 400 });
        }

        if (!validDifficulties.includes(difficulty)) {
            return NextResponse.json({
                error: 'Invalid difficulty level'
            }, { status: 400 });
        }

        // Fetch context if courseId is provided
        let courseContext = '';
        if (courseId) {
            const course = await db.course.findUnique({
                where: { id: courseId },
                include: { department: true }
            });

            if (course) {
                courseContext = `Course: ${course.title} (${course.department?.name})`;
            }
        }

        // Fetch concept context if conceptIds provided
        let conceptContext = '';
        if (conceptIds.length > 0) {
            const concepts = await db.concept.findMany({
                where: { id: { in: conceptIds } }
            });

            conceptContext = concepts.map(c => `${c.name}: ${c.description}`).join('; ');
        }

        // Build the generation prompt based on question type
        const prompt = buildQuestionPrompt({
            subject,
            topic,
            difficulty,
            questionType,
            courseContext,
            conceptContext,
            count
        });

        // Generate questions using AI
        const result = await geminiAI.generateContent(prompt);
        const generatedContent = result.response.text();

        // Parse the generated content
        const questions = parseGeneratedQuestions(
            generatedContent,
            subject,
            topic,
            difficulty,
            questionType
        );

        // Store generated questions in database
        const savedQuestions = [];
        for (const questionData of questions) {
            try {
                const question = await db.extractedQuestion.create({
                    data: {
                        resourceId: 1, // Default resource ID - you might want to make this dynamic
                        questionText: questionData.text,
                        questionNumber: questionData.number || 1,
                        marks: questionData.marks || getDefaultMarks(questionType),
                        difficulty,
                        aiAnalysis: {
                            extractedConcepts: questionData.concepts,
                            keyTopics: questionData.keyTopics,
                            solutionApproach: questionData.solutionApproach,
                            difficultyScore: getDifficultyScore(difficulty),
                            generatedBy: 'AI',
                            generatedAt: new Date().toISOString()
                        }
                    }
                });

                // Link to concepts if provided
                if (conceptIds.length > 0) {
                    for (const conceptId of conceptIds) {
                        await db.questionConcept.create({
                            data: {
                                questionId: question.id,
                                conceptId,
                                confidence: 0.9, // High confidence for AI-generated questions
                                isMainConcept: true
                            }
                        });
                    }
                }

                savedQuestions.push({
                    id: question.id,
                    text: question.questionText,
                    subject,
                    topic,
                    difficulty,
                    questionType,
                    marks: question.marks,
                    estimatedTime: estimateTime(questionType, difficulty),
                    concepts: questionData.concepts,
                    aiAnalysis: {
                        keyTopics: questionData.keyTopics,
                        solutionApproach: questionData.solutionApproach,
                        commonMistakes: questionData.commonMistakes,
                        studyRecommendations: questionData.studyRecommendations,
                        difficultyScore: getDifficultyScore(difficulty)
                    },
                    source: {
                        type: 'generated' as const,
                        name: 'AI Generated'
                    },
                    solution: questionData.solution,
                    tags: generateTags(subject, topic, difficulty),
                    bookmarked: false,
                    createdAt: new Date()
                });
            } catch (error) {
                console.error('Error saving question:', error);
            }
        }

        return NextResponse.json({
            questions: savedQuestions,
            generated: savedQuestions.length,
            requested: count
        });

    } catch (error) {
        console.error('Question generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate questions' },
            { status: 500 }
        );
    }
}

/**
 * Build the AI prompt for question generation
 */
function buildQuestionPrompt({
    subject,
    topic,
    difficulty,
    questionType,
    courseContext,
    conceptContext,
    count
}: any): string {
    const basePrompt = `Generate ${count} high-quality academic ${questionType} question(s) for:

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
${courseContext ? `Course Context: ${courseContext}` : ''}
${conceptContext ? `Concept Context: ${conceptContext}` : ''}

Requirements:`;

    const typeSpecificRequirements = {
        mcq: `
- Create multiple choice questions with 4 options (A, B, C, D)
- Mark the correct answer clearly
- Include plausible distractors
- Test conceptual understanding`,

        short: `
- Create short answer questions (2-5 sentences expected)
- Focus on specific concepts or definitions
- Require clear, concise explanations`,

        long: `
- Create comprehensive questions requiring detailed explanations
- Include multiple sub-parts if appropriate
- Test deep understanding and analysis`,

        practical: `
- Create hands-on programming or implementation questions
- Include specific requirements and constraints
- Test practical application of concepts`,

        essay: `
- Create essay questions requiring critical analysis
- Allow for multiple valid approaches
- Test synthesis and evaluation skills`
    };

    const difficultyGuidelines = {
        easy: 'Focus on basic concepts, definitions, and direct application',
        medium: 'Include analysis, comparison, and moderate problem-solving',
        hard: 'Require synthesis, complex problem-solving, and deep understanding'
    };

    return `${basePrompt}
${typeSpecificRequirements[questionType as keyof typeof typeSpecificRequirements]}

Difficulty Guidelines: ${difficultyGuidelines[difficulty as keyof typeof difficultyGuidelines]}

For each question, provide:
1. The question text
2. Expected answer/solution (if applicable)
3. Key concepts tested
4. Solution approach/steps
5. Common mistakes students might make
6. Study recommendations

Format your response as JSON with the following structure:
{
  "questions": [
    {
      "text": "Question text here",
      "answer": "Correct answer (for MCQ) or sample solution",
      "concepts": ["concept1", "concept2"],
      "keyTopics": ["topic1", "topic2"],
      "solutionApproach": ["step1", "step2"],
      "commonMistakes": ["mistake1", "mistake2"],
      "studyRecommendations": ["recommendation1", "recommendation2"]
    }
  ]
}`;
}

/**
 * Parse AI-generated question content
 */
function parseGeneratedQuestions(
    content: string,
    subject: string,
    topic: string,
    _difficulty: string,
    _questionType: string
): any[] {
    try {
        // Try to parse as JSON first
        const parsed = JSON.parse(content);
        if (parsed.questions && Array.isArray(parsed.questions)) {
            return parsed.questions;
        }
    } catch (_e) {
        // If JSON parsing fails, try to extract questions from text
        console.log('JSON parsing failed, extracting from text');
    }

    // Fallback: create a single question from the content
    return [{
        text: content.split('\n').find(line => line.includes('?')) || content,
        concepts: [topic],
        keyTopics: [topic],
        solutionApproach: ['Analyze the problem', 'Apply relevant concepts', 'Provide solution'],
        commonMistakes: ['Misunderstanding the question', 'Incomplete analysis'],
        studyRecommendations: [`Review ${topic} concepts`, `Practice similar problems`]
    }];
}

/**
 * Get default marks for question type
 */
function getDefaultMarks(questionType: string): number {
    const markMap = {
        mcq: 2,
        short: 5,
        long: 10,
        practical: 15,
        essay: 20
    };

    return markMap[questionType as keyof typeof markMap] || 5;
}

/**
 * Get difficulty score (0-100)
 */
function getDifficultyScore(difficulty: string): number {
    const scoreMap = {
        easy: 30,
        medium: 60,
        hard: 90
    };

    return scoreMap[difficulty as keyof typeof scoreMap] || 60;
}

/**
 * Estimate time required for question
 */
function estimateTime(questionType: string, difficulty: string): number {
    const baseTime = {
        mcq: 3,
        short: 10,
        long: 30,
        practical: 45,
        essay: 60
    };

    const difficultyMultiplier = {
        easy: 0.8,
        medium: 1.0,
        hard: 1.5
    };

    const base = baseTime[questionType as keyof typeof baseTime] || 10;
    const multiplier = difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1.0;

    return Math.round(base * multiplier);
}

/**
 * Generate relevant tags
 */
function generateTags(subject: string, topic: string, difficulty: string): string[] {
    return [
        subject.toLowerCase().replace(/\s+/g, '-'),
        topic.toLowerCase().replace(/\s+/g, '-'),
        difficulty,
        'ai-generated',
        'practice'
    ];
}