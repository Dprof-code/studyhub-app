/**
 * Interactive Charts Component
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { useState } from 'react';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    CalendarDaysIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

// Mock data interfaces
interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
}

interface ChartProps {
    data: ChartDataPoint[];
    title: string;
    subtitle?: string;
    className?: string;
}

// Simple Bar Chart Component
export function SimpleBarChart({ data, title, subtitle, className }: ChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className={classNames(
            'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
            className
        )}>
            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {item.value}
                                </span>
                                {item.trend && (
                                    <ArrowTrendingUpIcon
                                        className={classNames(
                                            'h-4 w-4',
                                            item.trend === 'up' ? 'text-green-500' :
                                                item.trend === 'down' ? 'text-red-500 rotate-180' :
                                                    'text-gray-400'
                                        )}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={classNames(
                                    'h-2 rounded-full transition-all duration-500 group-hover:opacity-80',
                                    item.color || 'bg-blue-600 dark:bg-blue-500'
                                )}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Progress Ring Component
interface ProgressRingProps {
    percentage: number;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    label?: string;
    subtitle?: string;
}

export function ProgressRing({
    percentage,
    size = 'md',
    color = 'text-blue-600',
    label,
    subtitle
}: ProgressRingProps) {
    const sizeConfig = {
        sm: { ring: 'h-16 w-16', text: 'text-xs' },
        md: { ring: 'h-24 w-24', text: 'text-sm' },
        lg: { ring: 'h-32 w-32', text: 'text-lg' }
    };

    const circumference = 2 * Math.PI * 40; // radius = 40
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg className={classNames('transform -rotate-90', sizeConfig[size].ring)}>
                    <circle
                        cx="50%"
                        cy="50%"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                        cx="50%"
                        cy="50%"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        className={classNames(color, 'transition-all duration-500 ease-in-out')}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={classNames('font-bold text-gray-900 dark:text-white', sizeConfig[size].text)}>
                        {percentage}%
                    </span>
                </div>
            </div>
            {label && (
                <div className="text-center mt-2">
                    <div className="font-medium text-gray-900 dark:text-white">
                        {label}
                    </div>
                    {subtitle && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {subtitle}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Learning Progress Dashboard
interface LearningProgressProps {
    overallProgress: number;
    weeklyGoal: number;
    subjects: Array<{
        name: string;
        progress: number;
        hoursStudied: number;
        color: string;
    }>;
}

export function LearningProgressDashboard({
    overallProgress,
    weeklyGoal,
    subjects
}: LearningProgressProps) {
    const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'semester'>('week');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                        <AcademicCapIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Learning Progress
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Track your study achievements
                        </p>
                    </div>
                </div>

                {/* Timeframe selector */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                    {(['week', 'month', 'semester'] as const).map((timeframe) => (
                        <button
                            key={timeframe}
                            onClick={() => setSelectedTimeframe(timeframe)}
                            className={classNames(
                                'px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize',
                                selectedTimeframe === timeframe
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            )}
                        >
                            {timeframe}
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                    <ProgressRing
                        percentage={overallProgress}
                        size="lg"
                        color="text-blue-600 dark:text-blue-400"
                        label="Overall Progress"
                        subtitle="This week"
                    />
                </div>

                <div className="text-center">
                    <ProgressRing
                        percentage={weeklyGoal}
                        size="lg"
                        color="text-green-600 dark:text-green-400"
                        label="Weekly Goal"
                        subtitle={`${weeklyGoal}% complete`}
                    />
                </div>
            </div>

            {/* Subject Progress */}
            <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                    Subject Progress
                </h4>
                {subjects.map((subject, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                            <ProgressRing
                                percentage={subject.progress}
                                size="sm"
                                color={subject.color}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-900 dark:text-white">
                                    {subject.name}
                                </h5>
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {subject.hoursStudied}h studied
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                                <div
                                    className={classNames(
                                        'h-2 rounded-full transition-all duration-500',
                                        subject.color.replace('text-', 'bg-')
                                    )}
                                    style={{ width: `${subject.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Activity Heatmap Component
interface ActivityDay {
    date: string;
    value: number; // 0-4 intensity scale
}

interface ActivityHeatmapProps {
    data: ActivityDay[];
    title?: string;
}

export function ActivityHeatmap({ data, title = "Study Activity" }: ActivityHeatmapProps) {
    const intensityColors = [
        'bg-gray-100 dark:bg-gray-800', // 0 - no activity
        'bg-green-100 dark:bg-green-900/20', // 1 - low
        'bg-green-300 dark:bg-green-700/40', // 2 - moderate
        'bg-green-500 dark:bg-green-600/60', // 3 - high
        'bg-green-700 dark:bg-green-500' // 4 - very high
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <CalendarDaysIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Your learning consistency over time
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="text-xs text-center text-gray-600 dark:text-gray-300 py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {data.map((day, index) => (
                    <div
                        key={index}
                        className={classNames(
                            'aspect-square rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer',
                            intensityColors[day.value] || intensityColors[0]
                        )}
                        title={`${day.date}: ${day.value} study sessions`}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4 text-xs text-gray-600 dark:text-gray-300">
                <span>Less</span>
                <div className="flex gap-1">
                    {intensityColors.map((color, index) => (
                        <div key={index} className={classNames('w-3 h-3 rounded-sm', color)} />
                    ))}
                </div>
                <span>More</span>
            </div>
        </div>
    );
}