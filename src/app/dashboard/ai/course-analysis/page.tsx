/**
 * Course Analytics Center Page
 * Phase 5B: Core Features Implementation
 */
'use client';

import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import {
    SimpleBarChart,
    LearningProgressDashboard,
    ActivityHeatmap
} from '@/components/ai/charts/InteractiveCharts';
import {
    AIInsightCard,
    QuickStatsCard,
    RecommendationListCard
} from '@/components/ai/cards/AIInsightCard';

// Mock data for course analytics
const mockCourseStats = [
    { label: 'Course Progress', value: '78%', change: { value: '+5%', trend: 'up' as const } },
    { label: 'Average Score', value: '85', change: { value: '+3', trend: 'up' as const } },
    { label: 'Study Hours', value: '42h', change: { value: '+8h', trend: 'up' as const } },
    { label: 'Completion Rate', value: '92%', change: { value: '=', trend: 'neutral' as const } }
];

const mockPerformanceData = [
    { label: 'Week 1', value: 72, trend: 'neutral' as const },
    { label: 'Week 2', value: 78, trend: 'up' as const },
    { label: 'Week 3', value: 85, trend: 'up' as const },
    { label: 'Week 4', value: 81, trend: 'down' as const },
    { label: 'Week 5', value: 87, trend: 'up' as const },
];

const mockRecommendations = [
    {
        title: 'Focus on Database Concepts',
        description: 'Your performance in SQL queries needs improvement. Review JOIN operations.',
        priority: 'high' as const
    },
    {
        title: 'Great Progress in Algorithms',
        description: 'You\'re excelling in algorithmic thinking. Consider advanced topics.',
        priority: 'low' as const
    },
    {
        title: 'Schedule Regular Reviews',
        description: 'Set up weekly review sessions for better retention.',
        priority: 'medium' as const
    }
];

export default function CourseAnalysisPage() {
    return (
        <AIDashboardLayout>
            <div className="space-y-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Course Analytics Center
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Comprehensive analysis of your course performance and progress
                    </p>
                </div>

                {/* Stats Overview */}
                <QuickStatsCard stats={mockCourseStats} />

                {/* Main Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Chart */}
                    <SimpleBarChart
                        data={mockPerformanceData}
                        title="Weekly Performance Trend"
                        subtitle="Your scores over the past 5 weeks"
                    />

                    {/* Course Recommendations */}
                    <RecommendationListCard recommendations={mockRecommendations} />
                </div>

                {/* Additional Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AIInsightCard
                        type="trend"
                        title="Learning Velocity"
                        description="Your learning pace"
                        value="↗ 15%"
                        change={{ value: 'vs last month', trend: 'up' }}
                    />

                    <AIInsightCard
                        type="success"
                        title="Milestone Achieved"
                        description="Completed Module 3"
                        value="100%"
                    />

                    <AIInsightCard
                        type="warning"
                        title="Attention Needed"
                        description="Assignment due soon"
                        value="2 days"
                    />
                </div>

                {/* Study Activity Heatmap */}
                <ActivityHeatmap
                    data={Array.from({ length: 90 }, (_, i) => ({
                        date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        value: Math.floor(Math.random() * 5)
                    }))}
                    title="Course Activity Pattern"
                />
            </div>
        </AIDashboardLayout>
    );
}