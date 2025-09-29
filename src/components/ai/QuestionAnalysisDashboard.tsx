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
            const response = await fetch(`/api/ai/question-concepts/${resourceId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch analysis data');
            }

            const analysisData = await response.json();
            setData(analysisData);
        } catch (error) {
            console.error('Error fetching analysis data:', error);
            setError('Failed to load analysis data');
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

    if (!data || data.questions.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No analysis data available. Please run AI analysis first.</p>
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
                    {/* Concept overview will be implemented here */}
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-gray-600">Concept overview coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    {/* Resource recommendations will be implemented here */}
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-gray-600">Resource recommendations coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}