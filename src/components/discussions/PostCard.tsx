'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PostEditor } from './PostEditor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ReplyEditor } from '@/components/discussions/ReplyEditor';
import { FileUpload } from './FileUpload';

const REACTIONS = [
    { emoji: '👍', name: 'thumbs_up' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '🎓', name: 'graduation' },
    { emoji: '💡', name: 'bulb' },
    { emoji: '🤔', name: 'thinking' },
];

interface Post {
    id: number;
    content: string;
    threadId: number;
    authorId: number;
    createdAt: Date;
    author: {
        id: number;
        firstname: string;
        email: string;
        lastname: string;
        username: string;
        avatarUrl: string | null;
    };
    parentId: number | null;
    reactions: any[];
    _count: {
        reactions: number;
    };
    attachments?: string[];
}

type PostCardProps = {
    post: Post;
    onReply: () => void;
    className?: string;
};

export function PostCard({ post, onReply, className }: PostCardProps) {
    const { data: session } = useSession();
    const [showReactions, setShowReactions] = useState(false);
    const [isReplying, setIsReplying] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAuthor = Number(session?.user?.id) === post?.author?.id;
    console.log("Ai isAuthor:", isAuthor);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        setIsDeleting(true);
        try {
            const pathSegments = window.location.pathname.split('/');
            const courseCode = pathSegments[2];
            const threadId = pathSegments[4];

            const response = await fetch(
                `/api/courses/${courseCode}/threads/${threadId}/posts/${post.id}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Failed to delete post');

            toast.success('Post deleted successfully');
        } catch (error) {
            toast.error('Failed to delete post');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReaction = async (reactionType: string) => {
        if (!session?.user) {
            toast.error('You must be logged in to react');
            return;
        }

        try {
            const response = await fetch(`/api/posts/${post.id}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: reactionType }),
            });

            if (!response.ok) throw new Error('Failed to add reaction');
        } catch (error) {
            toast.error('Failed to add reaction');
            console.error(error);
        }
    };

    return (
        <div className={cn("bg-card p-4 rounded-lg space-y-4", className)}>
            <div className="flex items-start justify-between">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                    <Avatar
                        src={post.author.avatarUrl || '/avatar.jpg'}
                        alt={post.author.username}
                    />
                    <div>
                        <div className="font-medium">
                            {post.author.firstname} {post.author.lastname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </div>
                    </div>
                </div>

                {isAuthor && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <span className="material-symbols-outlined">more_vert</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                <span className="material-symbols-outlined mr-2">edit</span>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="text-destructive"
                            >
                                <span className="material-symbols-outlined mr-2">delete</span>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {isEditing ? (
                <PostEditor
                    postId={post.id}
                    initialContent={post.content}
                    onCancel={() => setIsEditing(false)}
                    onSave={() => setIsEditing(false)}
                />
            ) : (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            )}

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {post.attachments.map((url, index) => {
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return isImage ? (
                            <img
                                key={index}
                                src={url}
                                alt="Attachment"
                                className="max-w-[200px] h-auto rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() => window.open(url, '_blank')}
                            />
                        ) : (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(url, '_blank')}
                            >
                                <span className="material-symbols-outlined mr-2">attach_file</span>
                                View Attachment
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Content */}
            {/* <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} /> */}

            {/* Actions */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReactions(!showReactions)}
                    >
                        <span className="material-symbols-outlined mr-1">add_reaction</span>
                        React
                    </Button>

                    {/* Reaction Picker */}
                    {showReactions && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg flex gap-1">
                            {REACTIONS.map((reaction) => (
                                <button
                                    key={reaction.name}
                                    onClick={() => {
                                        handleReaction(reaction.name);
                                        setShowReactions(false);
                                    }}
                                    className="p-2 hover:bg-muted rounded-md transition-colors"
                                >
                                    {reaction.emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReply}
                >
                    <span className="material-symbols-outlined mr-1">reply</span>
                    Reply
                </Button>
            </div>

            {/* Reply Editor */}
            {isReplying && (
                <div className="mt-4">
                    <ReplyEditor
                        threadId={post.threadId}
                        parentId={post.id}
                        onSuccess={() => {
                            setIsReplying(false);
                            onReply?.();
                        }}
                        onCancel={() => setIsReplying(false)}
                    />
                </div>
            )}

            {/* Reactions Display */}
            {/* {post._count.reactions > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(
                        post.reactions.reduce((acc: any, reaction: any) => {
                            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
                            return acc;
                        }, {})
                    ).map(([type, count]) => (
                        <div
                            key={type}
                            className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full"
                        >
                            {REACTIONS.find(r => r.name === type)?.emoji} {count}
                        </div>
                    ))}
                </div>
            )} */}
        </div>
    );
}