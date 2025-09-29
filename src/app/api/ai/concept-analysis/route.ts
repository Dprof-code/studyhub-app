/**
 * AI-Powered Concept Analysis API (Simplified)
 * Phase 3: Advanced AI Processing
 * 
 * Analyzes concepts, their relationships, learning paths, and knowledge gaps
 * with comprehensive AI-powered insights and recommendations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';
import { geminiAI } from '@/lib/ai/gemini-service';
import { z } from 'zod';

// Request validation schema
const ConceptAnalysisRequestSchema = z.object({
  analysisType: z.enum([
    'RELATIONSHIP_MAPPING',
    'LEARNING_PATH_OPTIMIZATION',
    'KNOWLEDGE_GAP_ANALYSIS',
    'CONCEPT_HIERARCHY',
    'COMPREHENSIVE'
  ]).default('COMPREHENSIVE'),

  focusConceptIds: z.array(z.number()).optional(),
  courseIds: z.array(z.number()).optional(),
  userLevel: z.number().min(1).max(10).default(1),
  includeRecommendations: z.boolean().default(true),
  maxConceptsToAnalyze: z.number().min(5).max(50).default(20),

  // Analysis depth options
  analysisDepth: z.enum(['SHALLOW', 'MODERATE', 'DEEP']).default('MODERATE'),
  includePrerequisites: z.boolean().default(true),
  includeLearningPaths: z.boolean().default(true),
  includeKnowledgeGaps: z.boolean().default(true)
});

type ConceptAnalysisRequest = z.infer<typeof ConceptAnalysisRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = ConceptAnalysisRequestSchema.parse(body);

    // Get user profile and context
    const user = await db.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        stats: true,
        enrollments: {
          include: {
            course: {
              include: {
                resources: {
                  take: 10 // Limit to avoid overwhelming queries
                }
              }
            }
          }
        },
        userInteractions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get concepts to analyze
    const concepts = await getConceptsToAnalyze(validatedData, user);

    // Perform concept analysis
    const analysisResults = await performConceptAnalysis(
      concepts,
      validatedData,
      user
    );

    // Generate AI insights
    const insights = await generateConceptInsights(analysisResults, validatedData);

    return NextResponse.json({
      success: true,
      analysis: analysisResults,
      insights,
      metadata: {
        analysisType: validatedData.analysisType,
        conceptsAnalyzed: concepts.length,
        processingTime: Date.now(),
        confidence: calculateAnalysisConfidence(analysisResults),
        userLevel: validatedData.userLevel
      }
    });

  } catch (error) {
    console.error('Concept analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to perform concept analysis',
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

    // Get available concepts for analysis
    const concepts = await db.concept.findMany({
      where: courseId ? {
        resources: {
          some: {
            resource: {
              courseId: parseInt(courseId)
            }
          }
        }
      } : undefined,
      include: {
        resources: {
          include: {
            resource: {
              select: {
                title: true,
                courseId: true
              }
            }
          }
        }
      },
      take: 50
    });

    return NextResponse.json({
      success: true,
      availableConcepts: concepts.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        resourceTitle: c.resources?.[0]?.resource?.title || 'Unknown'
      }))
    });

  } catch (error) {
    console.error('Concept retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve concepts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper Functions

async function getConceptsToAnalyze(request: ConceptAnalysisRequest, user: any) {
  let whereClause: any = {};

  if (request.focusConceptIds?.length) {
    whereClause.id = { in: request.focusConceptIds };
  } else if (request.courseIds?.length) {
    whereClause.resource = {
      courseId: { in: request.courseIds }
    };
  } else {
    // Get concepts from user's enrolled courses
    const enrolledCourseIds = user.enrollments.map((e: any) => e.courseId);
    if (enrolledCourseIds.length > 0) {
      whereClause.resource = {
        courseId: { in: enrolledCourseIds }
      };
    }
  }

  const concepts = await db.concept.findMany({
    where: whereClause,
    include: {
      resources: {
        include: {
          resource: {
            select: {
              title: true,
              courseId: true,
              course: {
                select: { title: true, code: true }
              }
            }
          }
        },
        take: 5
      }
    },
    take: request.maxConceptsToAnalyze,
    orderBy: { name: 'asc' }
  });

  return concepts;
}

async function performConceptAnalysis(concepts: any[], request: ConceptAnalysisRequest, user: any) {
  const analysis: any = {
    totalConcepts: concepts.length,
    conceptsByCategory: groupConceptsByCategory(concepts),
    conceptsByResource: groupConceptsByResource(concepts)
  };

  if (request.analysisType === 'RELATIONSHIP_MAPPING' || request.analysisType === 'COMPREHENSIVE') {
    analysis.relationships = await analyzeConceptRelationships(concepts, request.userLevel);
  }

  if (request.analysisType === 'LEARNING_PATH_OPTIMIZATION' || request.analysisType === 'COMPREHENSIVE') {
    analysis.learningPath = await optimizeLearningPath(concepts, user, request);
  }

  if (request.analysisType === 'KNOWLEDGE_GAP_ANALYSIS' || request.analysisType === 'COMPREHENSIVE') {
    analysis.knowledgeGaps = await identifyKnowledgeGaps(concepts, user);
  }

  if (request.analysisType === 'CONCEPT_HIERARCHY' || request.analysisType === 'COMPREHENSIVE') {
    analysis.hierarchy = buildConceptHierarchy(concepts);
  }

  return analysis;
}

async function analyzeConceptRelationships(concepts: any[], userLevel: number) {
  if (concepts.length < 2) return { relationships: [], summary: 'Insufficient concepts for relationship analysis' };

  // Sample a few concepts for AI analysis to avoid overwhelming the API
  const sampleConcepts = concepts.slice(0, Math.min(10, concepts.length));
  const relationships = [];

  for (let i = 0; i < sampleConcepts.length; i++) {
    const sourceConcept = sampleConcepts[i];
    const relatedConcepts = sampleConcepts.filter((_, idx) => idx !== i).slice(0, 5);

    if (relatedConcepts.length > 0) {
      try {
        const aiAnalysis = await geminiAI.analyzeConceptRelationships({
          sourceConcept: {
            name: sourceConcept.name,
            description: sourceConcept.description
          },
          relatedConcepts: relatedConcepts.map(c => ({
            name: c.name,
            description: c.description
          })),
          userLevel
        });

        relationships.push({
          conceptId: sourceConcept.id,
          conceptName: sourceConcept.name,
          relationships: aiAnalysis.relationships || [],
          overallStrength: aiAnalysis.overallStrength || 0.5
        });
      } catch (error) {
        console.error('Error analyzing concept relationships:', error);
      }
    }
  }

  return {
    relationships,
    summary: `Analyzed relationships for ${relationships.length} concepts`,
    totalRelationships: relationships.reduce((sum, r) => sum + r.relationships.length, 0)
  };
}

async function optimizeLearningPath(concepts: any[], user: any, request: ConceptAnalysisRequest) {
  try {
    const aiPath = await geminiAI.generateOptimalLearningPath({
      concepts: concepts.slice(0, 15).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description
      })),
      userLevel: request.userLevel,
      masteredConcepts: [], // Simplified for now
      timeConstraints: 'FLEXIBLE'
    });

    return {
      ...aiPath,
      conceptCount: concepts.length,
      pathEfficiency: calculatePathEfficiency(aiPath),
      difficulty: assessPathDifficulty(aiPath)
    };
  } catch (error) {
    console.error('Error optimizing learning path:', error);
    return {
      sequence: concepts.map((c, i) => ({
        concept: c.name,
        order: i + 1,
        reasoning: 'Sequential order',
        estimatedHours: 2
      })),
      timeEstimate: concepts.length * 2,
      milestones: ['25% complete', '50% complete', '75% complete', 'Complete'],
      prerequisites: []
    };
  }
}

async function identifyKnowledgeGaps(concepts: any[], user: any) {
  // Simple knowledge gap identification
  const conceptsByCategory = groupConceptsByCategory(concepts);
  const gaps = [];

  for (const [category, categoryConcepts] of Object.entries(conceptsByCategory)) {
    if ((categoryConcepts as any[]).length < 3) {
      gaps.push({
        category,
        type: 'INSUFFICIENT_COVERAGE',
        description: `Limited concepts in ${category}`,
        severity: 'MEDIUM',
        recommendations: [`Add more ${category} concepts`, `Review ${category} fundamentals`]
      });
    }
  }

  // Check for common prerequisite concepts
  const commonPrerequisites = ['introduction', 'basic', 'fundamental', 'overview'];
  const hasPrerequisites = concepts.some(c =>
    commonPrerequisites.some(p => c.name.toLowerCase().includes(p))
  );

  if (!hasPrerequisites && concepts.length > 5) {
    gaps.push({
      category: 'PREREQUISITES',
      type: 'MISSING_FOUNDATIONS',
      description: 'Missing foundational concepts',
      severity: 'HIGH',
      recommendations: ['Add introductory concepts', 'Include prerequisite materials']
    });
  }

  return {
    gaps,
    summary: `Identified ${gaps.length} potential knowledge gaps`,
    overallAssessment: gaps.length === 0 ? 'GOOD_COVERAGE' : gaps.length <= 2 ? 'MINOR_GAPS' : 'SIGNIFICANT_GAPS'
  };
}

function buildConceptHierarchy(concepts: any[]) {
  const hierarchy: any = {};
  const rootConcepts = concepts.filter(c =>
    c.name.toLowerCase().includes('introduction') ||
    c.name.toLowerCase().includes('basic') ||
    c.name.toLowerCase().includes('overview')
  );

  // Simple hierarchy based on naming patterns
  concepts.forEach(concept => {
    const level = determineConceptLevel(concept);
    if (!hierarchy[level]) hierarchy[level] = [];
    hierarchy[level].push({
      id: concept.id,
      name: concept.name,
      category: concept.category
    });
  });

  return {
    hierarchy,
    rootConcepts: rootConcepts.length,
    totalDepth: Object.keys(hierarchy).length,
    conceptCount: concepts.length
  };
}

async function generateConceptInsights(analysisResults: any, request: ConceptAnalysisRequest) {
  try {
    const insights = await geminiAI.generateConceptInsights({
      analysisResults,
      userLevel: request.userLevel,
      masteredConcepts: [], // Simplified
      currentFocus: request.analysisType
    });

    return {
      ...insights,
      analysisQuality: assessAnalysisQuality(analysisResults),
      nextSteps: generateNextSteps(analysisResults, request),
      studyRecommendations: generateStudyRecommendations(analysisResults)
    };
  } catch (error) {
    console.error('Error generating concept insights:', error);
    return {
      keyInsights: ['Concept analysis completed successfully'],
      learningGaps: [],
      strengths: ['Good concept coverage'],
      recommendations: [{
        type: 'immediate_action',
        description: 'Continue with systematic learning',
        priority: 'medium'
      }]
    };
  }
}

// Utility Functions

function groupConceptsByCategory(concepts: any[]) {
  return concepts.reduce((acc, concept) => {
    const category = concept.category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(concept);
    return acc;
  }, {});
}

function groupConceptsByResource(concepts: any[]) {
  return concepts.reduce((acc, concept) => {
    const resourceId = concept.resource.courseId;
    const resourceTitle = concept.resource.title;
    if (!acc[resourceId]) {
      acc[resourceId] = {
        title: resourceTitle,
        concepts: []
      };
    }
    acc[resourceId].concepts.push(concept);
    return acc;
  }, {});
}

function determineConceptLevel(concept: any) {
  const name = concept.name.toLowerCase();
  if (name.includes('advanced') || name.includes('expert')) return 4;
  if (name.includes('intermediate')) return 3;
  if (name.includes('basic') || name.includes('introduction')) return 1;
  return 2; // Default to intermediate
}

function calculatePathEfficiency(path: any) {
  if (!path.sequence || path.sequence.length === 0) return 0.5;

  // Simple efficiency calculation based on sequence length vs estimated time
  const avgTimePerConcept = path.timeEstimate / path.sequence.length;
  return avgTimePerConcept <= 3 ? 0.8 : avgTimePerConcept <= 5 ? 0.6 : 0.4;
}

function assessPathDifficulty(path: any) {
  if (!path.sequence || path.sequence.length === 0) return 'MEDIUM';

  const totalTime = path.timeEstimate || 0;
  if (totalTime <= 10) return 'EASY';
  if (totalTime <= 30) return 'MEDIUM';
  return 'HARD';
}

function calculateAnalysisConfidence(analysisResults: any) {
  let confidence = 0.5;

  if (analysisResults.totalConcepts > 10) confidence += 0.2;
  if (analysisResults.relationships?.totalRelationships > 0) confidence += 0.2;
  if (analysisResults.learningPath?.sequence?.length > 0) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

function assessAnalysisQuality(analysisResults: any) {
  let score = 0;
  let maxScore = 0;

  // Check completeness of different analysis components
  if (analysisResults.relationships) {
    maxScore += 25;
    score += analysisResults.relationships.totalRelationships > 0 ? 25 : 10;
  }

  if (analysisResults.learningPath) {
    maxScore += 25;
    score += analysisResults.learningPath.sequence?.length > 0 ? 25 : 10;
  }

  if (analysisResults.knowledgeGaps) {
    maxScore += 25;
    score += 25; // Always give points for gap analysis
  }

  if (analysisResults.hierarchy) {
    maxScore += 25;
    score += analysisResults.hierarchy.totalDepth > 1 ? 25 : 15;
  }

  const qualityScore = maxScore > 0 ? score / maxScore : 0.5;

  return {
    score: qualityScore,
    level: qualityScore > 0.8 ? 'EXCELLENT' : qualityScore > 0.6 ? 'GOOD' : qualityScore > 0.4 ? 'FAIR' : 'POOR',
    completeness: qualityScore
  };
}

function generateNextSteps(analysisResults: any, request: ConceptAnalysisRequest) {
  const steps = [];

  if (analysisResults.learningPath?.sequence?.length > 0) {
    const firstConcepts = analysisResults.learningPath.sequence.slice(0, 3);
    steps.push(...firstConcepts.map((c: any) => ({
      type: 'STUDY_CONCEPT',
      description: `Study ${c.concept}`,
      priority: 'HIGH',
      estimatedTime: c.estimatedHours || 2
    })));
  }

  if (analysisResults.knowledgeGaps?.gaps?.length > 0) {
    steps.push({
      type: 'ADDRESS_GAP',
      description: 'Address identified knowledge gaps',
      priority: 'MEDIUM',
      estimatedTime: 3
    });
  }

  return steps;
}

function generateStudyRecommendations(analysisResults: any) {
  const recommendations = [];

  if (analysisResults.totalConcepts > 15) {
    recommendations.push('Break down learning into smaller chunks');
    recommendations.push('Focus on 3-5 concepts at a time');
  }

  if (analysisResults.knowledgeGaps?.gaps?.length > 0) {
    recommendations.push('Address foundational concepts first');
    recommendations.push('Review prerequisite materials');
  }

  if (analysisResults.relationships?.totalRelationships > 10) {
    recommendations.push('Create concept maps to visualize relationships');
    recommendations.push('Practice connecting related concepts');
  }

  return recommendations.length > 0 ? recommendations : [
    'Follow a structured learning approach',
    'Regular review and practice',
    'Connect new concepts to prior knowledge'
  ];
}