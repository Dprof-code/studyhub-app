/**
 * Advanced Analytics Dashboard
 * Phase 5C: Advanced Features & Optimization
 */
'use client';

import { useState, useEffect } from 'react';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    BoltIcon,
    AcademicCapIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    EyeIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

// Advanced analytics types
interface PredictiveInsight {
    id: string;
    type: 'performance_forecast' | 'risk_assessment' | 'opportunity' | 'recommendation';
    title: string;
    description: string;
    confidence: number; // 0-100
    impact: 'high' | 'medium' | 'low';
    timeframe: string;
    actionable: boolean;
    data: {
        currentValue?: number;
        predictedValue?: number;
        trend?: 'up' | 'down' | 'stable';
        factors?: string[];
    };
}

interface LearningPattern {
    id: string;
    pattern: string;
    frequency: number;
    effectiveness: number;
    suggestions: string[];
    relatedConcepts: string[];
}

interface PerformanceMetrics {
    overall: {
        score: number;
        trend: 'up' | 'down' | 'stable';
        change: number;
    };
    categories: {
        comprehension: number;
        retention: number;
        application: number;
        speed: number;
        consistency: number;
    };
    predictions: {
        nextWeek: number;
        nextMonth: number;
        confidence: number;
    };
}

interface AdvancedAnalyticsProps {
    userId?: string;
    courseId?: string;
    timeframe?: 'week' | 'month' | 'semester' | 'year';
    className?: string;
}

export default function AdvancedAnalyticsDashboard({
    userId,
    courseId,
    timeframe = 'month',
    className
}: AdvancedAnalyticsProps) {
    const [insights, setInsights] = useState<PredictiveInsight[]>([]);
    const [patterns, setPatterns] = useState<LearningPattern[]>([]);
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'predictions' | 'patterns' | 'recommendations'>('overview');

    // Mock data - replace with actual API calls
    useEffect(() => {
        const mockInsights: PredictiveInsight[] = [
            {
                id: '1',
                type: 'performance_forecast',
                title: 'Performance Improvement Expected',
                description: 'Based on your current learning patterns, we predict a 15% improvement in your next assessment.',
                confidence: 87,
                impact: 'high',
                timeframe: 'Next 2 weeks',
                actionable: true,
                data: {
                    currentValue: 78,
                    predictedValue: 90,
                    trend: 'up',
                    factors: ['Consistent study schedule', 'Improved concept understanding', 'Regular practice sessions']
                }
            },
            {
                id: '2',
                type: 'risk_assessment',
                title: 'Attention Needed: Data Structures',
                description: 'Your performance in data structures has been declining. Risk of falling behind in upcoming modules.',
                confidence: 92,
                impact: 'high',
                timeframe: 'Next 1 week',
                actionable: true,
                data: {
                    currentValue: 65,
                    predictedValue: 55,
                    trend: 'down',
                    factors: ['Missed 3 study sessions', 'Low quiz scores', 'Incomplete assignments']
                }
            },
            {
                id: '3',
                type: 'opportunity',
                title: 'Optimization Potential Detected',
                description: 'Your peak learning hours are 2-4 PM. Scheduling complex topics during this time could boost retention by 25%.',
                confidence: 76,
                impact: 'medium',
                timeframe: 'Immediate',
                actionable: true,
                data: {
                    factors: ['Circadian rhythm analysis', 'Performance correlation', 'Attention span patterns']
                }
            },
            {
                id: '4',
                type: 'recommendation',
                title: 'Adaptive Learning Path Suggested',
                description: 'Switch to visual learning methods for algorithms. Your visual processing shows 40% better retention.',
                confidence: 84,
                impact: 'medium',
                timeframe: 'Next session',
                actionable: true,
                data: {
                    factors: ['Learning style analysis', 'Retention rate comparison', 'Engagement metrics']
                }
            }
        ];

        const mockPatterns: LearningPattern[] = [
            {
                id: '1',
                pattern: 'Afternoon Study Sessions',
                frequency: 85,
                effectiveness: 92,
                suggestions: ['Schedule complex topics between 2-4 PM', 'Use this time for new concept learning'],
                relatedConcepts: ['Focus periods', 'Circadian rhythm', 'Peak performance']
            },
            {
                id: '2',
                pattern: 'Spaced Repetition Usage',
                frequency: 60,
                effectiveness: 88,
                suggestions: ['Increase spaced repetition frequency', 'Apply to challenging concepts'],
                relatedConcepts: ['Memory consolidation', 'Long-term retention', 'Review scheduling']
            },
            {
                id: '3',
                pattern: 'Collaborative Learning',
                frequency: 40,
                effectiveness: 95,
                suggestions: ['Join more study groups', 'Engage in peer discussions'],
                relatedConcepts: ['Social learning', 'Knowledge sharing', 'Group dynamics']
            }
        ];

        const mockMetrics: PerformanceMetrics = {
            overall: {
                score: 82,
                trend: 'up',
                change: 7
            },
            categories: {
                comprehension: 85,
                retention: 78,
                application: 88,
                speed: 72,
                consistency: 90
            },
            predictions: {
                nextWeek: 84,
                nextMonth: 89,
                confidence: 87
            }
        };

        setIsLoading(true);
        setTimeout(() => {
            setInsights(mockInsights);
            setPatterns(mockPatterns);
            setMetrics(mockMetrics);
            setIsLoading(false);
        }, 1500);
    }, [userId, courseId, timeframe]);

    const getInsightIcon = (type: PredictiveInsight['type']) => {
        switch (type) {
            case 'performance_forecast':
                return ArrowTrendingUpIcon;
            case 'risk_assessment':
                return ExclamationTriangleIcon;
            case 'opportunity':
                return BoltIcon;
            case 'recommendation':
                return AcademicCapIcon;
            default:
                return ChartBarIcon;
        }
    };

    const getInsightColor = (type: PredictiveInsight['type']) => {
        switch (type) {
            case 'performance_forecast':
                return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
            case 'risk_assessment':
                return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
            case 'opportunity':
                return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
            case 'recommendation':
                return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-400';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'text-green-600 dark:text-green-400';
        if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    if (isLoading) {
        return (
            <div className={classNames(
                'flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
                className
            )}>
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">Analyzing learning patterns...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">This may take a few moments</p>
                </div>
            </div>
        );
    }

    return (
        <div className={classNames(
            'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                        <CpuChipIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            AI Analytics Center
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Predictive insights and learning optimization
                        </p>
                    </div>
                </div>

                {/* View Mode Selector */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                    {(['overview', 'predictions', 'patterns', 'recommendations'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={classNames(
                                'px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize',
                                viewMode === mode
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {viewMode === 'overview' && (
                    <div className="space-y-8">
                        {/* Performance Overview */}
                        {metrics && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Overall Score */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Overall Performance
                                        </h3>
                                        <div className={classNames(
                                            'flex items-center gap-1',
                                            metrics.overall.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        )}>
                                            {metrics.overall.trend === 'up' ? (
                                                <ArrowTrendingUpIcon className="h-5 w-5" />
                                            ) : (
                                                <ArrowTrendingDownIcon className="h-5 w-5" />
                                            )}
                                            <span className="font-medium">
                                                {metrics.overall.change > 0 ? '+' : ''}{metrics.overall.change}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        {metrics.overall.score}%
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Next Week</p>
                                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {metrics.predictions.nextWeek}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Next Month</p>
                                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {metrics.predictions.nextMonth}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Category Breakdown */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Performance Categories
                                    </h3>
                                    <div className="space-y-4">
                                        {Object.entries(metrics.categories).map(([category, score]) => (
                                            <div key={category}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                                        {category}
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {score}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                    <div
                                                        className={classNames(
                                                            'h-2 rounded-full transition-all duration-500',
                                                            score >= 80 ? 'bg-green-500' :
                                                                score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        )}
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Insights Preview */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Key Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {insights.slice(0, 4).map((insight) => {
                                    const Icon = getInsightIcon(insight.type);
                                    return (
                                        <div
                                            key={insight.id}
                                            className={classNames(
                                                'p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md',
                                                getInsightColor(insight.type)
                                            )}
                                            onClick={() => setSelectedInsight(insight)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Icon className="h-6 w-6 flex-shrink-0 mt-1" />
                                                <div className="flex-1">
                                                    <h4 className="font-medium mb-2">{insight.title}</h4>
                                                    <p className="text-sm opacity-80 mb-2">{insight.description}</p>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>{insight.timeframe}</span>
                                                        <span className={getConfidenceColor(insight.confidence)}>
                                                            {insight.confidence}% confidence
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'predictions' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Predictive Analysis
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {insights.filter(i => i.type === 'performance_forecast').map((insight) => {
                                const Icon = getInsightIcon(insight.type);
                                return (
                                    <div key={insight.id} className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {insight.title}
                                            </h4>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{insight.description}</p>

                                        {insight.data.currentValue && insight.data.predictedValue && (
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                        {insight.data.currentValue}%
                                                    </p>
                                                </div>
                                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <p className="text-sm text-blue-600 dark:text-blue-400">Predicted</p>
                                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                        {insight.data.predictedValue}%
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{insight.timeframe}</span>
                                            <span className={classNames('font-medium', getConfidenceColor(insight.confidence))}>
                                                {insight.confidence}% confidence
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewMode === 'patterns' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Learning Patterns
                        </h3>
                        <div className="space-y-4">
                            {patterns.map((pattern) => (
                                <div key={pattern.id} className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {pattern.pattern}
                                        </h4>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Effectiveness</p>
                                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                                {pattern.effectiveness}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Suggestions</h5>
                                            <ul className="space-y-1">
                                                {pattern.suggestions.map((suggestion, index) => (
                                                    <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                        <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Related Concepts</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {pattern.relatedConcepts.map((concept, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full"
                                                    >
                                                        {concept}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                Used in {pattern.frequency}% of sessions
                                            </span>
                                            <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${pattern.frequency}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'recommendations' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            AI Recommendations
                        </h3>
                        <div className="space-y-4">
                            {insights.filter(i => i.type === 'recommendation' || i.type === 'opportunity').map((insight) => {
                                const Icon = getInsightIcon(insight.type);
                                return (
                                    <div
                                        key={insight.id}
                                        className={classNames(
                                            'p-6 rounded-xl border',
                                            getInsightColor(insight.type)
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <Icon className="h-8 w-8 flex-shrink-0 mt-1" />
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="text-lg font-semibold">{insight.title}</h4>
                                                    <span className={classNames(
                                                        'px-2 py-1 text-xs rounded-full font-medium',
                                                        insight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                                            insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                                                    )}>
                                                        {insight.impact} impact
                                                    </span>
                                                </div>
                                                <p className="mb-4">{insight.description}</p>

                                                {insight.data.factors && (
                                                    <div className="mb-4">
                                                        <h5 className="font-medium mb-2">Based on:</h5>
                                                        <ul className="space-y-1">
                                                            {insight.data.factors.map((factor, index) => (
                                                                <li key={index} className="text-sm opacity-80 flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                                                    {factor}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">{insight.timeframe}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className={classNames('text-sm font-medium', getConfidenceColor(insight.confidence))}>
                                                            {insight.confidence}% confidence
                                                        </span>
                                                        {insight.actionable && (
                                                            <button className="px-4 py-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors text-sm font-medium">
                                                                Apply Now
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Insight Detail Modal */}
            {selectedInsight && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const Icon = getInsightIcon(selectedInsight.type);
                                        return <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
                                    })()}
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {selectedInsight.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedInsight(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                                >
                                    ×
                                </button>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {selectedInsight.description}
                            </p>

                            {/* Detailed insight content would go here */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="font-medium text-gray-900 dark:text-white">Confidence Level</span>
                                    <span className={classNames('font-semibold', getConfidenceColor(selectedInsight.confidence))}>
                                        {selectedInsight.confidence}%
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="font-medium text-gray-900 dark:text-white">Timeframe</span>
                                    <span className="text-gray-600 dark:text-gray-300">{selectedInsight.timeframe}</span>
                                </div>

                                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="font-medium text-gray-900 dark:text-white">Impact Level</span>
                                    <span className={classNames(
                                        'px-2 py-1 text-xs rounded-full font-medium capitalize',
                                        selectedInsight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                            selectedInsight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                                    )}>
                                        {selectedInsight.impact}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                {selectedInsight.actionable && (
                                    <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                        Take Action
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedInsight(null)}
                                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}