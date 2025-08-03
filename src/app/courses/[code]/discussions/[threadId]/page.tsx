'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Editor } from '@/components/discussions/Editor';
import { formatDistanceToNow } from 'date-fns';
import { PostCard } from '@/components/discussions/PostCard';
import { ReplyEditor } from '@/components/discussions/ReplyEditor';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';


type Post = {
    id: number;
    content: string;
    author: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    parentId: number | null;
    createdAt: string;
    _count: {
        reactions: number;
    };
    reactions: Array<{
        type: string;
        userId: number;
    }>;
};

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
    posts: Post[];
    isLocked: boolean;
    isStickied: boolean;
    createdAt: string;
};

export default function ThreadPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const socket = useSocket(parseInt(params.threadId as string));
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [showMainReply, setShowMainReply] = useState(false);

    useEffect(() => {
        if (!socket) return;

        // Listen for new posts
        socket.on('new-post', (newPost: Post) => {
            queryClient.setQueryData(['thread', params.threadId], (oldData: Thread | undefined) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    posts: [...oldData.posts, newPost],
                };
            });
        });

        // Listen for post updates
        socket.on('update-post', (updatedPost: Post) => {
            queryClient.setQueryData(['thread', params.threadId], (oldData: Thread | undefined) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    posts: oldData.posts.map(post =>
                        post.id === updatedPost.id ? updatedPost : post
                    ),
                };
            });
        });

        socket.on('delete-post', (postId: number) => {
            queryClient.setQueryData(['thread', params.threadId], (oldData: Thread | undefined) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    posts: oldData.posts.filter(post => post.id !== postId),
                };
            });
        });

        return () => {
            socket.off('new-post');
            socket.off('update-post');
            socket.off('delete-post');
        };
    }, [socket, params.threadId, queryClient]);

    const { data: thread, isLoading } = useQuery<Thread>({
        queryKey: ['thread', params.threadId],
        queryFn: async () => {
            const response = await fetch(`/api/courses/${params.code}/threads/${params.threadId}`);
            if (!response.ok) throw new Error('Failed to fetch thread');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Organize posts into a tree structure
    const postMap = new Map<number | null, Post[]>();
    thread?.posts.forEach(post => {
        const parent = post.parentId;
        if (!postMap.has(parent)) {
            postMap.set(parent, []);
        }
        postMap.get(parent)?.push(post);
    });

    // Recursive function to render nested posts
    const renderPosts = (parentId: number | null, depth = 0) => {
        const posts = postMap.get(parentId) || [];
        return posts.map(post => (
            <div key={post.id} className={`ml-${depth * 4}`}>
                <PostCard
                    post={post}
                    onReply={() => setReplyingTo(post.id)}
                    className={depth > 0 ? 'border-l-2 border-muted pl-4' : ''}
                />
                {renderPosts(post.id, depth + 1)}
                {replyingTo === post.id && (
                    <div className="ml-8 mt-4">
                        <ReplyEditor
                            threadId={thread!.id}
                            parentId={post.id}
                            onCancel={() => setReplyingTo(null)}
                            onSuccess={() => setReplyingTo(null)}
                        />
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Thread Title & Info */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">{thread?.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        src={thread?.author.avatarUrl || '/avatar.jpg'}
                                        alt={thread?.author.username || ''}
                                        className="w-6 h-6"
                                    />
                                    <span>
                                        {thread?.author.firstname} {thread?.author.lastname}
                                    </span>
                                </div>
                                <span>
                                    {formatDistanceToNow(new Date(thread?.createdAt || ''), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {thread?.isStickied && (
                                <Badge variant="secondary">
                                    <span className="material-symbols-outlined text-sm mr-1">push_pin</span>
                                    Pinned
                                </Badge>
                            )}
                            {thread?.isLocked && (
                                <Badge variant="destructive">
                                    <span className="material-symbols-outlined text-sm mr-1">lock</span>
                                    Locked
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Original Post & Replies */}
                    <div className="space-y-6">
                        {renderPosts(null)}
                    </div>

                    {/* Reply Editor */}
                    {!thread?.isLocked && (
                        <div className="sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
                            {showMainReply ? (
                                <ReplyEditor
                                    threadId={thread!.id}
                                    onSuccess={() => {
                                        setShowMainReply(false);
                                        // Refresh thread data here if needed
                                    }}
                                    onCancel={() => setShowMainReply(false)}
                                />
                            ) : (
                                <Button
                                    onClick={() => setShowMainReply(true)}
                                    className="w-full"
                                >
                                    <span className="material-symbols-outlined mr-2">reply</span>
                                    Write a Reply
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}