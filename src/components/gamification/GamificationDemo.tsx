'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    GamificationWidget,
    UserStatsDisplay,
    AchievementsDisplay,
    Leaderboard,
    ContentVoting
} from '@/components/gamification';
import { useGamification } from '@/hooks/useGamification';
import { Badge } from '@/components/ui/badge';

export default function GamificationDemo() {
    const [testResourceId] = useState(1);
    const { recordActivity } = useGamification();

    const handleTestActivity = async (activity: string) => {
        await recordActivity(activity, {
            source: 'demo',
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">🎮 StudyHub Gamification Demo</h1>
                <p className="text-xl text-gray-600 mb-8">
                    Explore all the gamification features integrated into StudyHub
                </p>

                {/* Quick Stats Demo */}
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
                    <h2 className="text-lg font-semibold mb-4">Navigation Bar Quick Stats</h2>
                    <GamificationWidget type="quick-stats" />
                </div>
            </div>

            {/* Test Activities */}
            <Card>
                <CardHeader>
                    <CardTitle>🎯 Test Activities (Earn XP!)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                            onClick={() => handleTestActivity('RESOURCE_UPLOAD')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Upload Resource (+20 XP)
                        </Button>
                        <Button
                            onClick={() => handleTestActivity('DISCUSSION_POST')}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Create Discussion (+15 XP)
                        </Button>
                        <Button
                            onClick={() => handleTestActivity('COMMENT')}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Add Comment (+5 XP)
                        </Button>
                        <Button
                            onClick={() => handleTestActivity('VOTE_CAST')}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Cast Vote (+3 XP)
                        </Button>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <Badge variant="outline" className="mb-2">💡 Tip</Badge>
                        <p className="text-sm text-yellow-800">
                            Click the buttons above to simulate activities and earn XP!
                            Watch for toast notifications and check your stats below.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Component Showcase */}
            <Tabs defaultValue="widgets" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="widgets">Widgets</TabsTrigger>
                    <TabsTrigger value="stats">User Stats</TabsTrigger>
                    <TabsTrigger value="achievements">Achievements</TabsTrigger>
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    <TabsTrigger value="voting">Voting</TabsTrigger>
                </TabsList>

                <TabsContent value="widgets" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>🔧 Gamification Widgets</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Quick Stats Widget</h3>
                                <p className="text-sm text-gray-600 mb-3">Perfect for navigation bars or headers</p>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <GamificationWidget type="quick-stats" />
                                </div>
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                                    {'<GamificationWidget type="quick-stats" />'}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Compact Stats Widget</h3>
                                <p className="text-sm text-gray-600 mb-3">Great for sidebars or profile cards</p>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <GamificationWidget type="stats" size="sm" />
                                </div>
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                                    {'<GamificationWidget type="stats" size="sm" />'}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Voting Widget</h3>
                                <p className="text-sm text-gray-600 mb-3">Add to any content (resources, posts, comments)</p>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <GamificationWidget
                                        type="voting"
                                        contentId={testResourceId}
                                        contentType="resource"
                                        showDetails={true}
                                    />
                                </div>
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                                    {'<GamificationWidget type="voting" contentId={123} contentType="resource" />'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats">
                    <Card>
                        <CardHeader>
                            <CardTitle>📊 User Stats Display</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Full Stats View</h3>
                                <UserStatsDisplay userId={1} variant="full" />
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Compact View</h3>
                                <UserStatsDisplay userId={1} variant="compact" />
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Minimal View</h3>
                                <UserStatsDisplay userId={1} variant="minimal" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="achievements">
                    <Card>
                        <CardHeader>
                            <CardTitle>🏆 Achievements System</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AchievementsDisplay compact={false} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaderboard">
                    <Card>
                        <CardHeader>
                            <CardTitle>🥇 Leaderboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Leaderboard showUserRank={true} limit={10} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="voting">
                    <Card>
                        <CardHeader>
                            <CardTitle>🗳️ Content Voting System</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Standard Voting (with details)</h3>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <ContentVoting
                                        contentId={testResourceId}
                                        contentType="resource"
                                        showDetails={true}
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Compact Voting</h3>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <ContentVoting
                                        contentId={testResourceId}
                                        contentType="resource"
                                        size="sm"
                                        showDetails={false}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Badge variant="outline" className="mb-2">ℹ️ Vote Types</Badge>
                                <div className="space-y-2 text-sm">
                                    <div><strong>👍 Upvote:</strong> General approval (+1 point base)</div>
                                    <div><strong>❤️ Helpful:</strong> Content helped learning (+2 points base)</div>
                                    <div><strong>🏆 Quality:</strong> High-quality contribution (+3 points base)</div>
                                    <div><strong>✅ Expert:</strong> Expert endorsement (+5 points base)</div>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    * Vote weight is multiplied by voter&apos;s reputation score for final impact
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Integration Examples */}
            <Card>
                <CardHeader>
                    <CardTitle>🔗 Integration Examples</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Resource Card Integration</h3>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <div className="mb-4">
                                    <h4 className="font-medium">Advanced Mathematics Notes</h4>
                                    <p className="text-sm text-gray-600">By @john_doe • 2 days ago</p>
                                </div>
                                <ContentVoting
                                    contentId={testResourceId}
                                    contentType="resource"
                                    size="sm"
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Profile Sidebar</h3>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h4 className="font-medium mb-3">Your Progress</h4>
                                <GamificationWidget type="stats" size="sm" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <Badge variant="outline" className="mb-2">✅ Ready to Use</Badge>
                        <p className="text-sm text-green-800">
                            All gamification components are now integrated throughout the app:
                        </p>
                        <ul className="text-sm text-green-700 mt-2 space-y-1 ml-4">
                            <li>• Navigation bar shows quick stats</li>
                            <li>• Profile page displays full progress</li>
                            <li>• Resources and discussions have voting</li>
                            <li>• Automatic activity tracking on key actions</li>
                            <li>• Toast notifications for XP gains and achievements</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}