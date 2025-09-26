'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface UserStats {
    id: number;
    userId: number;
    level: number;
    xp: number;
    reputationScore: number;
    streak: number;
    totalContributions: number;
    totalVotesReceived: number;
    totalVotesGiven: number;
    lastActivityDate: string;
    createdAt: string;
    updatedAt: string;
}

interface Achievement {
    id: number;
    name: string;
    description: string;
    category: string;
    icon: string;
    badgeUrl: string | null;
    type: 'UNLOCK' | 'PROGRESS';
    requirement: number;
    isActive: boolean;
}

interface UserAchievement {
    id: number;
    achievementId: number;
    progress: number;
    unlockedAt: string | null;
    achievement: Achievement;
}

interface GamificationData {
    stats: UserStats | null;
    achievements: UserAchievement[];
    recentActivity: any[];
    loading: boolean;
    error: string | null;
}

interface UseGamificationReturn extends GamificationData {
    refreshStats: () => Promise<void>;
    recordActivity: (activityType: string, metadata?: any) => Promise<void>;
    voteOnContent: (contentType: string, contentId: number, voteType: string) => Promise<void>;
    calculateLevel: (xp: number) => number;
    getXpForNextLevel: (currentLevel: number) => number;
    getProgressToNextLevel: (xp: number, level: number) => number;
}

export function useGamification(userId?: string): UseGamificationReturn {
    const { data: session } = useSession();
    const [gamificationData, setGamificationData] = useState<GamificationData>({
        stats: null,
        achievements: [],
        recentActivity: [],
        loading: true,
        error: null
    });

    const targetUserId = userId || session?.user?.id;

    // Level calculation based on XP
    const calculateLevel = useCallback((xp: number): number => {
        if (xp < 100) return 1;
        if (xp < 300) return 2;
        if (xp < 600) return 3;
        if (xp < 1000) return 4;
        if (xp < 1500) return 5;
        if (xp < 2100) return 6;
        if (xp < 2800) return 7;
        if (xp < 3600) return 8;
        if (xp < 4500) return 9;
        return 10 + Math.floor((xp - 4500) / 1000);
    }, []);

    // XP required for next level
    const getXpForNextLevel = useCallback((currentLevel: number): number => {
        if (currentLevel < 2) return 100;
        if (currentLevel < 3) return 300;
        if (currentLevel < 4) return 600;
        if (currentLevel < 5) return 1000;
        if (currentLevel < 6) return 1500;
        if (currentLevel < 7) return 2100;
        if (currentLevel < 8) return 2800;
        if (currentLevel < 9) return 3600;
        if (currentLevel < 10) return 4500;
        return 4500 + ((currentLevel - 10) * 1000);
    }, []);

    // Progress percentage to next level
    const getProgressToNextLevel = useCallback((xp: number, level: number): number => {
        const currentLevelXp = level === 1 ? 0 : getXpForNextLevel(level - 1);
        const nextLevelXp = getXpForNextLevel(level);
        const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
        return Math.min(progress, 100);
    }, [getXpForNextLevel]);

    // Fetch user's gamification data
    const fetchGamificationData = useCallback(async () => {
        if (!targetUserId) return;

        setGamificationData(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Fetch user stats
            const statsResponse = await fetch(`/api/gamification/stats/${targetUserId}`);
            let stats = null;
            if (statsResponse.ok) {
                stats = await statsResponse.json();
            }

            // Fetch achievements
            const achievementsResponse = await fetch(`/api/gamification/achievements?userId=${targetUserId}`);
            let achievements: UserAchievement[] = [];
            if (achievementsResponse.ok) {
                achievements = await achievementsResponse.json();
            }

            setGamificationData({
                stats,
                achievements,
                recentActivity: [], // TODO: Implement recent activity endpoint
                loading: false,
                error: null
            });

        } catch (error) {
            console.error('Error fetching gamification data:', error);
            setGamificationData(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to load gamification data'
            }));
        }
    }, [targetUserId]);

    // Record activity and potentially earn XP
    const recordActivity = async (activityType: string, metadata?: any) => {
        if (!session?.user?.id) return;

        try {
            const response = await fetch('/api/gamification/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    activityType,
                    metadata: metadata || {}
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Show XP gain notification
                if (result.xpGained > 0) {
                    toast.success(`+${result.xpGained} XP earned!`, {
                        description: `Activity: ${activityType}`,
                        duration: 3000
                    });
                }

                // Show level up notification
                if (result.levelUp) {
                    toast.success(`🎉 Level Up! You're now level ${result.newLevel}!`, {
                        description: 'Keep up the great work!',
                        duration: 5000
                    });
                }

                // Show achievement unlock notifications
                if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
                    result.achievementsUnlocked.forEach((achievement: Achievement) => {
                        toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
                            description: achievement.description,
                            duration: 5000
                        });
                    });
                }

                // Refresh data
                await refreshStats();
            }
        } catch (error) {
            console.error('Error recording activity:', error);
        }
    };

    // Vote on content
    const voteOnContent = async (contentType: string, contentId: number, voteType: string) => {
        if (!session?.user?.id) {
            toast.error('Please sign in to vote');
            return;
        }

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

                // Record voting activity
                await recordActivity('VOTE_CAST', {
                    voteType,
                    contentType,
                    contentId
                });

            } else {
                toast.error(data.error || 'Failed to vote');
            }
        } catch (error) {
            toast.error('Error voting. Please try again.');
            console.error('Error voting:', error);
        }
    };

    // Refresh stats
    const refreshStats = useCallback(async () => {
        await fetchGamificationData();
    }, [fetchGamificationData]);

    // Initial load
    useEffect(() => {
        fetchGamificationData();
    }, [fetchGamificationData]);

    return {
        ...gamificationData,
        refreshStats,
        recordActivity,
        voteOnContent,
        calculateLevel,
        getXpForNextLevel,
        getProgressToNextLevel
    };
}

// Hook for quick stats access
export function useQuickStats(userId?: string) {
    const { stats, loading, error } = useGamification(userId);

    return {
        level: stats?.level || 1,
        xp: stats?.xp || 0,
        reputation: stats?.reputationScore || 0,
        streak: stats?.streak || 0,
        loading,
        error
    };
}

// Hook for achievement progress
export function useAchievementProgress(achievementId: number, userId?: string) {
    const { achievements, loading } = useGamification(userId);

    const achievement = achievements.find(ua => ua.achievementId === achievementId);

    return {
        progress: achievement?.progress || 0,
        unlocked: achievement?.unlockedAt !== null,
        unlockedAt: achievement?.unlockedAt,
        loading
    };
}