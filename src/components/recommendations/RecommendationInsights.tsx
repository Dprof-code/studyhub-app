'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    preferredTags: string[];
    preferredFileTypes: string[];
    interactionHistory: Array<{
        resourceId: number;
        interactionType: string;
        weight: number;
    }>;
}

export function RecommendationInsights() {
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
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!userProfile) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <span>Your AI Insights</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {userProfile.preferredTags.length}
                        </div>
                        <div className="text-xs text-blue-700">Topics</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {userProfile.interactionHistory.length}
                        </div>
                        <div className="text-xs text-green-700">Interactions</div>
                    </div>
                </div>

                {/* Top Tags */}
                {userProfile.preferredTags.length > 0 && (
                    <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Your Interests</h4>
                        <div className="flex flex-wrap gap-1">
                            {userProfile.preferredTags.slice(0, 4).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* How it works */}
                <div className="border-t pt-3">
                    <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Smart Recommendations</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                        We analyze your interactions with similar users to suggest relevant content.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <Link
                        href="/analytics"
                        className="block w-full text-center py-2 px-3 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Eye className="h-4 w-4 inline mr-1" />
                        View Full Analytics
                    </Link>
                </div>

                {userProfile.preferredTags.length === 0 && (
                    <div className="text-center py-4">
                        <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 mb-2">
                            Start interacting with resources to get personalized insights!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}