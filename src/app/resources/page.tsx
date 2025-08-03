'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import Link from 'next/link';

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
    const lastItemRef = useRef<HTMLDivElement>(null);
    const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);

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

    return (
        <div className="min-h-screen bg-background">
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
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data?.pages.map((page) =>
                                    page.resources.map((resource: Resource, idx: number) => (
                                        <Link key={resource.id} href={`/resources/${resource.id}`}>
                                            <div
                                                ref={idx === page.resources.length - 1 ? ref : null}
                                                className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                                    <img
                                                        src={getThumbnail(resource.fileType, resource.fileUrl)}
                                                        alt={resource.title}
                                                        className="object-cover w-full h-full"
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
                                                    <div className="flex items-center justify-between">
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
                                    ))
                                )}
                            </div>
                        )}

                        {isFetchingNextPage && (
                            <div className="flex justify-center mt-8">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
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