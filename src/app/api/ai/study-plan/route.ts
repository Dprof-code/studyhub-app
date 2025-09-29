/**
 * AI-Powered Study Plan Generation API
 * Phase 3: Advanced AI Processing
 * 
 * Generates personalized study plans using AI analysis of user progress,
 * goals, preferences, and available resources.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { geminiAI } from '@/lib/ai/gemini-service';
import { trackUserInteraction } from '@/lib/gamification';
import { z } from 'zod';

// Request validation schema
const StudyPlanRequestSchema = z.object({
  // Core parameters
  timeframe: z.enum(['WEEK', 'MONTH', 'QUARTER', 'SEMESTER']).default('MONTH'),
  studyHoursPerWeek: z.number().min(1).max(80).default(10),
  learningStyle: z.enum(['VISUAL', 'AUDITORY', 'KINESTHETIC', 'MIXED']).default('MIXED'),

  // Goals and focus areas
  primaryGoal: z.enum(['EXAM_PREP', 'SKILL_BUILDING', 'RESEARCH', 'GENERAL_LEARNING']).default('GENERAL_LEARNING'),
  focusCourses: z.array(z.number()).optional(),
  focusConcepts: z.array(z.string()).optional(),
  targetDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).optional(),

  // Preferences
  includeBreaks: z.boolean().default(true),
  preferredStudySessions: z.enum(['SHORT', 'MEDIUM', 'LONG']).default('MEDIUM'),
  weekendStudy: z.boolean().default(true),
  prioritizeWeakAreas: z.boolean().default(true),

  // Optional constraints
  deadlines: z.array(z.object({
    description: z.string(),
    date: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM')
  })).optional(),

  // Customization options
  includeRevision: z.boolean().default(true),
  includePracticeTests: z.boolean().default(true),
  adaptiveScheduling: z.boolean().default(true)
});

type StudyPlanRequest = z.infer<typeof StudyPlanRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = StudyPlanRequestSchema.parse(body);

    // Get user's academic profile
    const user = await db.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                resources: {
                  include: {
                    extractedQuestions: true,
                    conceptMappings: true
                  }
                }
              }
            }
          }
        },
        studySessions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        userInteractions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Analyze user's learning patterns
    const learningAnalysis = await analyzeLearningPatterns(user);

    // Generate AI-powered study plan
    const studyPlan = await generateAIStudyPlan(user, validatedData, learningAnalysis);

    // Save study plan to database
    const savedStudyPlan = await db.studyPlan.create({
      data: {
        userId: user.id,
        title: studyPlan.title,
        goals: [validatedData.primaryGoal], // Convert to array
        timeframe: validatedData.timeframe,
        estimatedHours: studyPlan.totalHours,
        plan: studyPlan.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Track user interaction
    await trackUserInteraction({
      userId: user.id,
      type: 'AI_STUDY_PLAN_GENERATED',
      resourceId: savedStudyPlan.id,
      metadata: {
        timeframe: validatedData.timeframe,
        studyHours: validatedData.studyHoursPerWeek,
        primaryGoal: validatedData.primaryGoal
      }
    });

    // Generate additional insights
    const insights = await generateStudyPlanInsights(studyPlan, learningAnalysis, user);

    return NextResponse.json({
      success: true,
      studyPlan: {
        id: savedStudyPlan.id,
        ...studyPlan
      },
      insights,
      analytics: {
        generatedAt: new Date().toISOString(),
        userLevel: learningAnalysis.userLevel,
        recommendationConfidence: learningAnalysis.confidence
      }
    });

  } catch (error) {
    console.error('Study plan generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to generate study plan',
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
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Get user's study plans
    const studyPlans = await db.studyPlan.findMany({
      where: {
        userId: parseInt(session.user.id),
        ...(includeArchived ? {} : { status: 'ACTIVE' })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Calculate progress for each plan
    const plansWithProgress = await Promise.all(
      studyPlans.map(async (plan) => {
        const progress = calculateStudyPlanProgress(plan);
        const nextSession = getNextStudySession(plan);

        return {
          ...plan,
          progress,
          nextSession,
          analytics: {
            totalSessions: 0, // Would need separate query to get user's study sessions
            completedSessions: 0,
            totalStudyTime: 0
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      studyPlans: plansWithProgress,
      summary: {
        totalPlans: studyPlans.length,
        activePlans: studyPlans.filter(p => p.status === 'ACTIVE').length,
        completedPlans: studyPlans.filter(p => p.progress >= 1.0).length
      }
    });

  } catch (error) {
    console.error('Study plans retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve study plans',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper Functions

async function analyzeLearningPatterns(user: any) {
  const recentInteractions = user.userInteractions || [];
  const studySessions = user.studySessions || [];

  // Analyze study patterns
  const studyTimeAnalysis = analyzeStudyTimes(studySessions);
  const performanceAnalysis = analyzePerformance(recentInteractions);
  const courseProgress = analyzeCourseProgress(user.enrollments);

  // Calculate user learning level
  const userLevel = calculateUserLevel(user, recentInteractions);

  return {
    userLevel,
    studyTimePreferences: studyTimeAnalysis,
    performanceMetrics: performanceAnalysis,
    courseProgress,
    preferredDifficulty: inferPreferredDifficulty(recentInteractions),
    strongConcepts: identifyStrongConcepts(recentInteractions),
    weakAreas: identifyWeakAreas(recentInteractions),
    confidence: calculateConfidence(user, recentInteractions)
  };
}

async function generateAIStudyPlan(user: any, request: StudyPlanRequest, analysis: any) {
  // Prepare data for AI
  const coursesToInclude = request.focusCourses?.length
    ? user.enrollments.filter((ec: any) => request.focusCourses!.includes(ec.course.id))
    : user.enrollments;

  const availableResources = coursesToInclude.reduce((acc: any[], ec: any) => {
    return acc.concat(ec.course.resources || []);
  }, []);

  // Use AI to generate comprehensive study plan
  const aiStudyPlan = await geminiAI.generateStudyPlan({
    userProfile: {
      id: user.id,
      level: analysis.userLevel,
      learningStyle: request.learningStyle,
      strongAreas: analysis.strongConcepts,
      weakAreas: analysis.weakAreas
    },
    resources: availableResources,
    timeframe: request.timeframe,
    goals: [request.primaryGoal],
    studyHours: request.studyHoursPerWeek,
    difficultyLevel: request.targetDifficulty || 'MEDIUM'
  });

  // Structure the study plan
  const studyPlan = {
    title: aiStudyPlan.title || `${request.timeframe} Study Plan`,
    description: aiStudyPlan.description || 'AI-generated personalized study plan',
    totalHours: aiStudyPlan.totalHours || request.studyHoursPerWeek * getWeeksInTimeframe(request.timeframe),
    schedule: aiStudyPlan.schedule || [],
    metadata: {
      generatedBy: 'AI',
      userPreferences: request,
      analysisResults: analysis,
      aiRecommendations: aiStudyPlan.recommendations || [],
      revisionSchedule: request.includeRevision ? aiStudyPlan.revisionSchedule : null,
      practiceTests: request.includePracticeTests ? aiStudyPlan.practiceTests : null
    }
  };

  return studyPlan;
}

async function generateStudyPlanInsights(studyPlan: any, analysis: any, user: any) {
  const insights = await geminiAI.generateStudyInsights({
    studyPlan,
    userAnalysis: analysis,
    userHistory: {
      completedSessions: user.studySessions?.length || 0,
      averagePerformance: analysis.performanceMetrics.average || 0.5,
      consistencyScore: analysis.performanceMetrics.consistency || 0.5
    }
  });

  return {
    keyRecommendations: insights.recommendations || [],
    expectedOutcomes: insights.outcomes || [],
    potentialChallenges: insights.challenges || [],
    adaptationSuggestions: insights.adaptations || [],
    motivationalTips: insights.motivation || []
  };
}

// Utility functions
function analyzeStudyTimes(sessions: any[]) {
  if (!sessions.length) return { preferredTime: 'EVENING', averageDuration: 60 };

  const timeDistribution = sessions.reduce((acc, session) => {
    const hour = new Date(session.createdAt).getHours();
    const timeOfDay = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';
    acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
    return acc;
  }, {});

  const preferredTime = Object.entries(timeDistribution).reduce((a, b) => (a as any)[1] > (b as any)[1] ? a : b)[0];
  const averageDuration = sessions.reduce((sum, s) => sum + (s.duration || 60), 0) / sessions.length;

  return { preferredTime, averageDuration, distribution: timeDistribution };
}

function analyzePerformance(interactions: any[]) {
  if (!interactions.length) return { average: 0.5, trend: 'STABLE', consistency: 0.5 };

  const scores = interactions
    .filter(i => i.metadata?.score !== undefined)
    .map(i => i.metadata.score);

  if (!scores.length) return { average: 0.5, trend: 'STABLE', consistency: 0.5 };

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const trend = scores.length > 1 ?
    (scores[scores.length - 1] > scores[0] ? 'IMPROVING' :
      scores[scores.length - 1] < scores[0] ? 'DECLINING' : 'STABLE') : 'STABLE';

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const consistency = Math.max(0, 1 - variance);

  return { average, trend, consistency, scores };
}

function analyzeCourseProgress(enrollments: any[]) {
  return enrollments.map(ec => ({
    courseId: ec.course.id,
    courseName: ec.course.title,
    progress: ec.progress || 0,
    resourcesCount: ec.course.resources?.length || 0,
    conceptsCount: ec.course.resources?.reduce((sum: number, r: any) => sum + (r.extractedQuestions?.length || 0), 0) || 0
  }));
}

function calculateUserLevel(user: any, interactions: any[]) {
  const baseLevel = 1;
  const interactionBonus = Math.floor(interactions.length / 10);
  const performanceBonus = interactions.length > 0 ?
    Math.floor(interactions.reduce((sum, i) => sum + (i.metadata?.score || 0), 0) / interactions.length * 5) : 0;

  return Math.min(10, baseLevel + interactionBonus + performanceBonus);
}

function inferPreferredDifficulty(interactions: any[]) {
  const difficulties = interactions
    .filter(i => i.metadata?.difficulty)
    .map(i => i.metadata.difficulty);

  if (!difficulties.length) return 'MEDIUM';

  const counts = difficulties.reduce((acc, diff) => {
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).reduce((a, b) => (a as any)[1] > (b as any)[1] ? a : b)[0];
}

function identifyStrongConcepts(interactions: any[]) {
  return interactions
    .filter(i => i.metadata?.score > 0.8 && i.metadata?.concepts)
    .reduce((acc: string[], i) => acc.concat(i.metadata.concepts), [])
    .slice(0, 10);
}

function identifyWeakAreas(interactions: any[]) {
  return interactions
    .filter(i => i.metadata?.score < 0.5 && i.metadata?.concepts)
    .reduce((acc: string[], i) => acc.concat(i.metadata.concepts), [])
    .slice(0, 10);
}

function calculateConfidence(user: any, interactions: any[]) {
  const factors = [
    interactions.length > 10 ? 0.3 : interactions.length / 10 * 0.3,
    user.studySessions?.length > 5 ? 0.2 : (user.studySessions?.length || 0) / 5 * 0.2,
    user.enrollments?.length > 0 ? 0.2 : 0,
    interactions.length > 0 ? 0.3 : 0
  ];

  return Math.min(1.0, factors.reduce((sum, f) => sum + f, 0));
}

function getWeeksInTimeframe(timeframe: string) {
  const weeks = { WEEK: 1, MONTH: 4, QUARTER: 12, SEMESTER: 16 };
  return weeks[timeframe as keyof typeof weeks] || 4;
}

function calculateStudyPlanProgress(plan: any) {
  // Since StudyPlan doesn't have direct session relationship, 
  // use the progress field from the plan itself
  const progressPercentage = Math.round(plan.progress * 100);

  return {
    overall: progressPercentage,
    completed: 0, // Would need separate logic to calculate
    total: 1,
    remaining: progressPercentage < 100 ? 1 : 0
  };
}

function getNextStudySession(plan: any) {
  // Since StudyPlan stores schedule in the plan JSON field,
  // we'd need to parse it to get next session
  const schedule = plan.plan?.schedule || [];
  const now = new Date();

  const nextSession = Array.isArray(schedule) ? schedule.find((session: any) =>
    new Date(session.scheduledDate) > now
  ) : null;

  return nextSession || null;
}