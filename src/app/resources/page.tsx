'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useIntersection } from '@mantine/hooks';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentVoting } from '@/components/gamification';
import { TrackPageView } from '@/components/gamification/ActivityTracker';
import { RecommendationInsights } from '@/components/recommendations/RecommendationInsights';
import { Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

type Department = {
    id: number;
    name: string;
};

type Resource = {
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
        department: {
            id: number;
            name: string;
        };
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
};

const ITEMS_PER_PAGE = 12;
const AVAILABLE_TAGS = [
    'past-question',
    'lecture-note',
    'assignment',
    'project',
    'tutorial',
    'concept',
    'topic',
    'reference',
    'example',
];

export default function ResourcesPage() {
    const router = useRouter();
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'recommended'>('recommended');

    const { ref, entry } = useIntersection({
        root: null,
        threshold: 1,
    });

    const { data: departments } = useQuery<Department[]>({
        queryKey: ['departments'],
        queryFn: async () => {
            const response = await fetch('/api/fetch/departments');
            if (!response.ok) throw new Error('Failed to fetch departments');
            return response.json();
        },
    });

    // Fetch personalized recommendations
    const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery<{
        recommendations: Resource[];
        total: number;
    }>({
        queryKey: ['recommendations'],
        queryFn: async () => {
            const response = await fetch('/api/recommendations?limit=50');
            if (!response.ok) throw new Error('Failed to fetch recommendations');
            return response.json();
        },
    });

    const fetchResources = async ({ pageParam = 0 }) => {
        const searchParams = new URLSearchParams({
            page: pageParam.toString(),
            limit: ITEMS_PER_PAGE.toString(),
            ...(selectedTags.length && { tags: selectedTags.join(',') }),
            ...(selectedTypes.length && { types: selectedTypes.join(',') }),
            ...(selectedDepartments.length && { departments: selectedDepartments.join(',') }),
            ...(selectedYears.length && { years: selectedYears.join(',') }),
            ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/resources?${searchParams}`);
        if (!response.ok) throw new Error('Failed to fetch resources');
        return response.json();
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['resources', selectedTags, selectedTypes, selectedDepartments, selectedYears, searchQuery],
        queryFn: fetchResources,
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.nextCursor : undefined,
    });

    useEffect(() => {
        if (entry?.isIntersecting && hasNextPage) {
            fetchNextPage();
        }
    }, [entry, fetchNextPage, hasNextPage]);

    const getThumbnail = (fileType: string, fileUrl: string) => {
        if (fileType.startsWith('image/')) {
            return fileUrl;
        }

        // Return appropriate icon based on file type
        return `/icons/${fileType.split('/')[1]}.svg`;
    };

    const renderResourceGrid = (resources: Resource[], isRecommended = false) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource: Resource, idx: number) => (
                <div key={resource.id}>
                    <Link href={`/resources/${resource.id}`}>
                        <div
                            ref={!isRecommended && idx === resources.length - 1 ? ref : null}
                            className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                            {isRecommended && (
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-t-lg">
                                    <div className="flex items-center space-x-1">
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-medium">Recommended for you</span>
                                    </div>
                                </div>
                            )}
                            <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                <Image
                                    src={getThumbnail(resource.fileType, resource.fileUrl)}
                                    alt={resource.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold mb-2 line-clamp-2">
                                    {resource.title}
                                </h3>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {resource.tags.map((tag) => (
                                        <Badge key={tag.id} variant="secondary">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            src={resource.uploader.avatarUrl || '/avatar.jpg'}
                                            alt={resource.uploader.username}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {resource.uploader.firstname} {resource.uploader.lastname}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(resource.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                    {/* Voting Section - Outside the Link */}
                    <div className="px-4 pb-4 bg-card rounded-b-lg -mt-4 relative z-10">
                        <div className="border-t pt-3">
                            <ContentVoting
                                contentId={resource.id}
                                contentType="resource"
                                size="sm"
                                showDetails={false}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <TrackPageView page="resources" delay={2000} />
            <div className="container mx-auto px-4 py-8">
                <div className="flex gap-6">
                    {/* Filters Sidebar */}
                    <div className="w-64 flex-shrink-0 h-[calc(100vh-2rem)] sticky top-4">
                        <div className="overflow-y-auto h-full pr-4">
                            <Input
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="mb-4"
                            />

                            <Accordion type="single" collapsible>
                                <AccordionItem value="department">
                                    <AccordionTrigger>Department</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            {departments?.map((department) => (
                                                <div key={department.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`department-${department.id}`}
                                                        checked={selectedDepartments.includes(department.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedDepartments([...selectedDepartments, department.id]);
                                                            } else {
                                                                setSelectedDepartments(
                                                                    selectedDepartments.filter(id => id !== department.id)
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`department-${department.id}`}
                                                        className="text-sm"
                                                    >
                                                        {department.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="file-type">
                                    <AccordionTrigger>File Type</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            {['PDF', 'Word', 'PowerPoint', 'Image'].map((type) => (
                                                <div key={type} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`type-${type}`}
                                                        checked={selectedTypes.includes(type)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedTypes([...selectedTypes, type]);
                                                            } else {
                                                                setSelectedTypes(selectedTypes.filter(t => t !== type));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`type-${type}`}>{type}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="tags">
                                    <AccordionTrigger>Tags</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            {AVAILABLE_TAGS.map((tag) => (
                                                <div key={tag} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`tag-${tag}`}
                                                        checked={selectedTags.includes(tag)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedTags([...selectedTags, tag]);
                                                            } else {
                                                                setSelectedTags(selectedTags.filter(t => t !== tag));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`tag-${tag}`}>{tag}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="year">
                                    <AccordionTrigger>Past Question Year</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            {YEARS.map((year) => (
                                                <div key={year} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`year-${year}`}
                                                        checked={selectedYears.includes(year)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedYears([...selectedYears, year]);
                                                            } else {
                                                                setSelectedYears(
                                                                    selectedYears.filter(y => y !== year)
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`year-${year}`}
                                                        className="text-sm"
                                                    >
                                                        {year}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            {/* AI Insights Component */}
                            <div className="mt-6">
                                <RecommendationInsights />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'recommended')}>
                            <TabsList className="mb-6">
                                <TabsTrigger value="recommended" className="flex items-center space-x-2">
                                    <Sparkles className="h-4 w-4" />
                                    <span>Recommended</span>
                                </TabsTrigger>
                                <TabsTrigger value="all" className="flex items-center space-x-2">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>All Resources</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="recommended">
                                {recommendationsLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="animate-pulse">
                                                <div className="bg-muted rounded-lg h-48 mb-2" />
                                                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                                <div className="h-4 bg-muted rounded w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : recommendationsData?.recommendations.length ? (
                                    <>
                                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                                Personalized Recommendations
                                            </h3>
                                            <p className="text-blue-700 text-sm">
                                                Based on your course enrollments, interaction history, and similar users&apos; preferences
                                            </p>
                                        </div>
                                        {renderResourceGrid(recommendationsData.recommendations, true)}
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Building your recommendations
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            Interact with more resources to get personalized recommendations
                                        </p>
                                        <Button onClick={() => setActiveTab('all')}>
                                            Browse all resources
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="all">
                                {isLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="animate-pulse">
                                                <div className="bg-muted rounded-lg h-48 mb-2" />
                                                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                                <div className="h-4 bg-muted rounded w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    data?.pages.map((page) => renderResourceGrid(page.resources))
                                )}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center mt-8">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Upload FAB */}
            <Button
                className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg"
                onClick={() => router.push('/resources/upload')}
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </Button>
        </div>
    );
}