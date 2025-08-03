'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getThumbnail } from '@/lib/utils';

interface RelatedResourcesProps {
    courseId?: number;
    currentResourceId: number;
    tags: string[];
}

type RelatedResource = {
    id: number;
    title: string;
    description: string;
    fileUrl: string;
    fileType: string;
    createdAt: string;
    course: {
        id: number;
        code: string;
        title: string;
    } | null;
    tags: Array<{
        id: number;
        name: string;
    }>;
    uploader: {
        id: number;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
};

export function RelatedResources({ courseId, currentResourceId, tags }: RelatedResourcesProps) {
    const { data: resources = [], isLoading } = useQuery({
        queryKey: ['related-resources', courseId, tags],
        queryFn: async () => {
            const params = new URLSearchParams({
                ...(courseId && { courseId: courseId.toString() }),
                tags: tags.join(','),
                exclude: currentResourceId.toString(),
                limit: '6',
            });

            const response = await fetch(`/api/resources/related?${params}`);
            if (!response.ok) throw new Error('Failed to fetch related resources');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-4 animate-pulse">
                        <div className="h-32 bg-muted rounded mb-2" />
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                    </Card>
                ))}
            </div>
        );
    }

    if (resources.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((resource: any) => (
                <Link href={`/resources/${resource.id}`} key={resource.id}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                        <div className="aspect-video relative mb-2">
                            <img
                                src={getThumbnail(resource.fileType, resource.fileUrl)}
                                alt={resource.title}
                                className="rounded object-cover w-full h-full"
                            />
                        </div>
                        <h3 className="font-medium mb-2 line-clamp-1">{resource.title}</h3>
                        <div className="flex flex-wrap gap-1">
                            {resource.tags.slice(0, 3).map((tag: any) => (
                                <Badge key={tag.id} variant="secondary">
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    );
}