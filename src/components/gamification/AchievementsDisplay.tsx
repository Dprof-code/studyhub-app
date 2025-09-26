'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Award,
    Trophy,
    Star,
    Crown,
    Medal,
    Target,
    BookOpen,
    MessageCircle,
    Heart,
    Users,
    TrendingUp,
    Lock,
    CheckCircle,
    Zap,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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
    createdAt: string;
}

interface UserAchievement {
    id: number;
    achievementId: number;
    progress: number;
    unlockedAt: string | null;
    achievement: Achievement;
}

interface AchievementsDisplayProps {
    userId?: string;
    showOnlyUnlocked?: boolean;
    compact?: boolean;
}

const CATEGORY_ICONS = {
    LEARNING: BookOpen,
    PARTICIPATION: MessageCircle,
    CONTRIBUTION: Heart,
    SOCIAL: Users,
    STREAK: TrendingUp,
    SPECIAL: Crown
};

const CATEGORY_COLORS = {
    LEARNING: 'bg-blue-100 text-blue-800 border-blue-200',
    PARTICIPATION: 'bg-green-100 text-green-800 border-green-200',
    CONTRIBUTION: 'bg-purple-100 text-purple-800 border-purple-200',
    SOCIAL: 'bg-orange-100 text-orange-800 border-orange-200',
    STREAK: 'bg-red-100 text-red-800 border-red-200',
    SPECIAL: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

export default function AchievementsDisplay({
    userId,
    showOnlyUnlocked = false,
    compact = false
}: AchievementsDisplayProps) {
    const [achievements, setAchievements] = useState<UserAchievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const fetchAchievements = useCallback(async () => {
        try {
            let url = '/api/gamification/achievements';
            if (userId) {
                url += `?userId=${userId}`;
            }

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                setAchievements(data.achievements || []);
            } else {
                toast.error('Failed to load achievements');
            }
        } catch (error) {
            console.error('Error fetching achievements:', error);
            toast.error('Error loading achievements');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    const getIconComponent = (iconName: string) => {
        const icons: { [key: string]: any } = {
            Award, Trophy, Star, Crown, Medal, Target, BookOpen,
            MessageCircle, Heart, Users, TrendingUp, Zap
        };
        return icons[iconName] || Award;
    };

    const isUnlocked = (userAchievement: UserAchievement): boolean => {
        return userAchievement.unlockedAt !== null;
    };

    const getProgressPercentage = (userAchievement: UserAchievement): number => {
        if (isUnlocked(userAchievement)) return 100;
        return Math.min((userAchievement.progress / userAchievement.achievement.requirement) * 100, 100);
    };

    const filteredAchievements = (achievements || []).filter(userAchievement => {
        if (showOnlyUnlocked && !isUnlocked(userAchievement)) return false;
        if (selectedCategory !== 'all' && userAchievement.achievement.category !== selectedCategory) return false;
        return true;
    });

    const categories = Array.from(new Set((achievements || []).map(ua => ua.achievement.category)));
    const unlockedCount = (achievements || []).filter(isUnlocked).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading achievements...</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium">
                            {unlockedCount}/{achievements.length} Unlocked
                        </span>
                    </div>
                    <Progress value={(unlockedCount / achievements.length) * 100} className="flex-1" />
                </div>

                {/* Recent Achievements */}
                <div className="grid grid-cols-2 gap-3">
                    {filteredAchievements
                        .filter(isUnlocked)
                        .slice(0, 4)
                        .map((userAchievement) => {
                            const Icon = getIconComponent(userAchievement.achievement.icon);
                            const categoryColor = CATEGORY_COLORS[userAchievement.achievement.category as keyof typeof CATEGORY_COLORS];

                            return (
                                <div
                                    key={userAchievement.id}
                                    className="p-3 rounded-lg border bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Icon className="h-4 w-4 text-yellow-600" />
                                        <div>
                                            <p className="text-sm font-medium">{userAchievement.achievement.name}</p>
                                            <Badge variant="outline" className={`text-xs ${categoryColor}`}>
                                                {userAchievement.achievement.category}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Achievements</h3>
                    <p className="text-gray-600">
                        {unlockedCount} of {achievements.length} achievements unlocked
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-600">{unlockedCount}</div>
                    <div className="text-sm text-gray-500">Earned</div>
                </div>
            </div>

            {/* Overall Progress */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3 mb-2">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    <span className="font-semibold">Achievement Progress</span>
                </div>
                <Progress
                    value={(unlockedCount / achievements.length) * 100}
                    className="h-3"
                />
                <p className="text-sm text-gray-600 mt-2">
                    {Math.round((unlockedCount / achievements.length) * 100)}% complete
                </p>
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {categories.map(category => {
                        const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                        return (
                            <TabsTrigger key={category} value={category} className="flex items-center space-x-1">
                                {Icon && <Icon className="h-4 w-4" />}
                                <span className="hidden sm:inline">{category}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAchievements.map((userAchievement) => {
                            const Icon = getIconComponent(userAchievement.achievement.icon);
                            const unlocked = isUnlocked(userAchievement);
                            const progress = getProgressPercentage(userAchievement);
                            const categoryColor = CATEGORY_COLORS[userAchievement.achievement.category as keyof typeof CATEGORY_COLORS];

                            return (
                                <div
                                    key={userAchievement.id}
                                    className={`p-4 rounded-lg border transition-all hover:shadow-md ${unlocked
                                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className={`p-2 rounded-full ${unlocked ? 'bg-yellow-100' : 'bg-gray-200'
                                            }`}>
                                            {unlocked ? (
                                                <Icon className="h-6 w-6 text-yellow-600" />
                                            ) : (
                                                <Lock className="h-6 w-6 text-gray-400" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h4 className={`font-semibold ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {userAchievement.achievement.name}
                                                </h4>
                                                {unlocked && (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                )}
                                            </div>

                                            <p className={`text-sm mb-2 ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {userAchievement.achievement.description}
                                            </p>

                                            <Badge variant="outline" className={`text-xs ${categoryColor} mb-3`}>
                                                {userAchievement.achievement.category}
                                            </Badge>

                                            {/* Progress Bar */}
                                            {userAchievement.achievement.type === 'PROGRESS' && !unlocked && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span>Progress</span>
                                                        <span>
                                                            {userAchievement.progress}/{userAchievement.achievement.requirement}
                                                        </span>
                                                    </div>
                                                    <Progress value={progress} className="h-2" />
                                                </div>
                                            )}

                                            {/* Unlock Date */}
                                            {unlocked && userAchievement.unlockedAt && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Unlocked on {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredAchievements.length === 0 && (
                        <div className="text-center py-12">
                            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements found</h3>
                            <p className="text-gray-500">
                                {showOnlyUnlocked
                                    ? "No achievements unlocked yet. Keep participating to earn your first badge!"
                                    : "Start participating in discussions and sharing resources to unlock achievements!"
                                }
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}