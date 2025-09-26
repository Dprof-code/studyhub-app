'use client';

import { RecommendationAnalytics } from '@/components/recommendations/RecommendationAnalytics';
import { TrackPageView } from '@/components/gamification/ActivityTracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Brain, Target } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <TrackPageView page="analytics" delay={2000} />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <Link href="/dashboard">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-3 mb-2">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Learning Analytics</h1>
                    </div>
                    <p className="text-gray-600 text-lg">
                        Understand your learning patterns and discover how our AI recommendations work
                    </p>
                </div>

                {/* Key Features Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center space-x-3 mb-3">
                            <Brain className="h-6 w-6 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Machine learning algorithms analyze your behavior to suggest relevant resources
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center space-x-3 mb-3">
                            <Target className="h-6 w-6 text-green-600" />
                            <h3 className="font-semibold text-gray-900">Personalized Learning</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Content tailored to your courses, preferences, and learning style
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center space-x-3 mb-3">
                            <BarChart3 className="h-6 w-6 text-purple-600" />
                            <h3 className="font-semibold text-gray-900">Learning Insights</h3>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Track your progress and understand your learning patterns over time
                        </p>
                    </div>
                </div>

                {/* Main Analytics Component */}
                <RecommendationAnalytics />

                {/* Action Items */}
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                        Improve Your Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-blue-800">Quick Actions:</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Vote on resources you find helpful</li>
                                <li>• Comment on resources with insights</li>
                                <li>• Download resources for offline study</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-blue-800">Explore Content:</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Browse resources from your courses</li>
                                <li>• Try different content types (PDFs, videos, etc.)</li>
                                <li>• Join discussions in your department</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 flex space-x-3">
                        <Link href="/resources">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                Explore Resources
                            </Button>
                        </Link>
                        <Link href="/discussions">
                            <Button variant="outline">
                                Join Discussions
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}