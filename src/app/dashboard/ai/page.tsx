/**
 * AI Dashboard Page
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { useState } from 'react';
import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import {
    AIInsightCard,
    QuickStatsCard,
    RecommendationListCard
} from '@/components/ai/cards/AIInsightCard';
import {
    SimpleBarChart,
    LearningProgressDashboard,
    ActivityHeatmap
} from '@/components/ai/charts/InteractiveCharts';
import {
    AIProcessingStatus,
    useProcessingStatus
} from '@/components/ai/processing/ProcessingStatus';
import {
    SparklesIcon,
    DocumentTextIcon,
    BookOpenIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

// Mock data
const mockStats = [
    { label: 'Study Hours', value: '24.5h', change: { value: '+12%', trend: 'up' as const } },
    { label: 'Questions Solved', value: '127', change: { value: '+8%', trend: 'up' as const } },
    { label: 'Concepts Mastered', value: '42', change: { value: '+5%', trend: 'up' as const } },
    { label: 'Streak Days', value: '7', change: { value: '=', trend: 'neutral' as const } }
];

const mockRecommendations = [
    {
        title: 'Focus on Data Structures',
        description: 'You\'ve been struggling with tree problems. Consider reviewing binary trees.',
        priority: 'high' as const,
        action: () => alert('Opening Data Structures module...')
    },
    {
        title: 'Take a break from Algorithms',
        description: 'You\'ve been studying algorithms intensively. A short break might help.',
        priority: 'medium' as const,
        action: () => alert('Setting reminder...')
    },
    {
        title: 'Practice more SQL queries',
        description: 'Your database knowledge could use some reinforcement.',
        priority: 'low' as const,
        action: () => alert('Opening SQL practice...')
    }
];

const mockSubjectProgress = [
    { name: 'Mathematics', progress: 78, hoursStudied: 12, color: 'text-blue-600' },
    { name: 'Computer Science', progress: 65, hoursStudied: 18, color: 'text-green-600' },
    { name: 'Physics', progress: 42, hoursStudied: 8, color: 'text-purple-600' },
    { name: 'Chemistry', progress: 89, hoursStudied: 15, color: 'text-orange-600' }
];

const mockPerformanceData = [
    { label: 'Week 1', value: 75, trend: 'neutral' as const },
    { label: 'Week 2', value: 82, trend: 'up' as const },
    { label: 'Week 3', value: 68, trend: 'down' as const },
    { label: 'Week 4', value: 91, trend: 'up' as const },
];

// Generate mock activity data for the last 3 months
const generateActivityData = () => {
    const data = [];
    const today = new Date();
    for (let i = 90; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        data.push({
            date: date.toISOString().split('T')[0],
            value: Math.floor(Math.random() * 5) // 0-4 intensity
        });
    }
    return data;
};

export default function AIDashboardPage() {
    const [activeProcessingJob] = useState<string>('job_123');
    const { status, steps, retry, pause, resume } = useProcessingStatus(activeProcessingJob);
    const activityData = generateActivityData();

    return (
        <AIDashboardLayout>
            <div className="space-y-8">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            AI Dashboard
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            Monitor your learning progress and AI-powered insights
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <SparklesIcon className="h-5 w-5 mr-2" />
                            Generate Insights
                        </button>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <QuickStatsCard stats={mockStats} />
                    </div>
                    <div>
                        <AIInsightCard
                            type="trend"
                            title="Performance Trend"
                            description="Your learning velocity"
                            value="↗ 23%"
                            change={{ value: 'vs last week', trend: 'up' }}
                        />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Progress & Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Learning Progress */}
                        <LearningProgressDashboard
                            overallProgress={72}
                            weeklyGoal={85}
                            subjects={mockSubjectProgress}
                        />

                        {/* Performance Chart */}
                        <SimpleBarChart
                            data={mockPerformanceData}
                            title="Weekly Performance"
                            subtitle="Your average scores over time"
                        />

                        {/* Activity Heatmap */}
                        <ActivityHeatmap
                            data={activityData}
                            title="Study Consistency"
                        />
                    </div>

                    {/* Right Column - Insights & Processing */}
                    <div className="space-y-6">
                        {/* AI Recommendations */}
                        <RecommendationListCard recommendations={mockRecommendations} />

                        {/* Recent Insights */}
                        <AIInsightCard
                            type="insight"
                            title="Study Pattern Analysis"
                            description="Based on your recent activity"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Peak productivity
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        2:00 PM - 4:00 PM
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Preferred subjects
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        Math, CS
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        Session duration
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        45 min average
                                    </span>
                                </div>
                            </div>
                        </AIInsightCard>

                        {/* Processing Status */}
                        {status !== 'idle' && (
                            <AIProcessingStatus
                                jobId={activeProcessingJob}
                                steps={steps}
                                overallStatus={status}
                                onRetry={retry}
                                onPause={pause}
                                onResume={resume}
                            />
                        )}

                        {/* Quick Actions */}
                        <AIInsightCard
                            type="info"
                            title="Quick Actions"
                            description="Jump to key features"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Upload Docs
                                    </span>
                                </button>

                                <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <BookOpenIcon className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Study Plan
                                    </span>
                                </button>

                                <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Analytics
                                    </span>
                                </button>

                                <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <SparklesIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        AI Chat
                                    </span>
                                </button>
                            </div>
                        </AIInsightCard>
                    </div>
                </div>
            </div>
        </AIDashboardLayout>
    );
}