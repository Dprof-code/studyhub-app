'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Eye, Brain, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    preferredTags: string[];
    interactionHistory: Array<{
        resourceId: number;
        interactionType: string;
        weight: number;
    }>;
}

export function AnalyticsDashboardWidget() {
    const { data: userProfile, isLoading } = useQuery<UserProfile>({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const response = await fetch('/api/user/profile');
            if (!response.ok) throw new Error('Failed to fetch user profile');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2 text-blue-900">
                    <Brain className="h-5 w-5" />
                    <span>AI Learning Insights</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {userProfile && userProfile.preferredTags.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-white/70 rounded-lg">
                                <div className="text-xl font-bold text-blue-700">
                                    {userProfile.preferredTags.length}
                                </div>
                                <div className="text-xs text-blue-600">Learning Topics</div>
                            </div>
                            <div className="text-center p-3 bg-white/70 rounded-lg">
                                <div className="text-xl font-bold text-indigo-700">
                                    {userProfile.interactionHistory.length}
                                </div>
                                <div className="text-xs text-indigo-600">Interactions</div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-blue-800 mb-2">Top Interests:</p>
                            <div className="flex flex-wrap gap-1">
                                {userProfile.preferredTags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs bg-white/80">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                            <Sparkles className="h-4 w-4" />
                            <span>Personalized recommendations active</span>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <TrendingUp className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <p className="text-sm text-blue-700 mb-3">
                            Start exploring resources to unlock AI-powered insights!
                        </p>
                        <Link href="/resources">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Browse Resources
                            </Button>
                        </Link>
                    </div>
                )}

                <Link href="/analytics" className="block">
                    <Button variant="outline" size="sm" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Analytics
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}