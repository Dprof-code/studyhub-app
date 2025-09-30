'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Brain, BookOpen, Target, Lightbulb, ExternalLink, Star } from 'lucide-react';

interface Question {
    id: number;
    questionNumber?: string;
    questionText: string;
    marks?: number;
    difficulty: string;
    concepts: Concept[];
}

interface Concept {
    id: number;
    name: string;
    description?: string;
    category: string;
    confidence: number;
    isMainConcept: boolean;
    aiSummary?: string;
    relatedResources: RelatedResource[];
}

interface RelatedResource {
    id: number;
    title: string;
    description?: string;
    fileType: string;
    relevanceScore: number;
    extractedContent?: string;
}

interface QuestionAnalysisDashboardProps {
    resourceId: number;
}

export function QuestionAnalysisDashboard({ resourceId }: QuestionAnalysisDashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

    useEffect(() => {
        fetchAnalysisData();
    }, [resourceId]);

    const fetchAnalysisData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log(`🔍 Fetching analysis data for resource: ${resourceId}`);

            const response = await fetch(`/api/ai/question-concepts/${resourceId}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', response.status, errorText);
                throw new Error(`Failed to fetch analysis data: ${response.status} ${errorText}`);
            }

            const analysisData = await response.json();
            console.log('✅ Analysis data received:', analysisData);

            setData(analysisData);
        } catch (error) {
            console.error('❌ Error fetching analysis data:', error);
            setError(`Failed to load analysis data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toUpperCase()) {
            case 'EASY': return 'bg-green-100 text-green-800 border-green-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'HARD': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'EXPERT': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-orange-600';
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchAnalysisData} className="mt-4">
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.questions?.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Data Available</h3>
                    {!data ? (
                        <p className="text-gray-600 mb-4">No data was returned from the server.</p>
                    ) : (
                        <p className="text-gray-600 mb-4">
                            No questions found in the analysis. The AI analysis may not have been completed yet.
                        </p>
                    )}
                    <div className="text-xs text-gray-500 mb-4">
                        Resource ID: {resourceId} | Data: {data ? 'Present' : 'Missing'}
                        {data && ` | Questions: ${data.questions?.length || 0}`}
                    </div>
                    <Button onClick={fetchAnalysisData} variant="outline">
                        <Brain className="h-4 w-4 mr-2" />
                        Refresh Analysis
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{data.totalQuestions}</div>
                        <div className="text-sm text-gray-600">Questions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{data.totalConcepts}</div>
                        <div className="text-sm text-gray-600">Concepts</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {data.questions.reduce((acc: number, q: Question) =>
                                acc + q.concepts.reduce((sum: number, c: Concept) =>
                                    sum + c.relatedResources.length, 0
                                ), 0
                            )}
                        </div>
                        <div className="text-sm text-gray-600">Resources</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {Math.round(
                                data.questions.reduce((acc: number, q: Question) =>
                                    acc + q.concepts.reduce((sum: number, c: Concept) =>
                                        sum + c.confidence, 0
                                    ) / Math.max(q.concepts.length, 1), 0
                                ) / Math.max(data.questions.length, 1) * 100
                            )}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Confidence</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="questions">Questions</TabsTrigger>
                    <TabsTrigger value="concepts">Concepts</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                        {data.questions.map((question: Question, index: number) => (
                            <AccordionItem key={question.id} value={`question-${question.id}`}>
                                <AccordionTrigger className="text-left">
                                    <div className="flex items-center justify-between w-full mr-4">
                                        <div>
                                            <div className="font-medium">
                                                {question.questionNumber || `Question ${index + 1}`}
                                            </div>
                                            <div className="text-sm text-gray-600 truncate max-w-md">
                                                {question.questionText.slice(0, 100)}...
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {question.marks && (
                                                <Badge variant="outline">{question.marks} marks</Badge>
                                            )}
                                            <Badge className={getDifficultyColor(question.difficulty)}>
                                                {question.difficulty}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm">{question.questionText}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="font-medium flex items-center">
                                                <Target className="h-4 w-4 mr-2" />
                                                Key Concepts ({question.concepts.length})
                                            </h4>

                                            <div className="grid gap-3">
                                                {question.concepts.map((concept: Concept) => (
                                                    <div key={concept.id} className="border rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center space-x-2">
                                                                <h5 className="font-medium">{concept.name}</h5>
                                                                {concept.isMainConcept && (
                                                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Badge variant="secondary">{concept.category}</Badge>
                                                                <span className={`text-sm font-medium ${getConfidenceColor(concept.confidence)}`}>
                                                                    {Math.round(concept.confidence * 100)}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {concept.description && (
                                                            <p className="text-sm text-gray-600 mb-2">{concept.description}</p>
                                                        )}

                                                        {concept.relatedResources.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-sm font-medium mb-2">Related Resources:</p>
                                                                <div className="space-y-1">
                                                                    {concept.relatedResources.slice(0, 3).map((resource: RelatedResource) => (
                                                                        <div key={resource.id} className="flex items-center justify-between text-sm">
                                                                            <span className="truncate">{resource.title}</span>
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="text-gray-500">
                                                                                    {Math.round(resource.relevanceScore * 100)}%
                                                                                </span>
                                                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                                                    <ExternalLink className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>

                <TabsContent value="concepts" className="space-y-4">
                    <div className="space-y-4">
                        {/* Concepts grouped by category */}
                        {(Object.entries(
                            data.questions.reduce((acc: Record<string, Concept[]>, question: Question) => {
                                question.concepts.forEach((concept: Concept) => {
                                    if (!acc[concept.category]) {
                                        acc[concept.category] = [];
                                    }
                                    // Only add if not already present (avoid duplicates)
                                    if (!acc[concept.category].find(c => c.id === concept.id)) {
                                        acc[concept.category].push(concept);
                                    }
                                });
                                return acc;
                            }, {})
                        ) as [string, Concept[]][]).map(([category, concepts]) => (
                            <Card key={category}>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <BookOpen className="h-5 w-5 mr-2" />
                                        {category} ({concepts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3">
                                        {concepts.map((concept: Concept) => (
                                            <div key={concept.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium">{concept.name}</h4>
                                                        {concept.isMainConcept && (
                                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${getConfidenceColor(concept.confidence)}`}>
                                                        {Math.round(concept.confidence * 100)}% confidence
                                                    </span>
                                                </div>

                                                {concept.description && (
                                                    <p className="text-gray-600 text-sm mb-3">{concept.description}</p>
                                                )}

                                                {concept.aiSummary && (
                                                    <div className="bg-blue-50 p-3 rounded mb-3">
                                                        <p className="text-sm text-blue-800">
                                                            <Brain className="h-4 w-4 inline mr-1" />
                                                            AI Summary: {concept.aiSummary}
                                                        </p>
                                                    </div>
                                                )}

                                                {concept.relatedResources.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                                            Related Resources ({concept.relatedResources.length}):
                                                        </p>
                                                        <div className="space-y-2">
                                                            {concept.relatedResources.map((resource: RelatedResource) => (
                                                                <div key={resource.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium">{resource.title}</p>
                                                                        {resource.description && (
                                                                            <p className="text-xs text-gray-600">{resource.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {resource.fileType}
                                                                        </Badge>
                                                                        <span className="text-xs text-gray-500">
                                                                            {Math.round(resource.relevanceScore * 100)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    <div className="space-y-4">
                        {/* All related resources aggregated */}
                        {(() => {
                            const allResources: RelatedResource[] = [];
                            data.questions.forEach((question: Question) => {
                                question.concepts.forEach((concept: Concept) => {
                                    concept.relatedResources.forEach((resource: RelatedResource) => {
                                        // Only add if not already present (avoid duplicates)
                                        if (!allResources.find(r => r.id === resource.id)) {
                                            allResources.push(resource);
                                        }
                                    });
                                });
                            });

                            // Group by file type
                            const resourcesByType = allResources.reduce((acc: Record<string, RelatedResource[]>, resource) => {
                                if (!acc[resource.fileType]) {
                                    acc[resource.fileType] = [];
                                }
                                acc[resource.fileType].push(resource);
                                return acc;
                            }, {});

                            return Object.entries(resourcesByType).map(([fileType, resources]) => (
                                <Card key={fileType}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <ExternalLink className="h-5 w-5 mr-2" />
                                            {fileType.toUpperCase()} Resources ({resources.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3">
                                            {resources
                                                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                                                .map((resource: RelatedResource) => (
                                                    <div key={resource.id} className="border rounded-lg p-4">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <h4 className="font-medium text-lg mb-1">{resource.title}</h4>
                                                                {resource.description && (
                                                                    <p className="text-gray-600 text-sm mb-2">{resource.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end space-y-1">
                                                                <Badge variant="outline">
                                                                    {resource.fileType}
                                                                </Badge>
                                                                <div className="text-right">
                                                                    <span className={`text-sm font-medium ${getConfidenceColor(resource.relevanceScore)}`}>
                                                                        {Math.round(resource.relevanceScore * 100)}% relevance
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {resource.extractedContent && (
                                                            <div className="bg-gray-50 p-3 rounded">
                                                                <p className="text-sm text-gray-700 mb-1 font-medium">Extracted Content:</p>
                                                                <p className="text-sm text-gray-600">{resource.extractedContent}</p>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-between">
                                                            <div className="text-xs text-gray-500">
                                                                Resource ID: {resource.id}
                                                            </div>
                                                            <Button size="sm" variant="outline">
                                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                                View Resource
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ));
                        })()}

                        {/* Summary Statistics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Lightbulb className="h-5 w-5 mr-2" />
                                    Resource Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded">
                                        <h4 className="font-medium text-blue-900 mb-2">Most Relevant Resources</h4>
                                        <p className="text-blue-700 text-sm">
                                            {(() => {
                                                const allResources: RelatedResource[] = [];
                                                data.questions.forEach((question: Question) => {
                                                    question.concepts.forEach((concept: Concept) => {
                                                        concept.relatedResources.forEach((resource: RelatedResource) => {
                                                            if (!allResources.find(r => r.id === resource.id)) {
                                                                allResources.push(resource);
                                                            }
                                                        });
                                                    });
                                                });
                                                const topResource = allResources.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
                                                return topResource ? `${topResource.title} (${Math.round(topResource.relevanceScore * 100)}% relevance)` : 'None found';
                                            })()}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded">
                                        <h4 className="font-medium text-green-900 mb-2">Resource Coverage</h4>
                                        <p className="text-green-700 text-sm">
                                            {(() => {
                                                const allResources: RelatedResource[] = [];
                                                data.questions.forEach((question: Question) => {
                                                    question.concepts.forEach((concept: Concept) => {
                                                        concept.relatedResources.forEach((resource: RelatedResource) => {
                                                            if (!allResources.find(r => r.id === resource.id)) {
                                                                allResources.push(resource);
                                                            }
                                                        });
                                                    });
                                                });
                                                const avgRelevance = allResources.length > 0
                                                    ? allResources.reduce((sum, r) => sum + r.relevanceScore, 0) / allResources.length
                                                    : 0;
                                                return `${allResources.length} unique resources with ${Math.round(avgRelevance * 100)}% average relevance`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}