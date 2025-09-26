'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Trophy,
    Award,
    TrendingUp,
    Users,
    Zap,
    Target,
    BarChart3,
    Star
} from 'lucide-react';

// Import our gamification components
import UserStatsDisplay from './UserStatsDisplay';
import AchievementsDisplay from './AchievementsDisplay';
import Leaderboard from './Leaderboard';

interface GamificationDashboardProps {
    userId?: string;
    compact?: boolean;
}

export default function GamificationDashboard({
    userId,
    compact = false
}: GamificationDashboardProps) {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState('overview');

    const currentUserId = userId || session?.user?.id;

    // Early return if no user ID is available
    if (!currentUserId) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Please sign in to view your gamification dashboard.</p>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="space-y-6">
                {/* Quick Stats */}
                <UserStatsDisplay
                    userId={parseInt(currentUserId)}
                    variant="compact"
                />

                {/* Recent Achievements */}
                <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-semibold mb-3 flex items-center space-x-2">
                        <Award className="h-5 w-5 text-yellow-600" />
                        <span>Recent Achievements</span>
                    </h3>
                    <AchievementsDisplay
                        userId={currentUserId}
                        showOnlyUnlocked={true}
                        compact={true}
                    />
                </div>

                {/* Quick Leaderboard */}
                <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-semibold mb-3 flex items-center space-x-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        <span>Top Performers</span>
                    </h3>
                    <Leaderboard limit={5} showUserRank={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gamification Hub</h2>
                    <p className="text-gray-600">
                        Track your progress, earn achievements, and compete with peers
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>Level System Active</span>
                    </Badge>
                </div>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview" className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="flex items-center space-x-2">
                        <Award className="h-4 w-4" />
                        <span>Achievements</span>
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4" />
                        <span>Leaderboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="challenges" className="flex items-center space-x-2">
                        <Target className="h-4 w-4" />
                        <span>Challenges</span>
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* User Stats - Takes up 2 columns */}
                        <div className="lg:col-span-2">
                            <UserStatsDisplay
                                userId={parseInt(currentUserId)}
                                variant="full"
                            />
                        </div>

                        {/* Side Panel */}
                        <div className="space-y-6">
                            {/* Quick Achievements */}
                            <div className="bg-white rounded-lg border p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold flex items-center space-x-2">
                                        <Star className="h-5 w-5 text-yellow-600" />
                                        <span>Recent Unlocks</span>
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActiveTab('achievements')}
                                    >
                                        View All
                                    </Button>
                                </div>
                                <AchievementsDisplay
                                    userId={currentUserId}
                                    showOnlyUnlocked={true}
                                    compact={true}
                                />
                            </div>

                            {/* Quick Leaderboard */}
                            <div className="bg-white rounded-lg border p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold flex items-center space-x-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        <span>Top 5 This Week</span>
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActiveTab('leaderboard')}
                                    >
                                        Full Board
                                    </Button>
                                </div>
                                <Leaderboard
                                    timeframe="weekly"
                                    limit={5}
                                    showUserRank={true}
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements" className="space-y-6">
                    <AchievementsDisplay userId={currentUserId} />
                </TabsContent>

                {/* Leaderboard Tab */}
                <TabsContent value="leaderboard" className="space-y-6">
                    <Leaderboard showUserRank={true} />
                </TabsContent>

                {/* Challenges Tab */}
                <TabsContent value="challenges" className="space-y-6">
                    <div className="text-center py-12">
                        <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Daily Challenges</h3>
                        <p className="text-gray-600 mb-6">
                            Complete daily challenges to earn bonus XP and unlock special achievements.
                        </p>
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                            <h4 className="font-semibold text-lg mb-2">Coming Soon!</h4>
                            <p className="text-gray-600">
                                Daily challenges feature is under development. Stay tuned for exciting tasks
                                that will help you learn faster and earn more rewards!
                            </p>
                            <div className="flex justify-center space-x-4 mt-4">
                                <Badge className="bg-purple-100 text-purple-800">Study Goals</Badge>
                                <Badge className="bg-pink-100 text-pink-800">Social Tasks</Badge>
                                <Badge className="bg-blue-100 text-blue-800">Knowledge Tests</Badge>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}