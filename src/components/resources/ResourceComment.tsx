'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type Comment = {
    id: number;
    content: string;
    createdAt: string;
    author: {
        id: number;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    replies: Comment[];
};

interface CommentProps {
    resourceId: number;
    parentId?: number;
    comment?: Comment;
    level?: number;
}

function CommentItem({ comment, level = 0, resourceId }: CommentProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    const { mutate: submitReply, isLoading: isSubmitting } = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/resources/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: replyContent,
                    resourceId,
                    parentId: comment.id,
                }),
            });
            if (!response.ok) throw new Error('Failed to post reply');
            return response.json();
        },
        onSuccess: () => {
            setReplyContent('');
            setIsReplying(false);
            queryClient.invalidateQueries(['resource-comments', resourceId]);
            toast.success('Reply posted successfully');
        },
        onError: () => {
            toast.error('Failed to post reply');
        },
    });

    return (
        <div className="space-y-4" style={{ marginLeft: `${level * 24}px` }}>
            <div className="flex gap-4">
                <Avatar
                    src={comment.author.avatarUrl || '/avatar.jpg'}
                    alt={`${comment.author.firstname} ${comment.author.lastname}`}
                    className="w-8 h-8"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">
                            {comment.author.firstname} {comment.author.lastname}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    {session && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            Reply
                        </Button>
                    )}
                </div>
            </div>

            {isReplying && (
                <div className="ml-12 space-y-2">
                    <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => submitReply()}
                            disabled={!replyContent.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Posting...' : 'Post Reply'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsReplying(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {comment.replies?.map((reply) => (
                <CommentItem
                    key={reply.id}
                    comment={reply}
                    resourceId={resourceId}
                    level={level + 1}
                />
            ))}
        </div>
    );
}

export function ResourceComment({ resourceId }: { resourceId: number }) {
    const { data: session } = useSession();
    const [content, setContent] = useState('');
    const queryClient = useQueryClient();

    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['resource-comments', resourceId],
        queryFn: async () => {
            const response = await fetch(`/api/resources/${resourceId}/comments`);
            if (!response.ok) throw new Error('Failed to fetch comments');
            return response.json();
        },
    });

    const { mutate: submitComment, isLoading: isSubmitting } = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/resources/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    resourceId,
                }),
            });
            if (!response.ok) throw new Error('Failed to post comment');
            return response.json();
        },
        onSuccess: () => {
            setContent('');
            queryClient.invalidateQueries(['resource-comments', resourceId]);
            toast.success('Comment posted successfully');
        },
        onError: () => {
            toast.error('Failed to post comment');
        },
    });

    return (
        <div className="space-y-6">
            {session && (
                <div className="space-y-2">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write a comment..."
                        rows={3}
                    />
                    <Button
                        onClick={() => submitComment()}
                        disabled={!content.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                </div>
            )}

            <div className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-4">Loading comments...</div>
                ) : comments.length > 0 ? (
                    comments.map((comment: Comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            resourceId={resourceId}
                        />
                    ))
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        No comments yet. Be the first to comment!
                    </div>
                )}
            </div>
        </div>
    );
}