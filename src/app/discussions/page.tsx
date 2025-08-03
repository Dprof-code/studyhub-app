'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type Thread = {
    id: number;
    title: string;
    course: {
        id: number;
        code: string;
        title: string;
        department: {
            name: string;
        };
    };
    author: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    _count: {
        posts: number;
    };
    createdAt: string;
    isStickied: boolean;
    lastPost: {
        createdAt: string;
        author: {
            firstname: string;
            lastname: string;
        };
    } | null;
};

export default function DiscussionsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data, isLoading } = useQuery({
        queryKey: ['global-discussions', debouncedSearch, sortBy],
        queryFn: async () => {
            const params = new URLSearchParams({
                ...(debouncedSearch && { search: debouncedSearch }),
                sort: sortBy,
            });
            const response = await fetch(`/api/discussions?${params}`);
            if (!response.ok) throw new Error('Failed to fetch discussions');
            return response.json();
        },
    });

    console.log(data);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Discussions</h1>
                    <p className="text-muted-foreground">
                        Join conversations across all courses
                    </p>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <Input
                        placeholder="Search discussions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select
                        value={sortBy}
                        onValueChange={setSortBy}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="active">Most Active</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Discussions List */}
                <div className="space-y-4">
                    {isLoading ? (
                        // Loading skeletons
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-24 bg-muted rounded-lg" />
                            </div>
                        ))
                    ) : (
                        data?.threads.map((thread: Thread) => (
                            <div
                                key={thread.id}
                                className="group bg-card hover:bg-muted/50 border rounded-lg p-4 cursor-pointer transition-colors"
                                onClick={() => router.push(`/courses/${thread.course.code}/discussions/${thread.id}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {thread.course.code}
                                            </Badge>
                                            {thread.isStickied && (
                                                <Badge variant="secondary">
                                                    <span className="material-symbols-outlined text-sm mr-1">push_pin</span>
                                                    Pinned
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold">{thread.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    src={thread.author.avatarUrl || '/avatar.jpg'}
                                                    alt={thread.author.username}
                                                    className="w-5 h-5"
                                                />
                                                <span>{thread.author.firstname} {thread.author.lastname}</span>
                                            </div>
                                            <span>
                                                {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">chat</span>
                                                {thread._count.posts} replies
                                            </div>
                                        </div>
                                    </div>
                                    {thread.lastPost && (
                                        <div className="text-sm text-muted-foreground">
                                            <div>Last reply by {thread.lastPost.author.firstname}</div>
                                            <div>{formatDistanceToNow(new Date(thread.lastPost.createdAt), { addSuffix: true })}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}