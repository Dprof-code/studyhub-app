/**
 * Advanced Gamification Center
 * Phase 5C: Advanced Features & Optimization
 */
'use client';

import { useState, useEffect } from 'react';
import {
    TrophyIcon,
    SparklesIcon,
    FireIcon,
    StarIcon,
    BoltIcon,
    ShieldCheckIcon,
    AcademicCapIcon,
    CheckCircleIcon,
    ChartBarIcon,
    GiftIcon,
    UserGroupIcon,
    ClockIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    category: 'study' | 'social' | 'milestone' | 'special';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    points: number;
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: {
        current: number;
        total: number;
    };
    requirements: string[];
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    timeRemaining: number; // in hours
    progress: {
        current: number;
        total: number;
    };
    completed: boolean;
    participants: number;
}

interface Reward {
    id: string;
    title: string;
    description: string;
    type: 'badge' | 'theme' | 'feature' | 'avatar' | 'title';
    cost: number;
    purchased: boolean;
    limited?: boolean;
    category: 'cosmetic' | 'functional' | 'social';
}

interface LeaderboardEntry {
    id: string;
    username: string;
    avatar: string;
    points: number;
    level: number;
    streak: number;
    badge?: string;
    change: number; // position change
}

interface UserStats {
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    achievementsUnlocked: number;
    rank: number;
    weeklyPoints: number;
    studyHours: number;
    completedChallenges: number;
}

export default function GamificationCenter() {
    const [userStats, setUserStats] = useState<UserStats>({
        level: 15,
        totalPoints: 3420,
        pointsToNextLevel: 580,
        currentStreak: 7,
        longestStreak: 21,
        achievementsUnlocked: 23,
        rank: 42,
        weeklyPoints: 280,
        studyHours: 156,
        completedChallenges: 18
    });

    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'challenges' | 'rewards' | 'leaderboard'>('overview');
    const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

    useEffect(() => {
        // Mock data initialization
        const mockAchievements: Achievement[] = [
            {
                id: '1',
                title: 'Study Streak Master',
                description: 'Study for 7 consecutive days',
                icon: FireIcon,
                category: 'study',
                rarity: 'rare',
                points: 150,
                unlocked: true,
                unlockedAt: new Date(Date.now() - 86400000),
                requirements: ['Study for 7 consecutive days']
            },
            {
                id: '2',
                title: 'Knowledge Seeker',
                description: 'Complete 50 study sessions',
                icon: AcademicCapIcon,
                category: 'milestone',
                rarity: 'epic',
                points: 300,
                unlocked: true,
                requirements: ['Complete 50 study sessions']
            },
            {
                id: '3',
                title: 'AI Whisperer',
                description: 'Use AI chat for 100 questions',
                icon: SparklesIcon,
                category: 'special',
                rarity: 'legendary',
                points: 500,
                unlocked: false,
                progress: { current: 67, total: 100 },
                requirements: ['Ask 100 questions to AI chat']
            },
            {
                id: '4',
                title: 'Social Butterfly',
                description: 'Join 10 study groups',
                icon: UserGroupIcon,
                category: 'social',
                rarity: 'common',
                points: 75,
                unlocked: false,
                progress: { current: 6, total: 10 },
                requirements: ['Join 10 different study groups']
            }
        ];

        const mockChallenges: Challenge[] = [
            {
                id: '1',
                title: 'Daily Focus',
                description: 'Study for 2 hours today',
                type: 'daily',
                difficulty: 'easy',
                points: 50,
                timeRemaining: 8,
                progress: { current: 1.5, total: 2 },
                completed: false,
                participants: 234
            },
            {
                id: '2',
                title: 'Quiz Champion',
                description: 'Score 90%+ on 5 quizzes this week',
                type: 'weekly',
                difficulty: 'hard',
                points: 200,
                timeRemaining: 72,
                progress: { current: 3, total: 5 },
                completed: false,
                participants: 89
            },
            {
                id: '3',
                title: 'Resource Master',
                description: 'Upload and share 10 study materials',
                type: 'monthly',
                difficulty: 'medium',
                points: 150,
                timeRemaining: 456,
                progress: { current: 7, total: 10 },
                completed: false,
                participants: 156
            }
        ];

        const mockRewards: Reward[] = [
            {
                id: '1',
                title: 'Golden Scholar Badge',
                description: 'Show off your dedication with this premium badge',
                type: 'badge',
                cost: 500,
                purchased: false,
                category: 'cosmetic'
            },
            {
                id: '2',
                title: 'Dark Mode Theme',
                description: 'Unlock the exclusive dark theme',
                type: 'theme',
                cost: 300,
                purchased: true,
                category: 'cosmetic'
            },
            {
                id: '3',
                title: 'Priority Support',
                description: 'Get priority access to customer support',
                type: 'feature',
                cost: 1000,
                purchased: false,
                category: 'functional'
            },
            {
                id: '4',
                title: 'Custom Avatar Frame',
                description: 'Personalize your profile with a custom frame',
                type: 'avatar',
                cost: 250,
                purchased: false,
                limited: true,
                category: 'cosmetic'
            }
        ];

        const mockLeaderboard: LeaderboardEntry[] = [
            { id: '1', username: 'StudyMaster2024', avatar: '/avatar.jpg', points: 5420, level: 22, streak: 14, badge: 'golden', change: 0 },
            { id: '2', username: 'AILearner', avatar: '/avatar.jpg', points: 4890, level: 20, streak: 9, change: 1 },
            { id: '3', username: 'QuizChampion', avatar: '/avatar.jpg', points: 4350, level: 19, streak: 12, change: -1 },
            { id: '4', username: 'Knowledge_Hunter', avatar: '/avatar.jpg', points: 3980, level: 17, streak: 6, change: 2 },
            { id: '5', username: 'StudyBuddy', avatar: '/avatar.jpg', points: 3420, level: 15, streak: 7, change: 0 }
        ];

        setAchievements(mockAchievements);
        setChallenges(mockChallenges);
        setRewards(mockRewards);
        setLeaderboard(mockLeaderboard);
        setRecentUnlocks(mockAchievements.filter(a => a.unlocked && a.unlockedAt && Date.now() - a.unlockedAt.getTime() < 86400000 * 7));
    }, []);

    const getRarityColor = (rarity: Achievement['rarity']) => {
        switch (rarity) {
            case 'common':
                return 'from-gray-400 to-gray-600';
            case 'rare':
                return 'from-blue-400 to-blue-600';
            case 'epic':
                return 'from-purple-400 to-purple-600';
            case 'legendary':
                return 'from-yellow-400 to-orange-600';
        }
    };

    const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
        switch (difficulty) {
            case 'easy':
                return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'medium':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'hard':
                return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
        }
    };

    const formatTimeRemaining = (hours: number) => {
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    };

    const purchaseReward = (rewardId: string) => {
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward || reward.purchased || userStats.totalPoints < reward.cost) return;

        setRewards(prev => prev.map(r =>
            r.id === rewardId ? { ...r, purchased: true } : r
        ));
        setUserStats(prev => ({ ...prev, totalPoints: prev.totalPoints - reward.cost }));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                        <TrophyIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Gamification Center
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Track progress, earn rewards, and compete with others
                        </p>
                    </div>
                </div>

                {/* User Level & Points */}
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <SparklesIcon className="h-5 w-5 text-yellow-500" />
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {userStats.totalPoints.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total Points</p>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {userStats.level}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Level</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {(['overview', 'achievements', 'challenges', 'rewards', 'leaderboard'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={classNames(
                            'flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors capitalize',
                            selectedTab === tab
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {selectedTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-3">
                                    <TrophyIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{userStats.rank}</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">Global Rank</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-3">
                                    <FireIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{userStats.currentStreak}</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-300">Day Streak</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                    <StarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{userStats.achievementsUnlocked}</p>
                                        <p className="text-sm text-green-700 dark:text-green-300">Achievements</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-3">
                                    <ClockIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{userStats.studyHours}</p>
                                        <p className="text-sm text-purple-700 dark:text-purple-300">Study Hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Level Progress */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Level {userStats.level}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {userStats.pointsToNextLevel} points to level {userStats.level + 1}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">This week</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        +{userStats.weeklyPoints}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${((4000 - userStats.pointsToNextLevel) / 4000) * 100}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Level {userStats.level}</span>
                                <span>Level {userStats.level + 1}</span>
                            </div>
                        </div>

                        {/* Recent Unlocks */}
                        {recentUnlocks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Recently Unlocked
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recentUnlocks.map((achievement) => {
                                        const Icon = achievement.icon;
                                        return (
                                            <div
                                                key={achievement.id}
                                                className={classNames(
                                                    'p-4 rounded-xl border bg-gradient-to-r',
                                                    getRarityColor(achievement.rarity),
                                                    'text-white shadow-lg'
                                                )}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Icon className="h-8 w-8" />
                                                    <div>
                                                        <h4 className="font-bold">{achievement.title}</h4>
                                                        <p className="text-sm opacity-90">{achievement.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="capitalize font-medium">{achievement.rarity}</span>
                                                    <span>+{achievement.points} points</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Active Challenges Preview */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Active Challenges
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {challenges.filter(c => !c.completed).slice(0, 3).map((challenge) => (
                                    <div key={challenge.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {challenge.title}
                                            </h4>
                                            <span className={classNames(
                                                'px-2 py-1 text-xs rounded-full font-medium',
                                                getDifficultyColor(challenge.difficulty)
                                            )}>
                                                {challenge.difficulty}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                            {challenge.description}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                                <span className="font-medium">
                                                    {challenge.progress.current}/{challenge.progress.total}
                                                </span>
                                            </div>

                                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(challenge.progress.current / challenge.progress.total) * 100}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {formatTimeRemaining(challenge.timeRemaining)} left
                                                </span>
                                                <span className="font-medium text-green-600 dark:text-green-400">
                                                    +{challenge.points} pts
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {selectedTab === 'achievements' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                All Achievements
                            </h3>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {achievements.map((achievement) => {
                                const Icon = achievement.icon;
                                return (
                                    <div
                                        key={achievement.id}
                                        className={classNames(
                                            'p-4 rounded-xl border transition-all',
                                            achievement.unlocked
                                                ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                                                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60'
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={classNames(
                                                'p-3 rounded-xl bg-gradient-to-br',
                                                achievement.unlocked ? getRarityColor(achievement.rarity) : 'from-gray-400 to-gray-500',
                                                'text-white'
                                            )}>
                                                <Icon className="h-6 w-6" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                                        {achievement.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className={classNames(
                                                            'px-2 py-1 text-xs rounded-full font-medium capitalize',
                                                            achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                                achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                                                    achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                                                        )}>
                                                            {achievement.rarity}
                                                        </span>
                                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                            +{achievement.points}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                                    {achievement.description}
                                                </p>

                                                {achievement.progress && !achievement.unlocked && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                                            <span className="font-medium">
                                                                {achievement.progress.current}/{achievement.progress.total}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${(achievement.progress.current / achievement.progress.total) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {achievement.unlocked && achievement.unlockedAt && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                        Unlocked {achievement.unlockedAt.toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {selectedTab === 'challenges' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Active Challenges
                        </h3>

                        <div className="space-y-4">
                            {challenges.map((challenge) => (
                                <div
                                    key={challenge.id}
                                    className={classNames(
                                        'p-6 rounded-xl border',
                                        challenge.completed
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {challenge.title}
                                                </h4>
                                                <span className={classNames(
                                                    'px-2 py-1 text-xs rounded-full font-medium uppercase',
                                                    challenge.type === 'daily' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                        challenge.type === 'weekly' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                                            challenge.type === 'monthly' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                                                                'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400'
                                                )}>
                                                    {challenge.type}
                                                </span>
                                                <span className={classNames(
                                                    'px-2 py-1 text-xs rounded-full font-medium',
                                                    getDifficultyColor(challenge.difficulty)
                                                )}>
                                                    {challenge.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                                                {challenge.description}
                                            </p>
                                        </div>

                                        <div className="text-right ml-4">
                                            <div className="flex items-center gap-1 mb-1">
                                                <SparklesIcon className="h-4 w-4 text-yellow-500" />
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {challenge.points}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {challenge.participants} participants
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                            <span className="font-medium">
                                                {challenge.progress.current} / {challenge.progress.total}
                                            </span>
                                        </div>

                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                            <div
                                                className={classNames(
                                                    'h-3 rounded-full transition-all duration-500',
                                                    challenge.completed ? 'bg-green-500' : 'bg-blue-500'
                                                )}
                                                style={{ width: `${Math.min(100, (challenge.progress.current / challenge.progress.total) * 100)}%` }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {challenge.completed ? 'Completed!' : `${formatTimeRemaining(challenge.timeRemaining)} remaining`}
                                            </span>
                                            {challenge.completed && (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    Reward claimed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTab === 'rewards' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Reward Shop
                            </h3>
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-yellow-500" />
                                <span className="font-bold text-xl text-gray-900 dark:text-white">
                                    {userStats.totalPoints.toLocaleString()}
                                </span>
                                <span className="text-gray-600 dark:text-gray-300">points</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rewards.map((reward) => (
                                <div
                                    key={reward.id}
                                    className={classNames(
                                        'p-4 rounded-xl border transition-all',
                                        reward.purchased
                                            ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                {reward.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                                {reward.description}
                                            </p>
                                        </div>
                                        {reward.limited && (
                                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full font-medium">
                                                Limited
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <SparklesIcon className="h-4 w-4 text-yellow-500" />
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                                                {reward.cost}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => purchaseReward(reward.id)}
                                            disabled={reward.purchased || userStats.totalPoints < reward.cost}
                                            className={classNames(
                                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                                reward.purchased
                                                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                    : userStats.totalPoints >= reward.cost
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            )}
                                        >
                                            {reward.purchased ? 'Purchased' : userStats.totalPoints >= reward.cost ? 'Purchase' : 'Not enough points'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTab === 'leaderboard' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Global Leaderboard
                        </h3>

                        <div className="space-y-2">
                            {leaderboard.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    className={classNames(
                                        'p-4 rounded-xl border flex items-center gap-4 transition-all',
                                        index < 3
                                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                                            : entry.username === 'StudyBuddy' // Simulate current user
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    )}
                                >
                                    {/* Rank */}
                                    <div className="flex items-center justify-center w-12 h-12">
                                        {index < 3 ? (
                                            <div className={classNames(
                                                'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg',
                                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                                                        'bg-gradient-to-br from-yellow-600 to-yellow-800'
                                            )}>
                                                {index + 1}
                                            </div>
                                        ) : (
                                            <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                                                #{index + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 flex items-center gap-3">
                                        <img
                                            src={entry.avatar}
                                            alt={entry.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                                    {entry.username}
                                                </h4>
                                                {entry.badge && (
                                                    <span className="w-4 h-4 bg-yellow-500 rounded-full" title="Special Badge" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                Level {entry.level} • {entry.streak} day streak
                                            </p>
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 mb-1">
                                            <SparklesIcon className="h-4 w-4 text-yellow-500" />
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {entry.points.toLocaleString()}
                                            </span>
                                        </div>
                                        {entry.change !== 0 && (
                                            <div className={classNames(
                                                'flex items-center gap-1 text-sm',
                                                entry.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            )}>
                                                <ArrowTrendingUpIcon className={classNames(
                                                    'h-4 w-4',
                                                    entry.change < 0 && 'rotate-180'
                                                )} />
                                                {Math.abs(entry.change)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}