/**
 * AI Insight Cards Component
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { ReactNode } from 'react';
import {
    SparklesIcon,
    LightBulbIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

export type InsightType =
    | 'recommendation'
    | 'insight'
    | 'warning'
    | 'success'
    | 'info'
    | 'trend'
    | 'time'
    | 'peer';

interface AIInsightCardProps {
    type: InsightType;
    title: string;
    description: string;
    value?: string | number;
    change?: {
        value: string;
        trend: 'up' | 'down' | 'neutral';
    };
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    className?: string;
    children?: ReactNode;
}

const typeConfig = {
    recommendation: {
        icon: SparklesIcon,
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        borderColor: 'border-purple-200 dark:border-purple-800'
    },
    insight: {
        icon: LightBulbIcon,
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    warning: {
        icon: ExclamationTriangleIcon,
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'border-orange-200 dark:border-orange-800'
    },
    success: {
        icon: CheckCircleIcon,
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        iconColor: 'text-green-600 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800'
    },
    info: {
        icon: InformationCircleIcon,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800'
    },
    trend: {
        icon: ArrowTrendingUpIcon,
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        borderColor: 'border-indigo-200 dark:border-indigo-800'
    },
    time: {
        icon: ClockIcon,
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        iconColor: 'text-gray-600 dark:text-gray-400',
        borderColor: 'border-gray-200 dark:border-gray-700'
    },
    peer: {
        icon: UserGroupIcon,
        bgColor: 'bg-teal-50 dark:bg-teal-900/20',
        iconColor: 'text-teal-600 dark:text-teal-400',
        borderColor: 'border-teal-200 dark:border-teal-800'
    }
};

export function AIInsightCard({
    type,
    title,
    description,
    value,
    change,
    action,
    className,
    children
}: AIInsightCardProps) {
    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div className={classNames(
            'relative overflow-hidden rounded-xl border bg-white dark:bg-gray-800 p-6 shadow-sm transition-all duration-200 hover:shadow-md',
            config.borderColor,
            className
        )}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className={classNames(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        config.bgColor
                    )}>
                        <Icon className={classNames('h-6 w-6', config.iconColor)} aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {description}
                        </p>
                    </div>
                </div>

                {value && (
                    <div className="flex flex-col items-end">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {value}
                        </div>
                        {change && (
                            <div className={classNames(
                                'flex items-center gap-1 text-sm font-medium',
                                change.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                                    change.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                                        'text-gray-600 dark:text-gray-400'
                            )}>
                                {change.trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4" />}
                                {change.trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4" />}
                                {change.value}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Additional Content */}
            {children && (
                <div className="mt-4">
                    {children}
                </div>
            )}

            {/* Action Button */}
            {action && (
                <div className="mt-6">
                    <button
                        onClick={action.onClick}
                        className={classNames(
                            'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                            action.variant === 'primary'
                                ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        )}
                    >
                        {action.label}
                    </button>
                </div>
            )}

            {/* Decorative gradient */}
            <div className={classNames(
                'absolute top-0 right-0 h-20 w-20 -translate-y-10 translate-x-10 transform rounded-full opacity-10',
                config.bgColor
            )} />
        </div>
    );
}

// Specialized insight card components
interface QuickStatsProps {
    stats: Array<{
        label: string;
        value: string | number;
        change?: {
            value: string;
            trend: 'up' | 'down' | 'neutral';
        };
    }>;
}

export function QuickStatsCard({ stats }: QuickStatsProps) {
    return (
        <AIInsightCard
            type="info"
            title="Quick Stats"
            description="Your learning metrics at a glance"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stat.value}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {stat.label}
                        </div>
                        {stat.change && (
                            <div className={classNames(
                                'text-xs font-medium mt-1',
                                stat.change.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                                    stat.change.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                                        'text-gray-600 dark:text-gray-400'
                            )}>
                                {stat.change.value}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </AIInsightCard>
    );
}

interface RecommendationListProps {
    recommendations: Array<{
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        action?: () => void;
    }>;
}

export function RecommendationListCard({ recommendations }: RecommendationListProps) {
    const priorityColors = {
        high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    };

    return (
        <AIInsightCard
            type="recommendation"
            title="AI Recommendations"
            description="Personalized suggestions to improve your learning"
        >
            <div className="space-y-3">
                {recommendations.map((rec, index) => (
                    <div
                        key={index}
                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    {rec.title}
                                </h4>
                                <span className={classNames(
                                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                    priorityColors[rec.priority]
                                )}>
                                    {rec.priority}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {rec.description}
                            </p>
                        </div>
                        {rec.action && (
                            <button
                                onClick={rec.action}
                                className="ml-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                                Apply
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </AIInsightCard>
    );
}