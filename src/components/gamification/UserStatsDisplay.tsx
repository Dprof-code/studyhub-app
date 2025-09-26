'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Users, Zap, Target, Calendar } from 'lucide-react';

interface UserStats {
    id: number;
    userId: number;
    totalXP: number;
    reputationScore: number;
    currentLevel: number;
    reputationTier: keyof typeof REPUTATION_TIER_COLORS;
    resourceUploads: number;
    threadsCreated: number;
    postsCreated: number;
    commentsCreated: number;
    upvotesReceived: number;
    expertEndorsements: number;
    averageContentRating: number;
    helpfulVotes: number;
    loginStreak: number;
    longestLoginStreak: number;
    peersHelped: number;
    user: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
        department: {
            name: string;
            code: string;
        } | null;
    };
}

interface UserStatsDisplayProps {
    userId: number;
    variant?: 'full' | 'compact' | 'minimal';
}

const LEVEL_THRESHOLDS = Array.from({ length: 50 }, (_, i) =>
    Math.floor(100 * Math.pow(1.5, i))
);

const REPUTATION_TIER_COLORS = {
    'NEWCOMER': 'bg-gray-100 text-gray-800',
    'CONTRIBUTOR': 'bg-blue-100 text-blue-800',
    'VALUED_MEMBER': 'bg-green-100 text-green-800',
    'COMMUNITY_LEADER': 'bg-purple-100 text-purple-800',
    'EXPERT_CONTRIBUTOR': 'bg-yellow-100 text-yellow-800'
} as const;

const REPUTATION_TIER_NAMES = {
    'NEWCOMER': 'Newcomer',
    'CONTRIBUTOR': 'Contributor',
    'VALUED_MEMBER': 'Valued Member',
    'COMMUNITY_LEADER': 'Community Leader',
    'EXPERT_CONTRIBUTOR': 'Expert Contributor'
} as const;

export default function UserStatsDisplay({ userId, variant = 'full' }: UserStatsDisplayProps) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUserStats();
    }, [userId]);

    const fetchUserStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/gamification/stats/${userId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getXPForNextLevel = (currentLevel: number): number => {
        if (currentLevel >= 50) return 0;
        return LEVEL_THRESHOLDS[currentLevel - 1];
    };

    const getXPProgress = (totalXP: number, currentLevel: number): number => {
        if (currentLevel >= 50) return 100;

        const currentLevelXP = currentLevel > 1 ? LEVEL_THRESHOLDS[currentLevel - 2] : 0;
        const nextLevelXP = LEVEL_THRESHOLDS[currentLevel - 1];
        const progressXP = totalXP - currentLevelXP;
        const requiredXP = nextLevelXP - currentLevelXP;

        return (progressXP / requiredXP) * 100;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-red-600">
                        {error || 'Failed to load user stats'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (variant === 'minimal') {
        return (
            <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Level {stats.currentLevel}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{stats.reputationScore}</span>
                </div>
                <Badge className={REPUTATION_TIER_COLORS[stats.reputationTier]}>
                    {REPUTATION_TIER_NAMES[stats.reputationTier]}
                </Badge>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            {stats.user.avatarUrl && (
                                <img
                                    src={stats.user.avatarUrl}
                                    alt={stats.user.username}
                                    className="w-10 h-10 rounded-full"
                                />
                            )}
                            <div>
                                <h3 className="font-medium">{stats.user.firstname} {stats.user.lastname}</h3>
                                <p className="text-sm text-gray-500">@{stats.user.username}</p>
                            </div>
                        </div>
                        <Badge className={REPUTATION_TIER_COLORS[stats.reputationTier]}>
                            {REPUTATION_TIER_NAMES[stats.reputationTier]}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>Level {stats.currentLevel}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4 text-blue-500" />
                            <span>{stats.reputationScore} Rep</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-green-500" />
                            <span>{stats.totalXP} XP</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{stats.peersHelped} Helped</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Full variant
    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {stats.user.avatarUrl && (
                                <img
                                    src={stats.user.avatarUrl}
                                    alt={stats.user.username}
                                    className="w-16 h-16 rounded-full"
                                />
                            )}
                            <div>
                                <CardTitle className="text-xl">
                                    {stats.user.firstname} {stats.user.lastname}
                                </CardTitle>
                                <p className="text-gray-600">@{stats.user.username}</p>
                                {stats.user.department && (
                                    <p className="text-sm text-gray-500">{stats.user.department.name}</p>
                                )}
                            </div>
                        </div>
                        <Badge className={`${REPUTATION_TIER_COLORS[stats.reputationTier]} text-lg px-3 py-1`}>
                            {REPUTATION_TIER_NAMES[stats.reputationTier]}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Level Progress */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Level {stats.currentLevel}</span>
                                <span className="text-sm text-gray-500">
                                    {stats.currentLevel < 50 ? `Next: ${getXPForNextLevel(stats.currentLevel)} XP` : 'Max Level!'}
                                </span>
                            </div>
                            <Progress value={getXPProgress(stats.totalXP, stats.currentLevel)} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{stats.totalXP} Total XP</p>
                        </div>

                        {/* Reputation Score */}
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-1">
                                <Trophy className="h-5 w-5 text-blue-500" />
                                <span className="text-2xl font-bold text-blue-600">{stats.reputationScore}</span>
                            </div>
                            <p className="text-sm text-gray-600">Reputation Score</p>
                        </div>

                        {/* Login Streak */}
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-1">
                                <Calendar className="h-5 w-5 text-green-500" />
                                <span className="text-2xl font-bold text-green-600">{stats.loginStreak}</span>
                            </div>
                            <p className="text-sm text-gray-600">Day Streak</p>
                            <p className="text-xs text-gray-500">Best: {stats.longestLoginStreak}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activity Stats */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <Target className="h-5 w-5" />
                            <span>Contribution Stats</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Resources Uploaded</span>
                                <span className="font-medium">{stats.resourceUploads}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Threads Created</span>
                                <span className="font-medium">{stats.threadsCreated}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Posts Made</span>
                                <span className="font-medium">{stats.postsCreated}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Comments Posted</span>
                                <span className="font-medium">{stats.commentsCreated}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <Users className="h-5 w-5" />
                            <span>Community Impact</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span>Upvotes Received</span>
                                <span className="font-medium">{stats.upvotesReceived}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Expert Endorsements</span>
                                <span className="font-medium">{stats.expertEndorsements}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Helpful Votes</span>
                                <span className="font-medium">{stats.helpfulVotes}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Peers Helped</span>
                                <span className="font-medium">{stats.peersHelped}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}