'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Brain, FileText, Target, Clock, CheckCircle2 } from 'lucide-react';

interface AnalyzeQuestionsPanelProps {
    resourceId: number;
    resourceTitle: string;
    onAnalysisComplete?: (results: any) => void;
}

export function AnalyzeQuestionsPanel({
    resourceId,
    resourceTitle,
    onAnalysisComplete
}: AnalyzeQuestionsPanelProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<string>('');
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const startAnalysis = async () => {
        try {
            setIsAnalyzing(true);
            setError(null);
            setProgress(0);
            setStatus('Starting AI analysis...');

            // Start analysis
            const response = await fetch('/api/ai/analyze-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resourceId }),
            });

            if (!response.ok) {
                throw new Error('Failed to start analysis');
            }

            const data = await response.json();
            setJobId(data.jobId);
            setStatus(data.message);

            // Poll for status updates
            pollStatus(data.jobId);
        } catch (error) {
            console.error('Error starting analysis:', error);
            setError('Failed to start AI analysis. Please try again.');
            setIsAnalyzing(false);
        }
    };

    const pollStatus = async (jobId: string) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/ai/processing-status/${jobId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch status');
                }

                const statusData = await response.json();
                setProgress(statusData.progress);
                setStatus(getStatusMessage(statusData.status, statusData.progress));

                if (statusData.status === 'COMPLETED') {
                    clearInterval(pollInterval);
                    setIsAnalyzing(false);
                    setResults(statusData.results);
                    onAnalysisComplete?.(statusData.results);
                } else if (statusData.status === 'FAILED') {
                    clearInterval(pollInterval);
                    setIsAnalyzing(false);
                    setError(statusData.errorMessage || statusData.error || 'Analysis failed');
                }
            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(pollInterval);
                setIsAnalyzing(false);
                setError('Failed to get analysis status');
            }
        }, 2000); // Poll every 2 seconds
    };

    const getStatusMessage = (status: string, progress: number) => {
        const normalizedStatus = status.toUpperCase();
        switch (normalizedStatus) {
            case 'PENDING':
                return 'Queued for processing...';
            case 'PROCESSING':
                if (progress < 30) return 'Extracting text from document...';
                if (progress < 50) return 'Identifying questions with AI...';
                if (progress < 70) return 'Analyzing concepts and topics...';
                if (progress < 90) return 'Finding related resources...';
                return 'Finalizing analysis...';
            case 'COMPLETED':
                return 'Analysis completed successfully!';
            case 'FAILED':
                return 'Analysis failed';
            default:
                return 'Processing...';
        }
    };

    if (results) {
        return (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-green-800">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Analysis Complete!</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white/70 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">
                                {results.questionsExtracted || 0}
                            </div>
                            <div className="text-sm text-green-600">Questions</div>
                        </div>
                        <div className="text-center p-3 bg-white/70 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                                {results.conceptsIdentified || 0}
                            </div>
                            <div className="text-sm text-blue-600">Concepts</div>
                        </div>
                        <div className="text-center p-3 bg-white/70 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">
                                {results.resourceMatches || 0}
                            </div>
                            <div className="text-sm text-purple-600">Resources</div>
                        </div>
                        <div className="text-center p-3 bg-white/70 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">
                                <Sparkles className="h-6 w-6 mx-auto" />
                            </div>
                            <div className="text-sm text-orange-600">AI Insights</div>
                        </div>
                    </div>

                    <Button
                        onClick={() => window.location.href = `/resources/${resourceId}/analysis`}
                        className="w-full"
                    >
                        <Brain className="h-4 w-4 mr-2" />
                        View Detailed Analysis
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Brain className="h-5 w-5" />
                    <span>AI Question Analysis</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isAnalyzing ? (
                    <>
                        <div className="text-center space-y-3">
                            <div className="flex justify-center space-x-4 text-blue-600">
                                <div className="flex flex-col items-center">
                                    <FileText className="h-8 w-8 mb-1" />
                                    <span className="text-xs">Extract Questions</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Target className="h-8 w-8 mb-1" />
                                    <span className="text-xs">Identify Concepts</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Sparkles className="h-8 w-8 mb-1" />
                                    <span className="text-xs">Find Resources</span>
                                </div>
                            </div>

                            <p className="text-sm text-blue-700">
                                Analyze &quot;{resourceTitle}&quot; to extract questions, identify key concepts,
                                and find related study materials using AI.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <Button
                            onClick={startAnalysis}
                            className="w-full"
                            disabled={isAnalyzing}
                        >
                            <Brain className="h-4 w-4 mr-2" />
                            Start AI Analysis
                        </Button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-blue-700 mb-2">{status}</p>
                            <Progress value={progress} className="w-full" />
                            <p className="text-xs text-blue-600 mt-1">{progress}% complete</p>
                        </div>

                        <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
                            <Clock className="h-4 w-4" />
                            <span>This may take 1-3 minutes depending on document size</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}