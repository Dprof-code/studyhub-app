'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns/formatDistance';

const REACTIONS = [
    { emoji: '👍', name: 'thumbs_up' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '🎓', name: 'graduation' },
    { emoji: '💡', name: 'bulb' },
    { emoji: '🤔', name: 'thinking' },
];

type PostCardProps = {
    post: any; // Use the Post type from your thread page
    onReply: () => void;
    className?: string;
};

export function PostCard({ post, onReply, className }: PostCardProps) {
    const { data: session } = useSession();
    const [showReactions, setShowReactions] = useState(false);

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
                        {formatDistance(new Date(post.createdAt), { addSuffix: true })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />

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

            {/* Reactions Display */}
            {post._count.reactions > 0 && (
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
            )}
        </div>
    );
}