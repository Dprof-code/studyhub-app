import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { GeminiAIService } from '@/lib/ai/gemini-service';
import { z } from 'zod';

const QuestionProcessingSchema = z.object({
    resourceId: z.number(),
    processingType: z.enum(['extract_questions', 'analyze_difficulty', 'generate_solutions', 'create_variations']),
    options: z.object({
        includeExplanations: z.boolean().default(true),
        generateHints: z.boolean().default(false),
        difficultyLevels: z.array(z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT'])).optional(),
        conceptFocus: z.array(z.string()).optional(),
        outputFormat: z.enum(['structured', 'quiz', 'study_guide']).default('structured')
    }).optional()
});

const QuestionGenerationSchema = z.object({
    conceptIds: z.array(z.number()),
    questionCount: z.number().min(1).max(50).default(5),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM'),
    questionTypes: z.array(z.enum(['multiple_choice', 'short_answer', 'essay', 'problem_solving'])).default(['multiple_choice']),
    includeAnswers: z.boolean().default(true),
    courseContext: z.string().optional()
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { processingType } = body;

        if (processingType === 'generate_new_questions') {
            return await handleQuestionGeneration(body, parseInt(session.user.id));
        } else {
            return await handleQuestionProcessing(body, parseInt(session.user.id));
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Question processing error:', error);
        return NextResponse.json(
            { error: 'Question processing failed' },
            { status: 500 }
        );
    }
}

async function handleQuestionProcessing(body: any, userId: number) {
    const { resourceId, processingType, options } = QuestionProcessingSchema.parse(body);

    // Get the resource and its existing questions
    const resource = await db.resource.findUnique({
        where: { id: resourceId },
        include: {
            extractedQuestions: true,
            course: {
                select: { title: true, id: true }
            }
        }
    });

    if (!resource) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const geminiAI = new GeminiAIService();
    let processingResults;

    switch (processingType) {
        case 'extract_questions':
            processingResults = await extractAdvancedQuestions(resource, geminiAI, options);
            break;
        case 'analyze_difficulty':
            processingResults = await analyzeDifficultyDistribution(resource, geminiAI);
            break;
        case 'generate_solutions':
            processingResults = await generateDetailedSolutions(resource, geminiAI, options);
            break;
        case 'create_variations':
            processingResults = await createQuestionVariations(resource, geminiAI, options);
            break;
        default:
            return NextResponse.json({ error: 'Invalid processing type' }, { status: 400 });
    }

    // Track processing for analytics
    await trackQuestionProcessing(userId, processingType, resourceId, processingResults);

    // Calculate questions processed based on processing type and results structure
    let questionsProcessed = 0;
    if ('questions' in processingResults && Array.isArray(processingResults.questions)) {
        questionsProcessed = processingResults.questions.length;
    } else if ('solutions' in processingResults && Array.isArray(processingResults.solutions)) {
        questionsProcessed = processingResults.solutions.length;
    } else if ('variations' in processingResults && Array.isArray(processingResults.variations)) {
        questionsProcessed = processingResults.variations.length;
    } else if ('statistics' in processingResults && processingResults.statistics?.totalQuestions) {
        questionsProcessed = processingResults.statistics.totalQuestions;
    } else if (!('error' in processingResults)) {
        questionsProcessed = 1; // Default for successful processing
    }

    return NextResponse.json({
        processingType,
        resourceId,
        results: processingResults,
        metadata: {
            processedAt: new Date().toISOString(),
            questionsProcessed,
            resourceTitle: resource.title
        }
    });
}

async function handleQuestionGeneration(body: any, userId: number) {
    const generationRequest = QuestionGenerationSchema.parse(body);

    // Get concepts for context
    const concepts = await db.concept.findMany({
        where: { id: { in: generationRequest.conceptIds } },
        include: {
            resources: {
                include: {
                    resource: {
                        include: {
                            course: true,
                            extractedQuestions: {
                                take: 5 // Sample questions for style reference
                            }
                        }
                    }
                }
            }
        }
    });

    if (concepts.length === 0) {
        return NextResponse.json({ error: 'No concepts found' }, { status: 404 });
    }

    const geminiAI = new GeminiAIService();
    const generatedQuestions = await generateQuestionsFromConcepts(
        concepts,
        generationRequest,
        geminiAI
    );

    // Save generated questions if requested
    const savedQuestions = await saveGeneratedQuestions(
        generatedQuestions,
        userId,
        generationRequest.conceptIds
    );

    return NextResponse.json({
        generated: generatedQuestions,
        saved: savedQuestions.length,
        concepts: concepts.map(c => ({ id: c.id, name: c.name })),
        metadata: {
            generatedAt: new Date().toISOString(),
            questionCount: generatedQuestions.length,
            difficulty: generationRequest.difficulty
        }
    });
}

async function extractAdvancedQuestions(resource: any, geminiAI: GeminiAIService, options: any) {
    // Enhanced question extraction with concept mapping
    const extractedQuestions = await geminiAI.extractQuestionsFromText(
        resource.ragContent || resource.description || '',
        resource.course?.title
    );

    // Analyze each question for concepts and difficulty
    const enhancedQuestions = [];

    for (const question of extractedQuestions) {
        const conceptAnalysis = await geminiAI.identifyQuestionConcepts(
            question.questionText,
            resource.course?.title
        );

        const difficultyAnalysis = await analyzeQuestionDifficulty(
            question.questionText,
            conceptAnalysis,
            geminiAI
        );

        enhancedQuestions.push({
            ...question,
            concepts: conceptAnalysis,
            difficultyAnalysis,
            estimatedTime: estimateAnswerTime(question.questionText, difficultyAnalysis.level),
            learningObjectives: await generateLearningObjectives(question.questionText, conceptAnalysis, geminiAI)
        });
    }

    // Generate study recommendations based on questions
    const studyRecommendations = await generateQuestionBasedRecommendations(
        enhancedQuestions,
        resource,
        geminiAI
    );

    return {
        questions: enhancedQuestions,
        summary: {
            totalQuestions: enhancedQuestions.length,
            difficultyDistribution: calculateDifficultyDistribution(enhancedQuestions),
            conceptsCovered: extractUniqueConcepts(enhancedQuestions),
            estimatedStudyTime: enhancedQuestions.reduce((sum, q) => sum + q.estimatedTime, 0)
        },
        studyRecommendations
    };
}

async function analyzeDifficultyDistribution(resource: any, geminiAI: GeminiAIService) {
    const questions = resource.extractedQuestions || [];

    if (questions.length === 0) {
        return { error: 'No questions found in resource' };
    }

    // Analyze difficulty patterns
    const difficultyAnalysis = await geminiAI.analyzeDifficultyProgression({
        questions,
        courseLevel: resource.course?.level || 100,
        resourceType: resource.fileType
    });

    return {
        distribution: difficultyAnalysis.distribution,
        progression: difficultyAnalysis.progression,
        recommendations: difficultyAnalysis.recommendations,
        statistics: {
            totalQuestions: questions.length,
            averageDifficulty: difficultyAnalysis.averageDifficulty,
            difficultyRange: difficultyAnalysis.range
        }
    };
}

async function generateDetailedSolutions(resource: any, geminiAI: GeminiAIService, options: any) {
    const questions = resource.extractedQuestions || [];
    const solutions = [];

    for (const question of questions.slice(0, 10)) { // Limit to prevent API overuse
        const solution = await geminiAI.generateDetailedSolution({
            question: question.questionText,
            concepts: question.concepts || [],
            difficulty: question.difficulty,
            includeExplanations: options?.includeExplanations ?? true,
            generateHints: options?.generateHints ?? false,
            courseContext: resource.course?.title
        });

        solutions.push({
            questionId: question.id,
            question: question.questionText,
            solution: solution.solution,
            explanation: solution.explanation,
            hints: solution.hints,
            keyFormulas: solution.keyFormulas || [],
            commonMistakes: solution.commonMistakes || []
        });
    }

    return {
        solutions,
        summary: {
            solutionsGenerated: solutions.length,
            averageExplanationLength: calculateAverageLength(solutions.map(s => s.explanation)),
            conceptsCovered: extractSolutionConcepts(solutions)
        }
    };
}

async function createQuestionVariations(resource: any, geminiAI: GeminiAIService, options: any) {
    const questions = resource.extractedQuestions || [];
    const variations = [];

    for (const question of questions.slice(0, 5)) { // Limit variations
        const questionVariations = await geminiAI.generateQuestionVariations({
            originalQuestion: question.questionText,
            difficulty: question.difficulty,
            concepts: question.concepts || [],
            variationCount: 3,
            variationTypes: ['different_context', 'increased_difficulty', 'simplified_version']
        });

        variations.push({
            originalQuestion: question,
            variations: questionVariations
        });
    }

    return {
        variations,
        summary: {
            originalQuestions: questions.length,
            variationsGenerated: variations.reduce((sum, v) => sum + v.variations.length, 0),
            totalQuestions: questions.length + variations.reduce((sum, v) => sum + v.variations.length, 0)
        }
    };
}

async function generateQuestionsFromConcepts(
    concepts: any[],
    request: any,
    geminiAI: GeminiAIService
) {
    const questions = [];

    // Get sample questions for style reference
    const sampleQuestions = concepts.flatMap(concept =>
        concept.resources.flatMap((mapping: any) =>
            mapping.resource.extractedQuestions || []
        )
    ).slice(0, 5);

    for (const concept of concepts) {
        const conceptQuestions = await geminiAI.generateConceptQuestions({
            concept: concept.name,
            description: concept.description,
            difficulty: request.difficulty,
            questionTypes: request.questionTypes,
            questionCount: Math.ceil(request.questionCount / concepts.length),
            sampleQuestions,
            courseContext: request.courseContext
        });

        questions.push(...conceptQuestions.map((q: any) => ({
            ...q,
            conceptId: concept.id,
            conceptName: concept.name
        })));
    }

    return questions.slice(0, request.questionCount);
}

// Helper functions
async function analyzeQuestionDifficulty(questionText: string, concepts: any[], geminiAI: GeminiAIService) {
    return await geminiAI.analyzeQuestionDifficulty({
        question: questionText,
        concepts: concepts.map(c => c.name),
        context: 'academic_assessment'
    });
}

function estimateAnswerTime(questionText: string, difficulty: string): number {
    const baseTime = 5; // minutes
    const difficultyMultipliers = {
        'EASY': 1,
        'MEDIUM': 2,
        'HARD': 3,
        'EXPERT': 4
    };

    const wordCount = questionText.split(' ').length;
    const complexityFactor = wordCount > 50 ? 1.5 : 1;

    return baseTime * (difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || 2) * complexityFactor;
}

async function generateLearningObjectives(questionText: string, concepts: any[], geminiAI: GeminiAIService) {
    return await geminiAI.generateLearningObjectives({
        question: questionText,
        concepts: concepts.map(c => c.name)
    });
}

async function generateQuestionBasedRecommendations(questions: any[], resource: any, geminiAI: GeminiAIService) {
    return await geminiAI.generateStudyRecommendations(
        questions,
        []  // No matched resources for now - could be enhanced
    );
}

function calculateDifficultyDistribution(questions: any[]) {
    const distribution = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };

    questions.forEach(q => {
        const difficulty = q.difficulty || q.difficultyAnalysis?.level || 'MEDIUM';
        distribution[difficulty as keyof typeof distribution]++;
    });

    return distribution;
}

function extractUniqueConcepts(questions: any[]): string[] {
    const concepts = new Set<string>();

    questions.forEach(q => {
        q.concepts?.forEach((concept: any) => {
            concepts.add(concept.name || concept);
        });
    });

    return Array.from(concepts);
}

function calculateAverageLength(texts: string[]): number {
    if (texts.length === 0) return 0;

    const totalLength = texts.reduce((sum, text) => sum + (text?.length || 0), 0);
    return Math.round(totalLength / texts.length);
}

function extractSolutionConcepts(solutions: any[]): string[] {
    const concepts = new Set<string>();

    solutions.forEach(solution => {
        // Extract concepts from explanation text (simplified)
        const words: string[] = solution.explanation?.split(' ') || [];
        words.forEach((word: string) => {
            if (word.length > 5 && word[0] === word[0].toUpperCase()) {
                concepts.add(word.replace(/[^a-zA-Z]/g, ''));
            }
        });
    });

    return Array.from(concepts).slice(0, 10);
}

async function saveGeneratedQuestions(questions: any[], userId: number, conceptIds: number[]) {
    const savedQuestions = [];

    // Create a virtual resource for generated questions
    const virtualResource = await db.resource.create({
        data: {
            title: `Generated Questions - ${new Date().toISOString().split('T')[0]}`,
            description: `AI-generated questions for concepts: ${conceptIds.join(', ')}`,
            fileUrl: '', // Virtual resource
            fileType: 'application/json',
            uploaderId: userId,
            courseId: 1, // Would need to be determined based on concepts
            isPastQuestion: false,
            ragContent: JSON.stringify(questions)
        }
    });

    // Save each question
    for (const question of questions) {
        try {
            const savedQuestion = await db.extractedQuestion.create({
                data: {
                    resourceId: virtualResource.id,
                    questionText: question.questionText || question.question,
                    questionNumber: question.questionNumber,
                    marks: question.marks,
                    difficulty: question.difficulty,
                    aiAnalysis: {
                        generated: true,
                        conceptId: question.conceptId,
                        generatedAt: new Date().toISOString()
                    }
                }
            });
            savedQuestions.push(savedQuestion);
        } catch (error) {
            console.error('Error saving generated question:', error);
        }
    }

    return savedQuestions;
}

async function trackQuestionProcessing(userId: number, processingType: string, resourceId: number, results: any) {
    try {
        await db.userInteraction.create({
            data: {
                userId,
                interactionType: 'QUESTION_PROCESSING',
                resourceId,
                metadata: {
                    processingType,
                    questionsProcessed: results.questions?.length || 0,
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Error tracking question processing:', error);
    }
}