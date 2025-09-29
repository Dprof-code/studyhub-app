import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { GeminiAIService } from '@/lib/ai/gemini-service';
import { z } from 'zod';

const SearchRequestSchema = z.object({
    query: z.string().min(1).max(500),
    searchType: z.enum(['semantic', 'concept', 'question', 'hybrid']).default('hybrid'),
    filters: z.object({
        courseId: z.number().optional(),
        fileType: z.string().optional(),
        concepts: z.array(z.string()).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        dateRange: z.object({
            start: z.string().optional(),
            end: z.string().optional()
        }).optional()
    }).optional(),
    options: z.object({
        limit: z.number().min(1).max(50).default(20),
        includeSnippets: z.boolean().default(true),
        includeSimilar: z.boolean().default(true),
        includeQuestions: z.boolean().default(true),
        includeAnalytics: z.boolean().default(false),
        responseStyle: z.enum(['concise', 'detailed', 'academic']).default('detailed')
    }).optional(),
    context: z.object({
        currentResource: z.number().optional(),
        studyGoal: z.string().optional(),
        urgency: z.enum(['low', 'medium', 'high']).optional()
    }).optional()
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const searchRequest = SearchRequestSchema.parse(body);
        const userId = parseInt(session.user.id);

        // Get user context for personalization
        const userContext = await getUserSearchContext(userId);

        // Perform the search based on type
        const searchResults = await performSearch(searchRequest, userContext, userId);

        // Enhance results with AI insights if requested
        let aiInsights = null;
        if (searchRequest.options?.includeAnalytics) {
            aiInsights = await generateSearchInsights(searchRequest.query, searchResults, userContext);
        }

        // Generate contextual recommendations
        const recommendations = await generateContextualRecommendations(
            searchRequest,
            searchResults,
            userContext
        );

        // Track search for analytics and recommendations
        await trackAdvancedSearch(userId, searchRequest, searchResults.length);

        // Format response based on style preference
        const formattedResults = await formatSearchResults(
            searchResults,
            searchRequest.options?.responseStyle || 'detailed',
            searchRequest.options || {}
        );

        return NextResponse.json({
            query: searchRequest.query,
            searchType: searchRequest.searchType,
            results: formattedResults,
            totalFound: searchResults.length,
            insights: aiInsights,
            recommendations,
            userContext: {
                level: userContext.studyLevel,
                courses: userContext.enrolledCourses.length,
                searchHistory: userContext.recentSearches.length
            },
            metadata: {
                searchTime: new Date().toISOString(),
                processingTime: Date.now() // This would be calculated properly in production
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid search request', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Advanced search error:', error);
        return NextResponse.json(
            { error: 'Search failed' },
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
        const query = searchParams.get('q');
        const limit = parseInt(searchParams.get('limit') || '10');
        const type = searchParams.get('type') || 'hybrid';

        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        // Quick search with minimal processing
        const quickResults = await performQuickSearch(query, parseInt(session.user.id), limit, type);

        return NextResponse.json({
            query,
            results: quickResults,
            totalFound: quickResults.length
        });

    } catch (error) {
        console.error('Quick search error:', error);
        return NextResponse.json(
            { error: 'Quick search failed' },
            { status: 500 }
        );
    }
}

async function getUserSearchContext(userId: number) {
    const [user, enrollments, recentInteractions, searchHistory] = await Promise.all([
        db.user.findUnique({
            where: { id: userId },
            include: {
                department: true,
                stats: true
            }
        }),
        db.enrollment.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                course: {
                    include: {
                        department: true
                    }
                }
            }
        }),
        db.userInteraction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        }),
        db.userInteraction.findMany({
            where: {
                userId,
                interactionType: { in: ['SEARCH', 'ADVANCED_SEARCH'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    ]);

    // Determine user's study level and preferences
    const studyLevel = determineUserLevel(user?.stats, enrollments);
    const preferredTopics = extractPreferredTopics(recentInteractions);

    return {
        id: userId,
        studyLevel,
        department: user?.department,
        enrolledCourses: enrollments.map(e => e.course),
        preferredTopics,
        recentSearches: searchHistory,
        stats: user?.stats
    };
}

async function performSearch(searchRequest: any, userContext: any, userId: number) {
    const { query, searchType, filters, options } = searchRequest;

    switch (searchType) {
        case 'semantic':
            return await performSemanticSearch(query, filters, options, userContext);
        case 'concept':
            return await performConceptSearch(query, filters, options, userContext);
        case 'question':
            return await performQuestionSearch(query, filters, options, userContext);
        case 'hybrid':
        default:
            return await performHybridSearch(query, filters, options, userContext);
    }
}

async function performSemanticSearch(query: string, filters: any, options: any, userContext: any) {
    // Build search conditions
    const whereClause: any = {};

    // Apply filters
    if (filters) {
        if (filters.courseId) whereClause.courseId = filters.courseId;
        if (filters.fileType) whereClause.fileType = filters.fileType;
        if (filters.concepts && filters.concepts.length > 0) {
            whereClause.conceptMappings = {
                some: {
                    concept: {
                        name: { in: filters.concepts }
                    }
                }
            };
        }
    }

    // Prefer user's enrolled courses if no specific course filter
    if (!filters?.courseId && userContext.enrolledCourses.length > 0) {
        whereClause.courseId = {
            in: userContext.enrolledCourses.map((c: any) => c.id)
        };
    }

    // Search using text similarity for now (in production, use vector embeddings)
    const resources = await db.resource.findMany({
        where: {
            ...whereClause,
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        },
        include: {
            course: true,
            conceptMappings: {
                include: {
                    concept: true
                }
            },
            extractedQuestions: {
                take: 3
            },
            uploader: {
                select: {
                    username: true
                }
            },
            aiProcessingJobs: {
                take: 1,
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
        take: options?.limit || 20
    });

    // Calculate semantic similarity scores (simplified)
    return resources.map(resource => ({
        ...resource,
        relevanceScore: calculateRelevanceScore(query, resource, userContext),
        matchType: 'semantic'
    }));
}

async function performConceptSearch(query: string, filters: any, options: any, userContext: any) {
    // Search for concepts first
    const concepts = await db.concept.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        },
        include: {
            resources: {
                include: {
                    resource: {
                        include: {
                            course: true,
                            extractedQuestions: { take: 3 },
                            uploader: { select: { username: true } }
                        }
                    }
                }
            }
        },
        take: 10
    });

    // Extract resources from concept mappings
    const resources = concepts.flatMap(concept =>
        concept.resources.map(mapping => ({
            ...mapping.resource,
            relevanceScore: calculateConceptRelevance(query, concept),
            matchedConcept: concept.name,
            matchType: 'concept'
        }))
    );

    // Remove duplicates and apply filters
    const uniqueResources = Array.from(
        new Map(resources.map(r => [r.id, r])).values()
    );

    return uniqueResources.slice(0, options?.limit || 20);
}

async function performQuestionSearch(query: string, filters: any, options: any, userContext: any) {
    const whereClause: any = {
        OR: [
            { question: { contains: query, mode: 'insensitive' } },
            { answer: { contains: query, mode: 'insensitive' } }
        ]
    };

    // Apply resource filters
    if (filters?.courseId) {
        whereClause.resource = { courseId: filters.courseId };
    }

    const questions = await db.extractedQuestion.findMany({
        where: whereClause,
        include: {
            resource: {
                include: {
                    course: true,
                    conceptMappings: {
                        include: {
                            concept: true
                        }
                    },
                    uploader: {
                        select: {
                            username: true
                        }
                    }
                }
            }
        },
        take: options?.limit || 20
    });

    // Group by resource and calculate relevance
    const resourceMap = new Map();

    questions.forEach(question => {
        if (!resourceMap.has(question.resourceId)) {
            resourceMap.set(question.resourceId, {
                ...question.resource,
                matchedQuestions: [],
                relevanceScore: 0,
                matchType: 'question'
            });
        }

        const resource = resourceMap.get(question.resourceId);
        resource.matchedQuestions.push(question);
        resource.relevanceScore += calculateQuestionRelevance(query, question);
    });

    return Array.from(resourceMap.values());
}

async function performHybridSearch(query: string, filters: any, options: any, userContext: any) {
    // Combine results from multiple search types
    const [semanticResults, conceptResults, questionResults] = await Promise.all([
        performSemanticSearch(query, filters, { limit: 10 }, userContext),
        performConceptSearch(query, filters, { limit: 10 }, userContext),
        performQuestionSearch(query, filters, { limit: 10 }, userContext)
    ]);

    // Merge and deduplicate results
    const allResults = [...semanticResults, ...conceptResults, ...questionResults];
    const uniqueResults = Array.from(
        new Map(allResults.map(r => [r.id, r])).values()
    );

    // Sort by relevance and apply limit
    const sortedResults = uniqueResults
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, options?.limit || 20);

    return sortedResults;
}

async function performQuickSearch(query: string, userId: number, limit: number, type: string) {
    // Simplified search for GET endpoint
    const userContext = await getUserSearchContext(userId);

    return await performSemanticSearch(
        query,
        null,
        { limit },
        userContext
    );
}

async function generateSearchInsights(query: string, results: any[], userContext: any) {
    try {
        const geminiAI = new GeminiAIService();

        const insights = await geminiAI.generateSearchInsights({
            query,
            resultsCount: results.length,
            userLevel: userContext.studyLevel,
            topConcepts: extractTopConcepts(results),
            userCourses: userContext.enrolledCourses.map((c: any) => c.name)
        });

        return insights;
    } catch (error) {
        console.error('Error generating search insights:', error);
        return null;
    }
}

async function generateContextualRecommendations(searchRequest: any, results: any[], userContext: any) {
    const recommendations = [];

    // Recommend similar searches
    if (results.length > 0) {
        const topConcepts = extractTopConcepts(results);
        if (topConcepts.length > 0) {
            recommendations.push({
                type: 'related_search',
                title: 'Explore Related Concepts',
                items: topConcepts.slice(0, 3),
                action: 'search_concept'
            });
        }
    }

    // Recommend study resources based on gaps
    const enrolledCourseIds = userContext.enrolledCourses.map((c: any) => c.id);
    if (enrolledCourseIds.length > 0 && results.length < 5) {
        recommendations.push({
            type: 'course_resources',
            title: 'More Resources from Your Courses',
            action: 'browse_course',
            courses: userContext.enrolledCourses.slice(0, 2)
        });
    }

    // Recommend study plan if no current context
    if (!searchRequest.context?.currentResource) {
        recommendations.push({
            type: 'study_plan',
            title: 'Create Study Plan',
            description: 'Generate a personalized study plan based on your search',
            action: 'create_study_plan'
        });
    }

    return recommendations;
}

async function formatSearchResults(results: any[], style: string, options: any) {
    return results.map(resource => {
        const baseResult = {
            id: resource.id,
            title: resource.title,
            course: resource.course?.title,
            fileType: resource.fileType,
            relevanceScore: resource.relevanceScore,
            matchType: resource.matchType,
            createdAt: resource.createdAt
        };

        if (style === 'concise') {
            return baseResult;
        }

        // Add more details for detailed/academic styles
        const detailedResult: any = {
            ...baseResult,
            description: resource.description,
            uploader: resource.uploader?.username,
            concepts: resource.conceptMappings?.map((cm: any) => cm.concept.name) || [],
            downloadUrl: resource.downloadUrl
        };

        if (options.includeQuestions && resource.extractedQuestions) {
            detailedResult.sampleQuestions = resource.extractedQuestions.slice(0, 2);
        }

        if (options.includeSnippets && (resource.ragContent || resource.description)) {
            const content = resource.ragContent || resource.description || '';
            detailedResult.snippet = content.substring(0, 200) + (content.length > 200 ? '...' : '');
        }

        if (resource.matchedQuestions) {
            detailedResult.matchedQuestions = resource.matchedQuestions.slice(0, 3);
        }

        return detailedResult;
    });
}

// Helper functions
function determineUserLevel(stats: any, enrollments: any[]) {
    if (!stats) return 'beginner';

    const totalXP = stats.totalXP || 0;
    const courseCount = enrollments.length;

    if (totalXP > 1000 && courseCount > 3) return 'advanced';
    if (totalXP > 500 || courseCount > 1) return 'intermediate';
    return 'beginner';
}

function extractPreferredTopics(interactions: any[]) {
    const topicCount: { [key: string]: number } = {};

    interactions.forEach(interaction => {
        if (interaction.metadata?.topics) {
            interaction.metadata.topics.forEach((topic: string) => {
                topicCount[topic] = (topicCount[topic] || 0) + 1;
            });
        }
    });

    return Object.keys(topicCount)
        .sort((a, b) => topicCount[b] - topicCount[a])
        .slice(0, 5);
}

function calculateRelevanceScore(query: string, resource: any, userContext: any): number {
    let score = 0;

    // Text similarity
    const titleMatch = resource.title.toLowerCase().includes(query.toLowerCase()) ? 0.4 : 0;
    const descMatch = resource.description?.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0;
    score += titleMatch + descMatch;

    // Course preference boost
    const userCourseIds = userContext.enrolledCourses.map((c: any) => c.id);
    if (userCourseIds.includes(resource.courseId)) {
        score += 0.2;
    }

    // Recency boost
    const daysSince = (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) score += 0.1;

    return Math.min(score, 1.0);
}

function calculateConceptRelevance(query: string, concept: any): number {
    const nameMatch = concept.name.toLowerCase().includes(query.toLowerCase()) ? 0.8 : 0;
    const descMatch = concept.description?.toLowerCase().includes(query.toLowerCase()) ? 0.4 : 0;
    return Math.min(nameMatch + descMatch, 1.0);
}

function calculateQuestionRelevance(query: string, question: any): number {
    const qMatch = question.question.toLowerCase().includes(query.toLowerCase()) ? 0.6 : 0;
    const aMatch = question.answer?.toLowerCase().includes(query.toLowerCase()) ? 0.4 : 0;
    return Math.min(qMatch + aMatch, 1.0);
}

function extractTopConcepts(results: any[]): string[] {
    const conceptCount: { [key: string]: number } = {};

    results.forEach(resource => {
        resource.conceptMappings?.forEach((cm: any) => {
            conceptCount[cm.concept.name] = (conceptCount[cm.concept.name] || 0) + 1;
        });
    });

    return Object.keys(conceptCount)
        .sort((a, b) => conceptCount[b] - conceptCount[a])
        .slice(0, 5);
}

async function trackAdvancedSearch(userId: number, searchRequest: any, resultCount: number) {
    try {
        await db.userInteraction.create({
            data: {
                userId,
                interactionType: 'ADVANCED_SEARCH',
                metadata: {
                    query: searchRequest.query,
                    searchType: searchRequest.searchType,
                    filters: searchRequest.filters,
                    resultCount,
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Error tracking advanced search:', error);
    }
}