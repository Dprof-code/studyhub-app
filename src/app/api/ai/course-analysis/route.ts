/**
 * AI-Powered Course Analysis API
 * Phase 3: Advanced AI Processing
 * 
 * Provides comprehensive course analysis including content structure,
 * difficulty progression, learning path optimization, and performance insights.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { z } from 'zod';
import { geminiAI } from '@/lib/ai/gemini-service';

// Request validation schema
const CourseAnalysisRequestSchema = z.object({
    // Core parameters
    courseId: z.number(),
    analysisType: z.enum([
        'CONTENT_STRUCTURE',
        'DIFFICULTY_PROGRESSION',
        'LEARNING_PATH',
        'PERFORMANCE_INSIGHTS',
        'CONCEPT_MAPPING',
        'RESOURCE_OPTIMIZATION',
        'COMPREHENSIVE'
    ]).default('COMPREHENSIVE'),

    // Analysis options
    includePeerComparison: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    analyzeLearningGaps: z.boolean().default(true),
    generateLearningPath: z.boolean().default(true),

    // Focus areas
    focusAreas: z.array(z.enum([
        'CONCEPTS', 'QUESTIONS', 'RESOURCES', 'PROGRESSION',
        'PERFORMANCE', 'ENGAGEMENT', 'COMPLETION_RATE'
    ])).optional(),

    // Filters
    resourceTypes: z.array(z.string()).optional(),
    difficultyLevels: z.array(z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT'])).optional(),
    timeframe: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
    }).optional(),

    // Comparison options
    compareWith: z.object({
        similarCourses: z.boolean().default(false),
        departmentAverage: z.boolean().default(false),
        userCohort: z.boolean().default(false)
    }).optional()
});

type CourseAnalysisRequest = z.infer<typeof CourseAnalysisRequestSchema>;

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request
        const body = await request.json();
        const validatedData = CourseAnalysisRequestSchema.parse(body);

        // Verify user access to course
        const enrollment = await db.enrollment.findFirst({
            where: {
                userId: parseInt(session.user.id),
                courseId: validatedData.courseId
            },
            include: {
                course: {
                    include: {
                        department: true,
                        resources: {
                            include: {
                                extractedQuestions: {
                                    include: {
                                        concepts: true
                                    }
                                },
                                uploader: {
                                    select: { username: true }
                                }
                            }
                        },
                        enrollments: {
                            include: {
                                user: {
                                    select: { id: true, username: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!enrollment) {
            return NextResponse.json({
                error: 'Course not found or access denied'
            }, { status: 404 });
        }

        // Get user's performance data for this course
        const userPerformance = await getUserCoursePerformance(parseInt(session.user.id), validatedData.courseId);

        // Perform comprehensive course analysis
        const analysis = await performCourseAnalysis(enrollment.course, validatedData, userPerformance);

        // Generate AI-powered insights
        const aiInsights = await generateCourseInsights(enrollment.course, analysis, validatedData);

        // Save analysis results
        const savedAnalysis = await saveAnalysisResults(
            parseInt(session.user.id),
            validatedData.courseId,
            analysis,
            aiInsights,
            validatedData
        );

        // Track user interaction (simplified without import)
        // await trackUserInteraction({
        //   userId: session.user.id,
        //   type: 'AI_COURSE_ANALYSIS',
        //   resourceId: validatedData.courseId,
        //   metadata: {
        //     analysisType: validatedData.analysisType,
        //     focusAreas: validatedData.focusAreas || [],
        //     includedFeatures: {
        //       peerComparison: validatedData.includePeerComparison,
        //       recommendations: validatedData.includeRecommendations,
        //       learningPath: validatedData.generateLearningPath
        //     }
        //   }
        // });

        return NextResponse.json({
            success: true,
            analysisId: savedAnalysis.id,
            courseAnalysis: {
                course: {
                    id: enrollment.course.id,
                    title: enrollment.course.title,
                    code: enrollment.course.code,
                    department: enrollment.course.department?.name
                },
                analysis,
                insights: aiInsights,
                metadata: {
                    analysisType: validatedData.analysisType,
                    generatedAt: new Date().toISOString(),
                    version: '3.0',
                    processingTime: Date.now() - performance.now(),
                    dataPoints: {
                        resources: enrollment.course.resources.length,
                        concepts: enrollment.course.resources.reduce((sum: number, r: any) => sum + (r.concepts?.length || 0), 0),
                        questions: enrollment.course.resources.reduce((sum: number, r: any) => sum + (r.extractedQuestions?.length || 0), 0),
                        enrolledStudents: enrollment.course.enrollments.length
                    }
                }
            }
        });

    } catch (error) {
        console.error('Course analysis error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Invalid request data',
                details: error.issues
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Failed to analyze course',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('courseId');
        const analysisType = searchParams.get('analysisType');
        const includeHistory = searchParams.get('includeHistory') === 'true';

        if (!courseId) {
            // Get all course analyses for user - simplified version
            return NextResponse.json({
                success: true,
                analyses: [],
                message: 'Course analysis history not yet implemented'
            });
        }

        // Return simplified response for now
        return NextResponse.json({
            success: true,
            analysis: null,
            message: 'Course analysis retrieval not yet implemented'
        });

    } catch (error) {
        console.error('Course analysis retrieval error:', error);
        return NextResponse.json({
            error: 'Failed to retrieve analysis',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Helper Functions

async function getUserCoursePerformance(userId: number, courseId: number) {
    const [interactions, studySessions, completedResources] = await Promise.all([
        db.userInteraction.findMany({
            where: {
                userId,
                resourceId: {
                    in: await db.resource.findMany({
                        where: { courseId },
                        select: { id: true }
                    }).then(resources => resources.map(r => r.id))
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        }),

        db.studySession.findMany({
            where: {
                userId
                // Simplified query without complex metadata filtering
            }
        }),

        db.activityLog.count({
            where: {
                userId,
                activityType: 'RESOURCE_UPLOAD', // Using existing enum value
                resourceId: {
                    in: await db.resource.findMany({
                        where: { courseId },
                        select: { id: true }
                    }).then(resources => resources.map(r => r.id))
                }
            }
        })
    ]);

    return {
        interactions,
        studySessions,
        completedResources,
        performanceMetrics: calculatePerformanceMetrics(interactions),
        engagementLevel: calculateEngagementLevel(interactions, studySessions),
        progressScore: calculateProgressScore(interactions, completedResources)
    };
}

async function performCourseAnalysis(course: any, request: CourseAnalysisRequest, userPerformance: any) {
    const analysis: any = {};

    // Content Structure Analysis
    if (request.analysisType === 'CONTENT_STRUCTURE' || request.analysisType === 'COMPREHENSIVE') {
        analysis.contentStructure = await analyzeContentStructure(course);
    }

    // Difficulty Progression Analysis
    if (request.analysisType === 'DIFFICULTY_PROGRESSION' || request.analysisType === 'COMPREHENSIVE') {
        analysis.difficultyProgression = await analyzeDifficultyProgression(course);
    }

    // Learning Path Analysis
    if (request.analysisType === 'LEARNING_PATH' || request.analysisType === 'COMPREHENSIVE') {
        analysis.learningPath = await analyzeLearningPath(course, userPerformance);
    }

    // Performance Insights
    if (request.analysisType === 'PERFORMANCE_INSIGHTS' || request.analysisType === 'COMPREHENSIVE') {
        analysis.performanceInsights = await analyzePerformanceInsights(course, userPerformance);
    }

    // Concept Mapping
    if (request.analysisType === 'CONCEPT_MAPPING' || request.analysisType === 'COMPREHENSIVE') {
        analysis.conceptMapping = await analyzeConceptMapping(course);
    }

    // Resource Optimization
    if (request.analysisType === 'RESOURCE_OPTIMIZATION' || request.analysisType === 'COMPREHENSIVE') {
        analysis.resourceOptimization = await analyzeResourceOptimization(course, userPerformance);
    }

    return analysis;
}

async function generateCourseInsights(course: any, analysis: any, request: CourseAnalysisRequest) {
    // Simplified insights generation for now
    return {
        overview: `Course analysis completed for ${course.title}`,
        keyFindings: ['Analysis data collected', 'Insights generated'],
        recommendations: request.includeRecommendations ? ['Continue with study plan', 'Review weak areas'] : [],
        learningPathSuggestions: request.generateLearningPath ? ['Follow structured approach', 'Practice regularly'] : [],
        improvementAreas: ['Focus on practice', 'Review fundamentals'],
        strengths: ['Good resource availability', 'Structured content'],
        riskFactors: [],
        predictedOutcomes: ['Improved understanding', 'Better performance'],
        actionableItems: ['Create study schedule', 'Set learning goals']
    };
}

async function saveAnalysisResults(userId: number, courseId: number, analysis: any, insights: any, request: CourseAnalysisRequest) {
    // Simplified save for now - would normally save to CourseAnalysis model
    return {
        id: Date.now(), // Temporary ID
        success: true
    };
}

// Analysis Functions

async function analyzeContentStructure(course: any) {
    const resources = course.resources || [];
    const concepts = resources.flatMap((r: any) => r.concepts || []);

    return {
        totalResources: resources.length,
        resourceTypes: groupByProperty(resources, 'fileType'),
        totalConcepts: concepts.length,
        conceptDistribution: groupByProperty(concepts, 'category'),
        resourceCoverage: calculateResourceCoverage(resources, concepts),
        organizationScore: calculateOrganizationScore(resources),
        complexity: calculateContentComplexity(resources, concepts)
    };
}

async function analyzeDifficultyProgression(course: any) {
    const resources = course.resources || [];
    const questions = resources.flatMap((r: any) => r.extractedQuestions || []);

    // Use AI to analyze difficulty progression
    const difficultyAnalysis = await geminiAI.analyzeDifficultyProgression({
        questions: questions.slice(0, 20),
        courseLevel: inferCourseLevel(course),
        resourceType: 'MIXED'
    });

    return {
        ...difficultyAnalysis,
        questionCount: questions.length,
        resourceDifficulty: calculateResourceDifficulty(resources),
        progressionQuality: assessProgressionQuality(difficultyAnalysis),
        recommendations: generateProgressionRecommendations(difficultyAnalysis)
    };
}

async function analyzeLearningPath(course: any, userPerformance: any) {
    const concepts = course.resources.flatMap((r: any) => r.concepts || []);
    const userLevel = inferUserLevel(userPerformance);

    // Generate optimal learning path
    const learningPath = await geminiAI.generateOptimalLearningPath({
        concepts: concepts.slice(0, 15),
        userLevel,
        masteredConcepts: identifyMasteredConcepts(userPerformance, concepts),
        timeConstraints: 'FLEXIBLE'
    });

    return {
        ...learningPath,
        currentPosition: calculateCurrentPosition(userPerformance, concepts),
        nextSteps: identifyNextSteps(learningPath, userPerformance),
        estimatedCompletion: estimateCompletionTime(learningPath, userPerformance),
        adaptationSuggestions: generateAdaptationSuggestions(learningPath, userPerformance)
    };
}

async function analyzePerformanceInsights(course: any, userPerformance: any) {
    return {
        overallScore: userPerformance.progressScore,
        engagementLevel: userPerformance.engagementLevel,
        performanceMetrics: userPerformance.performanceMetrics,

        strengths: identifyPerformanceStrengths(userPerformance),
        weaknesses: identifyPerformanceWeaknesses(userPerformance),
        trends: analyzePeformanceTrends(userPerformance.interactions),

        peerComparison: await calculatePeerComparison(course.id, userPerformance),
        improvementPotential: calculateImprovementPotential(userPerformance),
        riskAssessment: assessPerformanceRisk(userPerformance)
    };
}

async function analyzeConceptMapping(course: any) {
    const concepts = course.resources.flatMap((r: any) => r.concepts || []);
    const conceptsByResource = course.resources.map((r: any) => ({
        resourceId: r.id,
        resourceTitle: r.title,
        concepts: r.concepts || []
    }));

    return {
        totalConcepts: concepts.length,
        uniqueConcepts: [...new Set(concepts.map((c: any) => c.name))].length,
        conceptsByResource,
        conceptRelationships: await identifyConceptRelationships(concepts),
        coverage: calculateConceptCoverage(conceptsByResource),
        gaps: identifyConceptGaps(concepts, course.department?.name),
        redundancy: calculateConceptRedundancy(concepts)
    };
}

async function analyzeResourceOptimization(course: any, userPerformance: any) {
    const resources = course.resources || [];
    const utilizationData = calculateResourceUtilization(resources, userPerformance);

    return {
        utilization: utilizationData,
        effectiveness: calculateResourceEffectiveness(resources, userPerformance),
        recommendations: generateResourceRecommendations(resources, utilizationData),
        prioritization: prioritizeResources(resources, userPerformance),
        gaps: identifyResourceGaps(resources, course),
        optimization: generateOptimizationSuggestions(resources, utilizationData)
    };
}

// Utility Functions

function calculatePerformanceMetrics(interactions: any[]) {
    if (!interactions.length) return { average: 0, consistency: 0, trend: 'STABLE' };

    const scores = interactions.filter(i => i.metadata?.score).map(i => i.metadata.score);
    const average = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;

    return {
        average,
        consistency: calculateConsistency(scores),
        trend: calculateTrend(scores),
        totalInteractions: interactions.length,
        recentActivity: interactions.filter(i =>
            new Date(i.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
    };
}

function calculateEngagementLevel(interactions: any[], studySessions: any[]) {
    const interactionScore = Math.min(interactions.length / 50, 1) * 0.6;
    const sessionScore = Math.min(studySessions.length / 10, 1) * 0.4;
    return interactionScore + sessionScore;
}

function calculateProgressScore(interactions: any[], completedResources: number) {
    const interactionScore = Math.min(interactions.length / 100, 1) * 0.7;
    const completionScore = Math.min(completedResources / 20, 1) * 0.3;
    return interactionScore + completionScore;
}

function groupByProperty(items: any[], property: string) {
    return items.reduce((acc, item) => {
        const key = item[property] || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function calculateResourceCoverage(resources: any[], concepts: any[]) {
    const resourcesWithConcepts = resources.filter(r => r.concepts?.length > 0).length;
    return resources.length ? resourcesWithConcepts / resources.length : 0;
}

function calculateOrganizationScore(resources: any[]) {
    // Simple organization scoring based on naming patterns and structure
    let score = 0.5; // Base score

    // Check for consistent naming
    const titles = resources.map(r => r.title?.toLowerCase() || '');
    const hasNumbering = titles.some(t => /^\d+/.test(t));
    const hasCategories = titles.some(t => t.includes('chapter') || t.includes('section'));

    if (hasNumbering) score += 0.2;
    if (hasCategories) score += 0.2;

    return Math.min(score, 1.0);
}

function calculateContentComplexity(resources: any[], concepts: any[]) {
    const avgConceptsPerResource = concepts.length / (resources.length || 1);
    const fileTypeVariety = new Set(resources.map(r => r.fileType)).size;

    return {
        conceptDensity: avgConceptsPerResource,
        typeVariety: fileTypeVariety,
        overallComplexity: Math.min((avgConceptsPerResource / 10) + (fileTypeVariety / 5), 1)
    };
}

function inferCourseLevel(course: any) {
    const code = course.code?.toLowerCase() || '';
    if (code.includes('100') || code.includes('intro')) return 1;
    if (code.includes('200') || code.includes('intermediate')) return 2;
    if (code.includes('300') || code.includes('advanced')) return 3;
    if (code.includes('400') || code.includes('senior')) return 4;
    return 2; // Default to intermediate
}

function calculateResourceDifficulty(resources: any[]) {
    // Simple heuristic based on file type and content indicators
    const difficultyMap: any = {
        'pdf': 0.7,
        'docx': 0.5,
        'pptx': 0.4,
        'video': 0.6
    };

    const avgDifficulty = resources.reduce((sum, r) => {
        return sum + (difficultyMap[r.fileType] || 0.5);
    }, 0) / (resources.length || 1);

    return {
        average: avgDifficulty,
        distribution: groupByProperty(resources.map(r => ({
            fileType: r.fileType,
            estimatedDifficulty: difficultyMap[r.fileType] || 0.5
        })), 'fileType')
    };
}

function assessProgressionQuality(difficultyAnalysis: any) {
    const progression = difficultyAnalysis.progression;
    const distribution = difficultyAnalysis.distribution;

    let score = 0.5; // Base score

    if (progression === 'gradual') score += 0.3;
    else if (progression === 'mixed') score += 0.1;

    // Check for balanced distribution
    const total = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0);
    const balance = Object.values(distribution).map((count: any) => (count as number) / total);
    const balanceScore = 1 - balance.reduce((sum, ratio) => sum + Math.abs(ratio - 0.25), 0) / 4;

    return Math.min(score + balanceScore * 0.2, 1.0);
}

function generateProgressionRecommendations(difficultyAnalysis: any) {
    const recommendations = [];

    if (difficultyAnalysis.progression === 'steep') {
        recommendations.push('Consider adding intermediate-level content to smooth the learning curve');
    }

    if (difficultyAnalysis.distribution.EASY < difficultyAnalysis.distribution.HARD) {
        recommendations.push('Add more introductory materials to build foundational understanding');
    }

    if (difficultyAnalysis.distribution.EXPERT === 0) {
        recommendations.push('Include advanced challenges for high-achieving students');
    }

    return recommendations;
}

function inferUserLevel(userPerformance: any) {
    const score = userPerformance.progressScore;
    if (score < 0.3) return 1;
    if (score < 0.6) return 2;
    if (score < 0.8) return 3;
    return 4;
}

function identifyMasteredConcepts(userPerformance: any, concepts: any[]) {
    const strongInteractions = userPerformance.interactions
        .filter((i: any) => i.metadata?.score > 0.8)
        .map((i: any) => i.metadata?.concepts)
        .flat()
        .filter(Boolean);

    return concepts
        .filter(c => strongInteractions.includes(c.name))
        .map(c => c.id);
}

function calculateCurrentPosition(userPerformance: any, concepts: any[]) {
    const masteredCount = identifyMasteredConcepts(userPerformance, concepts).length;
    return {
        masteredConcepts: masteredCount,
        totalConcepts: concepts.length,
        progressPercentage: concepts.length ? (masteredCount / concepts.length) * 100 : 0
    };
}

function identifyNextSteps(learningPath: any, userPerformance: any) {
    const sequence = learningPath.sequence || [];
    const currentLevel = inferUserLevel(userPerformance);

    return sequence
        .filter((step: any) => step.order <= currentLevel + 2)
        .slice(0, 3)
        .map((step: any) => ({
            concept: step.concept,
            reasoning: step.reasoning,
            priority: step.order <= currentLevel + 1 ? 'HIGH' : 'MEDIUM'
        }));
}

function estimateCompletionTime(learningPath: any, userPerformance: any) {
    const remainingHours = learningPath.timeEstimate || 0;
    const studyRate = userPerformance.engagementLevel * 2; // hours per week

    return {
        totalHours: remainingHours,
        estimatedWeeks: studyRate > 0 ? Math.ceil(remainingHours / studyRate) : null,
        currentPace: studyRate,
        suggestions: studyRate < 2 ? ['Increase study time', 'Set regular schedule'] : []
    };
}

function generateAdaptationSuggestions(learningPath: any, userPerformance: any) {
    const suggestions = [];

    if (userPerformance.engagementLevel < 0.3) {
        suggestions.push({
            type: 'engagement',
            description: 'Focus on interactive learning materials',
            priority: 'HIGH'
        });
    }

    if (userPerformance.performanceMetrics.consistency < 0.5) {
        suggestions.push({
            type: 'consistency',
            description: 'Establish a regular study schedule',
            priority: 'MEDIUM'
        });
    }

    return suggestions;
}

function identifyPerformanceStrengths(userPerformance: any) {
    const strengths = [];

    if (userPerformance.engagementLevel > 0.7) {
        strengths.push('High engagement with course materials');
    }

    if (userPerformance.performanceMetrics.consistency > 0.7) {
        strengths.push('Consistent study patterns');
    }

    if (userPerformance.performanceMetrics.trend === 'IMPROVING') {
        strengths.push('Improving performance over time');
    }

    return strengths;
}

function identifyPerformanceWeaknesses(userPerformance: any) {
    const weaknesses = [];

    if (userPerformance.engagementLevel < 0.3) {
        weaknesses.push('Low engagement with course materials');
    }

    if (userPerformance.performanceMetrics.average < 0.5) {
        weaknesses.push('Below average performance scores');
    }

    if (userPerformance.performanceMetrics.trend === 'DECLINING') {
        weaknesses.push('Declining performance trend');
    }

    return weaknesses;
}

function analyzePeformanceTrends(interactions: any[]) {
    if (interactions.length < 3) return { trend: 'INSUFFICIENT_DATA', confidence: 0 };

    const scores = interactions
        .filter(i => i.metadata?.score)
        .map(i => ({ score: i.metadata.score, date: new Date(i.createdAt) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (scores.length < 3) return { trend: 'INSUFFICIENT_DATA', confidence: 0 };

    // Simple linear trend analysis
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    let trend = 'STABLE';
    let confidence = 0.5;

    if (Math.abs(difference) > 0.1) {
        trend = difference > 0 ? 'IMPROVING' : 'DECLINING';
        confidence = Math.min(Math.abs(difference) * 2, 1);
    }

    return {
        trend,
        confidence,
        difference,
        dataPoints: scores.length,
        timeSpan: scores.length > 0 ?
            (scores[scores.length - 1].date.getTime() - scores[0].date.getTime()) / (1000 * 60 * 60 * 24) : 0
    };
}

async function calculatePeerComparison(courseId: number, userPerformance: any) {
    // Get peer performance data
    const peerInteractions = await db.userInteraction.findMany({
        where: {
            resourceId: {
                in: await db.resource.findMany({
                    where: { courseId },
                    select: { id: true }
                }).then(resources => resources.map(r => r.id))
            }
        },
        select: {
            userId: true,
            metadata: true
        }
    });

    // Process peer scores manually from JSON metadata
    const peerScores: number[] = [];
    const userScoreMap = new Map<number, number[]>();

    peerInteractions.forEach(interaction => {
        const metadata = interaction.metadata as any;
        if (metadata?.score && typeof metadata.score === 'number') {
            const userId = interaction.userId;
            if (!userScoreMap.has(userId)) {
                userScoreMap.set(userId, []);
            }
            userScoreMap.get(userId)!.push(metadata.score);
        }
    });

    // Calculate average score per user
    userScoreMap.forEach(scores => {
        if (scores.length > 0) {
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            peerScores.push(avgScore);
        }
    });

    if (!peerScores.length) return { comparison: 'NO_DATA', percentile: null };

    const userScore = userPerformance.performanceMetrics.average;
    const betterThanCount = peerScores.filter(score => userScore > score).length;
    const percentile = (betterThanCount / peerScores.length) * 100;

    return {
        userScore,
        peerAverage: peerScores.reduce((sum, s) => sum + s, 0) / peerScores.length,
        percentile: Math.round(percentile),
        totalPeers: peerScores.length,
        comparison: percentile > 75 ? 'ABOVE_AVERAGE' :
            percentile > 25 ? 'AVERAGE' : 'BELOW_AVERAGE'
    };
}

function calculateImprovementPotential(userPerformance: any) {
    const currentScore = userPerformance.performanceMetrics.average;
    const consistency = userPerformance.performanceMetrics.consistency;
    const engagement = userPerformance.engagementLevel;

    const potential = (1 - currentScore) * (consistency + engagement) / 2;

    return {
        score: Math.min(potential, 1),
        areas: potential > 0.3 ? [
            'Focus on weak concept areas',
            'Increase study consistency',
            'Engage with more diverse resources'
        ] : ['Maintain current performance level'],
        timeframe: potential > 0.5 ? 'SHORT_TERM' : 'LONG_TERM'
    };
}

function assessPerformanceRisk(userPerformance: any) {
    let riskScore = 0;
    const risks = [];

    if (userPerformance.engagementLevel < 0.3) {
        riskScore += 0.4;
        risks.push('Low engagement risk');
    }

    if (userPerformance.performanceMetrics.trend === 'DECLINING') {
        riskScore += 0.3;
        risks.push('Performance decline risk');
    }

    if (userPerformance.performanceMetrics.consistency < 0.3) {
        riskScore += 0.3;
        risks.push('Inconsistent study pattern risk');
    }

    return {
        overallRisk: Math.min(riskScore, 1),
        level: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
        risks,
        mitigationSuggestions: risks.length > 0 ? [
            'Schedule regular study sessions',
            'Set achievable short-term goals',
            'Seek additional support if needed'
        ] : []
    };
}

async function identifyConceptRelationships(concepts: any[]) {
    if (!concepts.length) return [];

    // Use AI to analyze concept relationships for a subset
    const sampleConcepts = concepts.slice(0, 10);
    const relationships = [];

    for (let i = 0; i < sampleConcepts.length; i++) {
        const sourceConcept = sampleConcepts[i];
        const relatedConcepts = sampleConcepts.filter((_, idx) => idx !== i);

        if (relatedConcepts.length > 0) {
            const analysis = await geminiAI.analyzeConceptRelationships({
                sourceConcept,
                relatedConcepts,
                userLevel: 2
            });

            relationships.push({
                concept: sourceConcept.name,
                relationships: analysis.relationships
            });
        }
    }

    return relationships;
}

function calculateConceptCoverage(conceptsByResource: any[]) {
    const totalResources = conceptsByResource.length;
    const resourcesWithConcepts = conceptsByResource.filter(r => r.concepts.length > 0).length;

    return {
        resourceCoverage: totalResources ? resourcesWithConcepts / totalResources : 0,
        averageConceptsPerResource: conceptsByResource.reduce((sum, r) => sum + r.concepts.length, 0) / totalResources,
        distribution: conceptsByResource.map(r => ({
            resourceId: r.resourceId,
            conceptCount: r.concepts.length
        }))
    };
}

function identifyConceptGaps(concepts: any[], departmentName?: string) {
    // Simple gap identification based on common concepts for the department
    const conceptNames = concepts.map(c => c.name.toLowerCase());
    const commonConcepts = getCommonConceptsForDepartment(departmentName);

    return commonConcepts.filter((concept: string) =>
        !conceptNames.some(name => name.includes(concept.toLowerCase()))
    );
}

function calculateConceptRedundancy(concepts: any[]) {
    const conceptCounts = concepts.reduce((acc, concept) => {
        const name = concept.name.toLowerCase();
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const duplicates = Object.entries(conceptCounts)
        .filter(([_, count]) => (count as number) > 1);

    return {
        redundancyScore: duplicates.length / concepts.length,
        duplicatedConcepts: duplicates.map(([name, count]) => ({ name, count })),
        uniqueConceptRatio: Object.keys(conceptCounts).length / concepts.length
    };
}

function calculateResourceUtilization(resources: any[], userPerformance: any) {
    const interactions = userPerformance.interactions;
    const resourceInteractions = resources.map(resource => ({
        resourceId: resource.id,
        title: resource.title,
        interactionCount: interactions.filter((i: any) => i.resourceId === resource.id).length,
        lastAccessed: interactions
            .filter((i: any) => i.resourceId === resource.id)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt
    }));

    return {
        utilized: resourceInteractions.filter(r => r.interactionCount > 0).length,
        total: resources.length,
        utilizationRate: resources.length ? resourceInteractions.filter(r => r.interactionCount > 0).length / resources.length : 0,
        details: resourceInteractions,
        mostAccessed: resourceInteractions.sort((a, b) => b.interactionCount - a.interactionCount).slice(0, 5),
        leastAccessed: resourceInteractions.filter(r => r.interactionCount === 0)
    };
}

function calculateResourceEffectiveness(resources: any[], userPerformance: any) {
    const interactions = userPerformance.interactions;

    return resources.map(resource => {
        const resourceInteractions = interactions.filter((i: any) => i.resourceId === resource.id);
        const avgScore = resourceInteractions.length ?
            resourceInteractions.reduce((sum: number, i: any) => sum + (i.metadata?.score || 0), 0) / resourceInteractions.length : 0;

        return {
            resourceId: resource.id,
            title: resource.title,
            effectivenessScore: avgScore,
            interactionCount: resourceInteractions.length,
            classification: avgScore > 0.7 ? 'HIGH_IMPACT' : avgScore > 0.4 ? 'MEDIUM_IMPACT' : 'LOW_IMPACT'
        };
    }).sort((a, b) => b.effectivenessScore - a.effectivenessScore);
}

function generateResourceRecommendations(resources: any[], utilization: any) {
    const recommendations = [];

    if (utilization.utilizationRate < 0.5) {
        recommendations.push({
            type: 'UTILIZATION',
            message: 'Many resources are underutilized. Consider organizing or highlighting key materials.',
            priority: 'MEDIUM'
        });
    }

    if (utilization.leastAccessed.length > 0) {
        recommendations.push({
            type: 'ACCESSIBILITY',
            message: `${utilization.leastAccessed.length} resources have never been accessed. Review relevance or accessibility.`,
            priority: 'LOW',
            resources: utilization.leastAccessed.slice(0, 3).map((r: any) => r.title)
        });
    }

    return recommendations;
}

function prioritizeResources(resources: any[], userPerformance: any) {
    const effectiveness = calculateResourceEffectiveness(resources, userPerformance);

    return effectiveness.map((resource, index) => ({
        ...resource,
        priority: index < 3 ? 'HIGH' : index < 7 ? 'MEDIUM' : 'LOW',
        recommendedAction: resource.classification === 'HIGH_IMPACT' ? 'PROMOTE' :
            resource.classification === 'LOW_IMPACT' ? 'REVIEW' : 'MAINTAIN'
    }));
}

function identifyResourceGaps(resources: any[], course: any) {
    const resourceTypes = new Set(resources.map(r => r.fileType));
    const expectedTypes = ['pdf', 'docx', 'pptx', 'video'];
    const missingTypes = expectedTypes.filter(type => !resourceTypes.has(type));

    return {
        missingResourceTypes: missingTypes,
        typeDistribution: Array.from(resourceTypes).map(type => ({
            type,
            count: resources.filter(r => r.fileType === type).length
        })),
        recommendations: missingTypes.length > 0 ?
            [`Consider adding ${missingTypes.join(', ')} resources for better coverage`] : []
    };
}

function generateOptimizationSuggestions(resources: any[], utilization: any) {
    const suggestions = [];

    if (utilization.utilizationRate < 0.6) {
        suggestions.push({
            area: 'Resource Discovery',
            suggestion: 'Improve resource organization and search functionality',
            impact: 'MEDIUM'
        });
    }

    if (utilization.leastAccessed.length > resources.length * 0.3) {
        suggestions.push({
            area: 'Content Curation',
            suggestion: 'Review and remove or update underutilized resources',
            impact: 'HIGH'
        });
    }

    return suggestions;
}

function extractKeyMetrics(analysis: any) {
    const metrics: any = {};

    if (analysis.contentStructure) {
        metrics.resourceCount = analysis.contentStructure.totalResources;
        metrics.conceptCount = analysis.contentStructure.totalConcepts;
    }

    if (analysis.performanceInsights) {
        metrics.performanceScore = analysis.performanceInsights.overallScore;
        metrics.engagementLevel = analysis.performanceInsights.engagementLevel;
    }

    if (analysis.difficultyProgression) {
        metrics.progressionQuality = analysis.difficultyProgression.progressionQuality;
    }

    return metrics;
}

function calculateAnalysisConfidence(analysis: any) {
    let confidence = 0.5; // Base confidence
    let factors = 1;

    // Factor in data completeness
    if (analysis.contentStructure?.totalResources > 5) {
        confidence += 0.1;
        factors++;
    }

    if (analysis.performanceInsights?.performanceMetrics?.totalInteractions > 10) {
        confidence += 0.2;
        factors++;
    }

    if (analysis.conceptMapping?.totalConcepts > 10) {
        confidence += 0.1;
        factors++;
    }

    return Math.min(confidence / factors * factors, 1.0);
}

function calculateAnalysisCompleteness(analysis: any, request: CourseAnalysisRequest) {
    const requestedAnalyses = request.analysisType === 'COMPREHENSIVE' ? 6 : 1;
    const completedAnalyses = Object.keys(analysis).length;

    return Math.min(completedAnalyses / requestedAnalyses, 1.0);
}

function getCommonConceptsForDepartment(departmentName?: string) {
    const commonConcepts: any = {
        'Computer Science': ['algorithms', 'data structures', 'programming', 'databases', 'networks'],
        'Mathematics': ['calculus', 'algebra', 'statistics', 'probability', 'geometry'],
        'Physics': ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum mechanics', 'waves'],
        'Chemistry': ['organic chemistry', 'inorganic chemistry', 'physical chemistry', 'biochemistry'],
        'Biology': ['genetics', 'evolution', 'ecology', 'molecular biology', 'physiology']
    };

    return commonConcepts[departmentName || ''] || [];
}

function calculateConsistency(scores: number[]) {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    return Math.max(0, 1 - variance);
}

function calculateTrend(scores: number[]) {
    if (scores.length < 3) return 'STABLE';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (Math.abs(difference) < 0.05) return 'STABLE';
    return difference > 0 ? 'IMPROVING' : 'DECLINING';
}