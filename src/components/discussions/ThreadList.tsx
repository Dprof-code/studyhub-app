'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

type Thread = {
    id: number;
    title: string;
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
    isStickied?: boolean;
    isLocked?: boolean;
};

export function ThreadList({ courseId }: { courseId: number }) {
    const router = useRouter();

    const { data: threads, isLoading } = useQuery({
        queryKey: ['threads', courseId],
        queryFn: async () => {
            const response = await fetch(`/api/courses/${courseId}/threads`);
            if (!response.ok) throw new Error('Failed to fetch threads');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {threads.map((thread: Thread) => (
                <div
                    key={thread.id}
                    className="group bg-card hover:bg-muted/50 border border-border rounded-lg p-4 cursor-pointer transition-colors"
                    onClick={() => router.push(`/discussions/${thread.id}`)}
                >
                    <div className="flex items-start gap-4">
                        <Avatar
                            src={thread.author.avatarUrl || '/avatar.jpg'}
                            alt={thread.author.username}
                            className="w-10 h-10"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg truncate">
                                    {thread.title}
                                </h3>
                                {thread.isStickied && (
                                    <Badge variant="secondary">
                                        <span className="material-symbols-outlined text-sm mr-1">push_pin</span>
                                        Pinned
                                    </Badge>
                                )}
                                {thread.isLocked && (
                                    <Badge variant="destructive">
                                        <span className="material-symbols-outlined text-sm mr-1">lock</span>
                                        Locked
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                    by {thread.author.firstname} {thread.author.lastname}
                                </span>
                                <span>
                                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                    {thread._count.posts} replies
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}