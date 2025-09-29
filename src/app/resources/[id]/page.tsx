'use client';

import { useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ResourceComment } from '@/components/resources/ResourceComment';
import { ResourceViewer } from '@/components/resources/ResourceViewer';
import { RelatedResources } from '@/components/resources/RelatedResources';
import { AnalyzeQuestionsPanel } from '@/components/ai/AnalyzeQuestionsPanel';
import { QuestionAnalysisDashboard } from '@/components/ai/QuestionAnalysisDashboard';

type ResourceDetails = {
    id: number;
    title: string;
    description: string;
    fileUrl: string;
    fileType: string;
    courseName: string | null;
    course: {
        id: number;
        code: string;
        title: string;
    } | null;
    uploader: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    year?: number;
    tags: Array<{ id: number; name: string }>;
    createdAt: string;
    isPastQuestion?: boolean;
    aiProcessingStatus?: string;
    _count: {
        reactions: {
            LIKE: number;
            DISLIKE: number;
        };
    };
};

export default function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session } = useSession();
    const [currentPage, setCurrentPage] = useState(1);

    // Unwrap params using React.use()
    const resolvedParams = use(params);

    const { data: resource, isLoading, error } = useQuery<ResourceDetails>({
        queryKey: ['resource', resolvedParams.id],
        queryFn: async () => {
            if (!resolvedParams.id) throw new Error('Resource ID is required');

            const response = await fetch(`/api/resources/${resolvedParams.id}`);
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to fetch resource: ${error}`);
            }
            return response.json();
        },
        enabled: !!resolvedParams.id,
    });

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-destructive">Failed to load resource</p>
                    <Button asChild variant="outline">
                        <Link href="/resources">Back to Resources</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!resource) return null;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - PDF Viewer */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-card rounded-lg overflow-hidden">
                            <ResourceViewer
                                fileUrl={resource.fileUrl}
                                fileType={resource.fileType}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>

                    {/* Right Column - Meta Info & Comments */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Resource Info */}
                        <div className="bg-card rounded-lg p-6 space-y-4">
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold">{resource.title}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Uploaded by</span>
                                    <div className="flex items-center gap-1">
                                        <Avatar
                                            src={resource.uploader.avatarUrl || '/avatar.jpg'}
                                            alt={resource.uploader.username}
                                            className="w-6 h-6"
                                        />
                                        <span>{resource.uploader.firstname} {resource.uploader.lastname}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Course & Tags */}
                            <div className="space-y-2">
                                {resource.course && (
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-muted-foreground">
                                            book
                                        </span>
                                        <span>{resource.course.code} - {resource.course.title}</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {resource.tags.map(tag => (
                                        <Badge key={tag.id} variant="secondary">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <span className="material-symbols-outlined mr-1">thumb_up</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Like this resource</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <span className="material-symbols-outlined mr-1">thumb_down</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Dislike this resource</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <Button asChild>
                                    <a href={resource.fileUrl} download target="_blank" rel="noopener noreferrer">
                                        <span className="material-symbols-outlined mr-2">download</span>
                                        Download
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-card rounded-lg p-6 space-y-4">
                            <h2 className="font-semibold">Comments</h2>
                            <ResourceComment resourceId={resource.id} />
                        </div>

                        {/* AI Analysis Panel */}
                        {(resource.fileType === 'application/pdf' || resource.fileType?.startsWith('image/')) && (
                            <AnalyzeQuestionsPanel
                                resourceId={resource.id}
                                resourceTitle={resource.title}
                            />
                        )}
                    </div>
                </div>

                {/* AI Analysis Dashboard */}
                {resource.isPastQuestion && resource.aiProcessingStatus === 'COMPLETED' && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">AI Question Analysis</h2>
                        <QuestionAnalysisDashboard resourceId={resource.id} />
                    </div>
                )}

                {/* Related Resources */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Related Resources</h2>
                    <RelatedResources
                        courseId={resource.course?.id}
                        currentResourceId={resource.id}
                        tags={resource.tags.map(t => t.name)}
                    />
                </div>
            </div>
        </div>
    );
}