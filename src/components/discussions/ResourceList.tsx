'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type Resource = {
    id: number;
    title: string;
    description: string;
    fileType: string;
    fileUrl: string;
    uploader: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    tags: Array<{ id: number; name: string }>;
    createdAt: string;
};

export function ResourceList({ courseId }: { courseId: number }) {
    const router = useRouter();

    const { data: resources, isLoading } = useQuery({
        queryKey: ['course-resources', courseId],
        queryFn: async () => {
            const response = await fetch(`/api/courses/${courseId}/resources`);
            if (!response.ok) throw new Error('Failed to fetch resources');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-40 bg-muted rounded-lg" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource: Resource) => (
                <div
                    key={resource.id}
                    className="group bg-card hover:bg-muted/50 border border-border rounded-lg p-4 cursor-pointer transition-colors"
                    onClick={() => router.push(`/resources/${resource.id}`)}
                >
                    <div className="flex gap-4">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">description</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium mb-1 truncate">{resource.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {resource.tags.map(tag => (
                                    <Badge key={tag.id} variant="secondary" className="text-xs">
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar
                                    src={resource.uploader.avatarUrl || '/avatar.jpg'}
                                    alt={resource.uploader.username}
                                    className="w-5 h-5"
                                />
                                <span>{resource.uploader.firstname} {resource.uploader.lastname}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}