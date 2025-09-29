'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { QuestionAnalysisDashboard } from '@/components/ai/QuestionAnalysisDashboard';
import { StudyAssistant } from '@/components/ai/StudyAssistant';

export default function ResourceAnalysisPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = use(params);
    const resourceId = parseInt(resolvedParams.id);

    // Fetch basic resource info
    const { data: resource, isLoading } = useQuery({
        queryKey: ['resource', resourceId],
        queryFn: async () => {
            const response = await fetch(`/api/resources/${resourceId}`);
            if (!response.ok) throw new Error('Failed to fetch resource');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!resource) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Resource Not Found</h1>
                    <Link href="/resources">
                        <Button>Back to Resources</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <Link href={`/resources/${resourceId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Resource
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">AI Analysis</h1>
                        <p className="text-gray-600">{resource.title}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Analysis Dashboard */}
                    <div className="lg:col-span-2">
                        <QuestionAnalysisDashboard resourceId={resourceId} />
                    </div>

                    {/* Study Assistant Sidebar */}
                    <div className="lg:col-span-1">
                        <StudyAssistant
                            courseId={resource.course?.id}
                            className="sticky top-4"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}