'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, Sparkles, BookOpen, Loader2 } from 'lucide-react';

interface StudyAssistantProps {
    courseId?: number;
    className?: string;
}

interface Answer {
    id: string;
    question: string;
    answer: string;
    confidence: number;
    sources: Array<{
        resourceId: number;
        title: string;
        snippet: string;
        relevanceScore: number;
    }>;
    timestamp: string;
}

export function StudyAssistant({ courseId, className }: StudyAssistantProps) {
    const [question, setQuestion] = useState('');
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/answer-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question.trim(),
                    courseId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get answer');
            }

            const result = await response.json();

            const newAnswer: Answer = {
                id: Date.now().toString(),
                question: question.trim(),
                answer: result.answer,
                confidence: result.confidence,
                sources: result.sources || [],
                timestamp: result.timestamp
            };

            setAnswers(prev => [newAnswer, ...prev]);
            setQuestion('');
        } catch (error) {
            console.error('Error getting answer:', error);
            setError('Failed to get answer. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
        if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (confidence >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.8) return 'High Confidence';
        if (confidence >= 0.6) return 'Medium Confidence';
        if (confidence >= 0.4) return 'Low Confidence';
        return 'Very Low Confidence';
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>AI Study Assistant</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Question Input */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex space-x-2">
                        <Input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question about your course materials..."
                            disabled={isLoading}
                            maxLength={1000}
                        />
                        <Button type="submit" disabled={!question.trim() || isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </form>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-700">AI is analyzing your question...</span>
                    </div>
                )}

                {/* Answers */}
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {answers.map((answer) => (
                            <div key={answer.id} className="border rounded-lg p-4 space-y-3">
                                {/* Question */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Your Question:</h4>
                                        <Badge className={getConfidenceColor(answer.confidence)}>
                                            {getConfidenceLabel(answer.confidence)}
                                        </Badge>
                                    </div>
                                    <p className="text-sm bg-gray-50 p-3 rounded italic">
                                        &ldquo;{answer.question}&rdquo;
                                    </p>
                                </div>

                                <Separator />

                                {/* Answer */}
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm flex items-center">
                                        <Sparkles className="h-4 w-4 mr-1" />
                                        AI Answer:
                                    </h4>
                                    <div className="prose prose-sm max-w-none">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {answer.answer}
                                        </p>
                                    </div>
                                </div>

                                {/* Sources */}
                                {answer.sources.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm flex items-center">
                                                <BookOpen className="h-4 w-4 mr-1" />
                                                Sources Used:
                                            </h4>
                                            <div className="space-y-2">
                                                {answer.sources.map((source, index) => (
                                                    <div key={index} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium text-blue-700">
                                                                {source.title}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                {Math.round(source.relevanceScore * 100)}% relevant
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 line-clamp-2">
                                                            {source.snippet}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Timestamp */}
                                <div className="text-xs text-gray-400 pt-2">
                                    {new Date(answer.timestamp).toLocaleString()}
                                </div>
                            </div>
                        ))}

                        {answers.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-gray-500">
                                <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">
                                    Ask a question to get AI-powered answers based on your course materials
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}