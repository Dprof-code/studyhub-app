'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, FileText, TrendingUp } from 'lucide-react';

interface UserProfile {
    userId: number;
    enrolledCourses: number[];
    departmentId?: number;
    interactionHistory: Array<{
        resourceId: number;
        interactionType: string;
        weight: number;
    }>;
    preferredTags: string[];
    preferredFileTypes: string[];
}

export function RecommendationAnalytics() {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!userProfile) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Your Learning Insights</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Courses
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userProfile.enrolledCourses.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Enrolled and active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Interactions
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userProfile.interactionHistory.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Total resource interactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Preferred Tags
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userProfile.preferredTags.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Learning interests identified
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            File Types
                        </CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userProfile.preferredFileTypes.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Preferred content formats
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Preferred Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.preferredTags.slice(0, 8).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                        {userProfile.preferredTags.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Start interacting with resources to build your preferences
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Content Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {userProfile.preferredFileTypes.map((type, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {type.split('/')[1] || type}
                                </Badge>
                            ))}
                        </div>
                        {userProfile.preferredFileTypes.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Vote on resources to discover your preferred content types
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">How Recommendations Work</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <span className="font-medium">Collaborative Filtering:</span> We analyze users with similar interests and recommend resources they found helpful.
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div>
                                <span className="font-medium">Content-Based:</span> We match resources to your course enrollments, preferred topics, and content types.
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                            <div>
                                <span className="font-medium">Hybrid Approach:</span> We combine both methods for more accurate and diverse recommendations.
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}