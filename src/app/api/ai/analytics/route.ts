import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { GeminiAIService } from '@/lib/ai/gemini-service';
import { z } from 'zod';

const AnalyticsRequestSchema = z.object({
    type: z.enum([
        'learning_progress',
        'concept_mastery',
        'study_patterns',
        'resource_effectiveness',
        'knowledge_gaps',
        'peer_comparison'
    ]),
    timeframe: z.enum(['week', 'month', 'semester', 'all']).default('month'),
    courseId: z.number().optional(),
    includeRecommendations: z.boolean().default(true),
    includeInsights: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, timeframe, courseId, includeRecommendations, includeInsights } =
            AnalyticsRequestSchema.parse(body);

        const userId = parseInt(session.user.id);

        // Get analytics data based on type
        let analyticsData;

        switch (type) {
            case 'learning_progress':
                analyticsData = await getLearningProgressAnalytics(userId, timeframe, courseId);
                break;
            case 'concept_mastery':
                analyticsData = await getConceptMasteryAnalytics(userId, timeframe, courseId);
                break;
            case 'study_patterns':
                analyticsData = await getStudyPatternAnalytics(userId, timeframe);
                break;
            case 'resource_effectiveness':
                analyticsData = await getResourceEffectivenessAnalytics(userId, timeframe, courseId);
                break;
            case 'knowledge_gaps':
                analyticsData = await getKnowledgeGapAnalytics(userId, timeframe, courseId);
                break;
            case 'peer_comparison':
                analyticsData = await getPeerComparisonAnalytics(userId, timeframe, courseId);
                break;
            default:
                return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
        }

        // Generate AI insights if requested
        let aiInsights = null;
        if (includeInsights) {
            aiInsights = await generateAIInsights(type, analyticsData, userId);
        }

        // Generate recommendations if requested
        let recommendations = null;
        if (includeRecommendations) {
            recommendations = await generateRecommendations(type, analyticsData, userId);
        }

        // Track analytics request
        await trackAnalyticsRequest(userId, type, timeframe);

        return NextResponse.json({
            type,
            timeframe,
            data: analyticsData,
            insights: aiInsights,
            recommendations,
            metadata: {
                generatedAt: new Date().toISOString(),
                dataPoints: Object.keys(analyticsData).length
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Analytics generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate analytics' },
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
        const type = searchParams.get('type') || 'learning_progress';
        const timeframe = searchParams.get('timeframe') || 'month';
        const courseId = searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!) : undefined;

        // Get basic analytics summary
        const summary = await getAnalyticsSummary(parseInt(session.user.id), timeframe, courseId);

        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics summary' },
            { status: 500 }
        );
    }
}

async function getLearningProgressAnalytics(userId: number, timeframe: string, courseId?: number) {
    const timeFilter = getTimeFilter(timeframe);
    const whereClause: any = { userId, ...timeFilter };
    if (courseId) whereClause.courseId = courseId;

    const [interactions, downloads, studyTime, xpGained] = await Promise.all([
        db.userInteraction.count({ where: whereClause }),
        db.activityLog.count({
            where: {
                userId,
                activityType: 'RESOURCE_DOWNLOAD',
                ...timeFilter
            }
        }),
        db.studySession.aggregate({
            where: { userId, ...timeFilter },
            _sum: { duration: true },
            _count: true
        }),
        db.gamificationEvent.aggregate({
            where: { userId, ...timeFilter },
            _sum: { xpAwarded: true }
        })
    ]);

    // Get daily/weekly breakdown
    const progressBreakdown = await getProgressBreakdown(userId, timeframe, courseId);

    return {
        totalInteractions: interactions,
        totalDownloads: downloads,
        totalStudyTime: studyTime._sum.duration || 0,
        studySessions: studyTime._count,
        xpGained: xpGained._sum.xpAwarded || 0,
        progressBreakdown,
        trend: calculateProgressTrend(progressBreakdown)
    };
}

async function getConceptMasteryAnalytics(userId: number, timeframe: string, courseId?: number) {
    const timeFilter = getTimeFilter(timeframe);

    // Get user's concept interactions
    const conceptInteractions = await db.userInteraction.findMany({
        where: {
            userId,
            ...timeFilter,
            resource: courseId ? { courseId } : undefined
        },
        include: {
            resource: {
                include: {
                    conceptMappings: {
                        include: {
                            concept: true
                        }
                    }
                }
            }
        }
    });

    // Analyze concept mastery
    const conceptMastery: { [key: string]: any } = {};

    conceptInteractions.forEach(interaction => {
        const concepts = interaction.resource?.conceptMappings || [];
        concepts.forEach(cm => {
            const conceptName = cm.concept.name;
            if (!conceptMastery[conceptName]) {
                conceptMastery[conceptName] = {
                    name: conceptName,
                    category: cm.concept.category,
                    interactions: 0,
                    lastInteraction: null,
                    mastery: 'beginner'
                };
            }
            conceptMastery[conceptName].interactions++;
            conceptMastery[conceptName].lastInteraction = interaction.createdAt;
        });
    });

    // Calculate mastery levels
    Object.values(conceptMastery).forEach((concept: any) => {
        if (concept.interactions >= 10) concept.mastery = 'advanced';
        else if (concept.interactions >= 5) concept.mastery = 'intermediate';
    });

    const masteredConcepts = Object.values(conceptMastery).filter((c: any) => c.mastery === 'advanced');
    const learningConcepts = Object.values(conceptMastery).filter((c: any) => c.mastery === 'intermediate');
    const beginnerConcepts = Object.values(conceptMastery).filter((c: any) => c.mastery === 'beginner');

    return {
        totalConcepts: Object.keys(conceptMastery).length,
        masteredConcepts: masteredConcepts.length,
        learningConcepts: learningConcepts.length,
        beginnerConcepts: beginnerConcepts.length,
        conceptDetails: Object.values(conceptMastery),
        masteryDistribution: {
            advanced: masteredConcepts.length,
            intermediate: learningConcepts.length,
            beginner: beginnerConcepts.length
        }
    };
}

async function getStudyPatternAnalytics(userId: number, timeframe: string) {
    const timeFilter = getTimeFilter(timeframe);

    const interactions = await db.userInteraction.findMany({
        where: { userId, ...timeFilter },
        orderBy: { createdAt: 'asc' }
    });

    // Analyze study patterns
    const hourlyPattern: { [key: number]: number } = {};
    const dailyPattern: { [key: number]: number } = {};
    const sessionLengths: number[] = [];

    interactions.forEach(interaction => {
        const date = new Date(interaction.createdAt);
        const hour = date.getHours();
        const day = date.getDay();

        hourlyPattern[hour] = (hourlyPattern[hour] || 0) + 1;
        dailyPattern[day] = (dailyPattern[day] || 0) + 1;
    });

    // Find peak hours and days
    const peakHour = Object.entries(hourlyPattern).sort(([, a], [, b]) => b - a)[0];
    const peakDay = Object.entries(dailyPattern).sort(([, a], [, b]) => b - a)[0];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
        totalSessions: interactions.length,
        hourlyPattern,
        dailyPattern,
        peakStudyHour: peakHour ? parseInt(peakHour[0]) : null,
        peakStudyDay: peakDay ? dayNames[parseInt(peakDay[0])] : null,
        studyFrequency: calculateStudyFrequency(interactions),
        consistency: calculateConsistency(interactions)
    };
}

async function getResourceEffectivenessAnalytics(userId: number, timeframe: string, courseId?: number) {
    const timeFilter = getTimeFilter(timeframe);

    const resourceInteractions = await db.userInteraction.groupBy({
        by: ['resourceId'],
        where: {
            userId,
            ...timeFilter,
            resource: courseId ? { courseId } : undefined
        },
        _count: true,
        _max: {
            createdAt: true
        }
    });

    // Get detailed resource info
    const resourceIds = resourceInteractions.map(ri => ri.resourceId).filter(Boolean);
    const resources = await db.resource.findMany({
        where: { id: { in: resourceIds as number[] } },
        include: {
            course: true,
            extractedQuestions: true
        }
    });

    const effectiveness = resourceInteractions.map(ri => {
        const resource = resources.find(r => r.id === ri.resourceId);
        return {
            resourceId: ri.resourceId,
            title: resource?.title,
            course: resource?.course?.title,
            fileType: resource?.fileType,
            interactions: ri._count,
            lastAccessed: ri._max.createdAt,
            questionsCount: resource?.extractedQuestions.length || 0,
            effectiveness: calculateResourceEffectiveness(ri._count, resource?.extractedQuestions.length || 0)
        };
    });

    return {
        totalResources: effectiveness.length,
        mostUsedResources: effectiveness.sort((a, b) => b.interactions - a.interactions).slice(0, 5),
        leastUsedResources: effectiveness.sort((a, b) => a.interactions - b.interactions).slice(0, 5),
        effectivenessScores: effectiveness.map(e => e.effectiveness),
        averageEffectiveness: effectiveness.reduce((sum, e) => sum + e.effectiveness, 0) / effectiveness.length
    };
}

async function getKnowledgeGapAnalytics(userId: number, timeframe: string, courseId?: number) {
    // Get user's concept interactions
    const conceptMastery = await getConceptMasteryAnalytics(userId, timeframe, courseId);

    // Get available concepts in user's courses
    const userCourses = await db.enrollment.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
            course: {
                include: {
                    resources: {
                        include: {
                            conceptMappings: {
                                include: {
                                    concept: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Extract all available concepts
    const allAvailableConcepts = new Set<string>();
    userCourses.forEach(enrollment => {
        enrollment.course.resources.forEach(resource => {
            resource.conceptMappings.forEach(cm => {
                allAvailableConcepts.add(cm.concept.name);
            });
        });
    });

    // Find gaps
    const masteredConceptNames = conceptMastery.conceptDetails
        .filter((c: any) => c.mastery === 'advanced')
        .map((c: any) => c.name);

    const gaps = Array.from(allAvailableConcepts).filter(
        concept => !masteredConceptNames.includes(concept)
    );

    return {
        totalAvailableConcepts: allAvailableConcepts.size,
        masteredConcepts: masteredConceptNames.length,
        knowledgeGaps: gaps,
        gapPercentage: (gaps.length / allAvailableConcepts.size) * 100,
        priorityGaps: gaps.slice(0, 10) // Top 10 priority gaps
    };
}

async function getPeerComparisonAnalytics(userId: number, timeframe: string, courseId?: number) {
    // Get user's stats
    const userStats = await db.userStats.findUnique({ where: { userId } });

    // Get peer stats (same department or course)
    const user = await db.user.findUnique({
        where: { id: userId },
        include: { department: true }
    });

    const peerStats = await db.userStats.findMany({
        where: {
            user: {
                departmentId: user?.departmentId
            },
            userId: { not: userId }
        }
    });

    if (peerStats.length === 0) {
        return {
            comparison: 'insufficient_data',
            userRank: null,
            percentile: null
        };
    }

    // Calculate comparisons
    const userXP = userStats?.totalXP || 0;
    const betterThanCount = peerStats.filter(ps => userXP > (ps.totalXP || 0)).length;
    const percentile = (betterThanCount / peerStats.length) * 100;

    return {
        userXP,
        averagePeerXP: peerStats.reduce((sum, ps) => sum + (ps.totalXP || 0), 0) / peerStats.length,
        percentile: Math.round(percentile),
        rank: peerStats.length - betterThanCount + 1,
        totalPeers: peerStats.length,
        comparison: percentile > 75 ? 'above_average' : percentile > 50 ? 'average' : 'below_average'
    };
}

async function generateAIInsights(type: string, data: any, userId: number) {
    try {
        const geminiAI = new GeminiAIService();

        const insights = await geminiAI.generateInsights({
            analyticsType: type,
            data,
            userId,
            context: 'student_analytics'
        });

        return insights;
    } catch (error) {
        console.error('Error generating AI insights:', error);
        return null;
    }
}

async function generateRecommendations(type: string, data: any, userId: number) {
    const recommendations = [];

    switch (type) {
        case 'learning_progress':
            if (data.xpGained < 100) {
                recommendations.push({
                    type: 'engagement',
                    priority: 'high',
                    message: 'Consider increasing your study engagement to earn more XP',
                    action: 'Set daily study goals'
                });
            }
            break;

        case 'concept_mastery':
            if (data.beginnerConcepts > 5) {
                recommendations.push({
                    type: 'concept_focus',
                    priority: 'medium',
                    message: 'Focus on mastering basic concepts first',
                    action: 'Create targeted study plans for beginner concepts'
                });
            }
            break;

        case 'study_patterns':
            if (data.consistency < 0.5) {
                recommendations.push({
                    type: 'consistency',
                    priority: 'high',
                    message: 'Try to maintain more consistent study patterns',
                    action: 'Set up daily study reminders'
                });
            }
            break;
    }

    return recommendations;
}

// Helper functions
function getTimeFilter(timeframe: string) {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'semester':
            startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
            break;
        default:
            return {};
    }

    return { createdAt: { gte: startDate } };
}

async function getProgressBreakdown(userId: number, timeframe: string, courseId?: number) {
    // Implementation for progress breakdown over time
    return [];
}

function calculateProgressTrend(breakdown: any[]) {
    if (breakdown.length < 2) return 'stable';

    const recent = breakdown.slice(-5);
    const increasing = recent.every((item, i) => i === 0 || item.value >= recent[i - 1].value);
    const decreasing = recent.every((item, i) => i === 0 || item.value <= recent[i - 1].value);

    if (increasing) return 'increasing';
    if (decreasing) return 'decreasing';
    return 'stable';
}

function calculateStudyFrequency(interactions: any[]) {
    const days = Math.ceil((Date.now() - new Date(interactions[0]?.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return interactions.length / days;
}

function calculateConsistency(interactions: any[]) {
    // Simple consistency calculation based on study distribution
    const dailyCounts: { [key: string]: number } = {};

    interactions.forEach(interaction => {
        const day = new Date(interaction.createdAt).toDateString();
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;

    return 1 / (1 + Math.sqrt(variance));
}

function calculateResourceEffectiveness(interactions: number, questionsCount: number) {
    // Simple effectiveness calculation
    return Math.min(interactions * 0.1 + questionsCount * 0.05, 1.0);
}

async function getAnalyticsSummary(userId: number, timeframe: string, courseId?: number) {
    const [progress, patterns] = await Promise.all([
        getLearningProgressAnalytics(userId, timeframe, courseId),
        getStudyPatternAnalytics(userId, timeframe)
    ]);

    return {
        progress: {
            interactions: progress.totalInteractions,
            studyTime: progress.totalStudyTime,
            xp: progress.xpGained
        },
        patterns: {
            peakHour: patterns.peakStudyHour,
            peakDay: patterns.peakStudyDay,
            consistency: patterns.consistency
        }
    };
}

async function trackAnalyticsRequest(userId: number, type: string, timeframe: string) {
    try {
        await db.userInteraction.create({
            data: {
                userId,
                interactionType: 'ANALYTICS_VIEW',
                metadata: {
                    analyticsType: type,
                    timeframe,
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Error tracking analytics request:', error);
    }
}