'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Trophy,
    Medal,
    Crown,
    Award,
    TrendingUp,
    Users,
    Calendar,
    BookOpen,
    MessageCircle,
    Heart,
    ChevronUp,
    ChevronDown,
    Minus,
    Loader2
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

interface LeaderboardEntry {
    rank: number;
    user: {
        id: number;
        username: string;
        avatarUrl: string | null;
        department?: {
            name: string;
        };
    };
    score: number;
    change?: number; // Position change from previous period
}

interface LeaderboardData {
    entries: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
    totalUsers: number;
}

interface LeaderboardProps {
    department?: string;
    timeframe?: 'weekly' | 'monthly' | 'all-time';
    limit?: number;
    showUserRank?: boolean;
}

const LEADERBOARD_TYPES = {
    overall: {
        label: 'Overall Score',
        icon: Trophy,
        description: 'Total reputation score'
    },
    xp: {
        label: 'Experience Points',
        icon: TrendingUp,
        description: 'Total XP earned'
    },
    contributions: {
        label: 'Contributions',
        icon: Heart,
        description: 'Resources shared and discussions created'
    },
    participation: {
        label: 'Participation',
        icon: MessageCircle,
        description: 'Comments and interactions'
    },
    streak: {
        label: 'Activity Streak',
        icon: Calendar,
        description: 'Consecutive active days'
    }
};

const TIMEFRAME_OPTIONS = {
    'weekly': 'This Week',
    'monthly': 'This Month',
    'all-time': 'All Time'
};

export default function Leaderboard({
    department,
    timeframe = 'all-time',
    limit = 50,
    showUserRank = true
}: LeaderboardProps) {
    const { data: session } = useSession();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<keyof typeof LEADERBOARD_TYPES>('overall');
    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
    const [selectedDepartment, setSelectedDepartment] = useState(department || 'all');
    const [departments, setDepartments] = useState<Array<{ id: string, name: string }>>([]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [selectedType, selectedTimeframe, selectedDepartment]);

    const fetchDepartments = async () => {
        try {
            const response = await fetch('/api/departments');
            if (response.ok) {
                const data = await response.json();
                setDepartments(data);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: selectedType,
                timeframe: selectedTimeframe,
                limit: limit.toString()
            });

            if (selectedDepartment !== 'all') {
                params.append('department', selectedDepartment);
            }

            if (showUserRank && session?.user?.id) {
                params.append('userId', session.user.id);
            }

            const response = await fetch(`/api/gamification/leaderboard?${params}`);

            if (response.ok) {
                const data = await response.json();
                setLeaderboardData(data);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="h-6 w-6 text-yellow-500" />;
            case 2:
                return <Medal className="h-6 w-6 text-gray-400" />;
            case 3:
                return <Award className="h-6 w-6 text-amber-600" />;
            default:
                return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank <= 3) {
            const colors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-amber-100 text-amber-800'];
            return (
                <Badge className={`${colors[rank - 1]} border-0`}>
                    #{rank}
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-gray-600">
                #{rank}
            </Badge>
        );
    };

    const getChangeIcon = (change?: number) => {
        if (!change) return <Minus className="h-4 w-4 text-gray-400" />;
        if (change > 0) return <ChevronUp className="h-4 w-4 text-green-500" />;
        return <ChevronDown className="h-4 w-4 text-red-500" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading leaderboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Leaderboard</h3>
                    <p className="text-gray-600">Top performers in the StudyHub community</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as 'weekly' | 'monthly' | 'all-time')}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(TIMEFRAME_OPTIONS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as keyof typeof LEADERBOARD_TYPES)}>
                <TabsList className="grid w-full grid-cols-5">
                    {Object.entries(LEADERBOARD_TYPES).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <TabsTrigger key={key} value={key} className="flex items-center space-x-1">
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{config.label}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {Object.entries(LEADERBOARD_TYPES).map(([key, config]) => (
                    <TabsContent key={key} value={key} className="mt-6">
                        <div className="bg-white rounded-lg border">
                            {/* Tab Header */}
                            <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                                <div className="flex items-center space-x-2">
                                    <config.icon className="h-5 w-5 text-gray-600" />
                                    <h4 className="font-semibold">{config.label}</h4>
                                    <Badge variant="outline" className="text-xs">
                                        {leaderboardData?.entries?.length || 0} users
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                            </div>

                            {/* User's Rank (if not in top entries) */}
                            {showUserRank && leaderboardData?.userRank && leaderboardData.userRank.rank > limit && (
                                <div className="p-4 bg-blue-50 border-b border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center space-x-2">
                                                {getRankBadge(leaderboardData.userRank.rank)}
                                                <span className="text-sm text-blue-600 font-medium">Your Rank</span>
                                            </div>
                                            <Avatar
                                                className="h-8 w-8"
                                                src={leaderboardData.userRank.user.avatarUrl || '/avatar.jpg'}
                                                alt={leaderboardData.userRank.user.username}
                                            />
                                            <div>
                                                <p className="font-medium">@{leaderboardData.userRank.user.username}</p>
                                                {leaderboardData.userRank.user.department && (
                                                    <p className="text-xs text-gray-500">
                                                        {leaderboardData.userRank.user.department.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-600">{leaderboardData.userRank.score.toLocaleString()}</p>
                                            {leaderboardData.userRank.change !== undefined && (
                                                <div className="flex items-center space-x-1">
                                                    {getChangeIcon(leaderboardData.userRank.change)}
                                                    <span className="text-xs text-gray-500">
                                                        {Math.abs(leaderboardData.userRank.change)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Leaderboard Entries */}
                            <div className="divide-y">
                                {leaderboardData?.entries?.map((entry, index) => (
                                    <div
                                        key={entry.user.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${session?.user?.id && entry.user.id.toString() === session.user.id
                                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                            : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                {/* Rank */}
                                                <div className="flex items-center justify-center w-12">
                                                    {getRankIcon(entry.rank)}
                                                </div>

                                                {/* User Info */}
                                                <Avatar
                                                    className="h-10 w-10"
                                                    src={entry.user.avatarUrl || '/avatar.jpg'}
                                                    alt={entry.user.username}
                                                />

                                                <div>
                                                    <p className="font-medium">@{entry.user.username}</p>
                                                    {entry.user.department && (
                                                        <p className="text-sm text-gray-500">
                                                            {entry.user.department.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Score and Change */}
                                            <div className="text-right">
                                                <p className="font-bold text-lg">
                                                    {entry.score.toLocaleString()}
                                                </p>
                                                {entry.change !== undefined && (
                                                    <div className="flex items-center justify-end space-x-1">
                                                        {getChangeIcon(entry.change)}
                                                        <span className="text-sm text-gray-500">
                                                            {Math.abs(entry.change)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Empty State */}
                            {!leaderboardData?.entries?.length && (
                                <div className="text-center py-12">
                                    <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings yet</h3>
                                    <p className="text-gray-500">
                                        Be the first to earn points and appear on the leaderboard!
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}