'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ThumbsUp,
    Heart,
    Award,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface VoteData {
    votes: Array<{
        id: number;
        type: string;
        weight: number;
        voter: {
            id: number;
            username: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    counts: Record<string, number>;
    total: number;
}

interface ContentVotingProps {
    contentId: number;
    contentType: 'resource' | 'post' | 'comment';
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const VOTE_TYPES = {
    UPVOTE: {
        icon: ThumbsUp,
        label: 'Upvote',
        color: 'text-blue-600 hover:text-blue-700',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        description: 'This content is helpful'
    },
    HELPFUL: {
        icon: Heart,
        label: 'Helpful',
        color: 'text-red-600 hover:text-red-700',
        bgColor: 'bg-red-50 hover:bg-red-100',
        description: 'This content helped me learn'
    },
    QUALITY_CONTENT: {
        icon: Award,
        label: 'Quality',
        color: 'text-purple-600 hover:text-purple-700',
        bgColor: 'bg-purple-50 hover:bg-purple-100',
        description: 'High-quality contribution'
    },
    EXPERT_APPROVAL: {
        icon: CheckCircle,
        label: 'Expert',
        color: 'text-green-600 hover:text-green-700',
        bgColor: 'bg-green-50 hover:bg-green-100',
        description: 'Expert endorsement'
    }
};

export default function ContentVoting({
    contentId,
    contentType,
    showDetails = false,
    size = 'md'
}: ContentVotingProps) {
    const { data: session } = useSession();
    const [votes, setVotes] = useState<VoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<string | null>(null);

    useEffect(() => {
        fetchVotes();
    }, [contentId, contentType]);

    const fetchVotes = async () => {
        try {
            const response = await fetch(
                `/api/gamification/vote?contentType=${contentType}&contentId=${contentId}`
            );

            if (response.ok) {
                const data = await response.json();
                setVotes(data);
            }
        } catch (error) {
            console.error('Error fetching votes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (voteType: keyof typeof VOTE_TYPES) => {
        if (!session?.user?.id) {
            toast.error('Please sign in to vote');
            return;
        }

        setVoting(voteType);

        try {
            const response = await fetch('/api/gamification/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voteType,
                    contentType,
                    contentId
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Vote recorded successfully!');
                await fetchVotes(); // Refresh vote counts
            } else {
                toast.error(data.error || 'Failed to vote');
            }
        } catch (error) {
            toast.error('Error voting. Please try again.');
            console.error('Error voting:', error);
        } finally {
            setVoting(null);
        }
    };

    const hasUserVoted = (voteType: string): boolean => {
        if (!session?.user?.id || !votes) return false;
        return votes.votes.some(
            vote => vote.type === voteType && vote.voter.id === parseInt(session.user.id!)
        );
    };

    const getButtonSize = () => {
        switch (size) {
            case 'sm': return 'h-8 w-8';
            case 'lg': return 'h-12 w-12';
            default: return 'h-10 w-10';
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'sm': return 'h-3 w-3';
            case 'lg': return 'h-5 w-5';
            default: return 'h-4 w-4';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Loading votes...</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Vote Buttons */}
            <div className="flex items-center space-x-2">
                {Object.entries(VOTE_TYPES).map(([voteType, config]) => {
                    const Icon = config.icon;
                    const count = votes?.counts[voteType] || 0;
                    const userVoted = hasUserVoted(voteType);
                    const isVoting = voting === voteType;

                    return (
                        <div key={voteType} className="flex items-center space-x-1">
                            <Button
                                variant={userVoted ? 'default' : 'outline'}
                                size="sm"
                                className={`${getButtonSize()} ${userVoted ? config.bgColor : ''} ${config.color}`}
                                onClick={() => handleVote(voteType as keyof typeof VOTE_TYPES)}
                                disabled={isVoting || userVoted}
                                title={config.description}
                            >
                                {isVoting ? (
                                    <Loader2 className={`${getIconSize()} animate-spin`} />
                                ) : (
                                    <Icon className={getIconSize()} />
                                )}
                            </Button>

                            {count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                    {count}
                                </Badge>
                            )}
                        </div>
                    );
                })}

                {/* Total Score */}
                {votes && votes.total > 0 && (
                    <div className="ml-4 flex items-center space-x-1">
                        <span className="text-sm font-medium text-gray-700">Score:</span>
                        <Badge variant="outline" className="font-bold">
                            {votes.total}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Detailed Vote Information */}
            {showDetails && votes && votes.votes.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Recent Votes ({votes.votes.length})
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {votes.votes.slice(0, 5).map((vote) => {
                            const voteConfig = VOTE_TYPES[vote.type as keyof typeof VOTE_TYPES];
                            const Icon = voteConfig?.icon || ThumbsUp;

                            return (
                                <div key={vote.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                        {vote.voter.avatarUrl && (
                                            <img
                                                src={vote.voter.avatarUrl}
                                                alt={vote.voter.username}
                                                className="w-4 h-4 rounded-full"
                                            />
                                        )}
                                        <span className="font-medium">@{vote.voter.username}</span>
                                        <div className="flex items-center space-x-1">
                                            <Icon className="h-3 w-3" />
                                            <span>{voteConfig?.label || vote.type}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <span className="text-gray-500">+{vote.weight}</span>
                                        <span className="text-gray-400">
                                            {new Date(vote.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {votes.votes.length > 5 && (
                            <div className="text-xs text-gray-500 text-center pt-2">
                                +{votes.votes.length - 5} more votes
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}