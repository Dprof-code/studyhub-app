/**
 * AI Processing Status Component
 * Phase 5A: Advanced UI Features - Foundation
 */
'use client';

import { useState, useEffect } from 'react';
import {
    CpuChipIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon,
    PlayIcon,
    PauseIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error' | 'paused';

interface ProcessingStep {
    id: string;
    name: string;
    description: string;
    status: ProcessingStatus;
    progress?: number;
    duration?: string;
    error?: string;
}

interface AIProcessingStatusProps {
    jobId?: string;
    steps: ProcessingStep[];
    overallStatus: ProcessingStatus;
    onRetry?: (stepId?: string) => void;
    onPause?: () => void;
    onResume?: () => void;
    className?: string;
}

const statusConfig = {
    idle: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700'
    },
    processing: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
    },
    completed: {
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
    },
    error: {
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
    },
    paused: {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
    }
};

function StatusIcon({ status }: { status: ProcessingStatus }) {
    switch (status) {
        case 'processing':
            return <ArrowPathIcon className="h-5 w-5 animate-spin" />;
        case 'completed':
            return <CheckCircleIcon className="h-5 w-5" />;
        case 'error':
            return <ExclamationCircleIcon className="h-5 w-5" />;
        case 'paused':
            return <PauseIcon className="h-5 w-5" />;
        default:
            return <ClockIcon className="h-5 w-5" />;
    }
}

function ProgressBar({ progress, status }: { progress?: number; status: ProcessingStatus }) {
    if (!progress && status !== 'processing') return null;

    const displayProgress = progress || 0;

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div
                className={classNames(
                    'h-2 rounded-full transition-all duration-300',
                    status === 'processing' ? 'bg-blue-500' :
                        status === 'completed' ? 'bg-green-500' :
                            status === 'error' ? 'bg-red-500' :
                                'bg-gray-400'
                )}
                style={{ width: `${displayProgress}%` }}
            />
        </div>
    );
}

export function AIProcessingStatus({
    jobId,
    steps,
    overallStatus,
    onRetry,
    onPause,
    onResume,
    className
}: AIProcessingStatusProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    const toggleStep = (stepId: string) => {
        setExpandedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stepId)) {
                newSet.delete(stepId);
            } else {
                newSet.add(stepId);
            }
            return newSet;
        });
    };

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const overallProgress = (completedSteps / steps.length) * 100;

    return (
        <div className={classNames(
            'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={classNames(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        statusConfig[overallStatus].bgColor
                    )}>
                        <CpuChipIcon className={classNames('h-6 w-6', statusConfig[overallStatus].color)} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            AI Processing Pipeline
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span>{completedSteps} of {steps.length} steps completed</span>
                            {jobId && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono text-xs">Job: {jobId}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Control buttons */}
                <div className="flex gap-2">
                    {overallStatus === 'processing' && onPause && (
                        <button
                            onClick={onPause}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                        >
                            <PauseIcon className="h-4 w-4 mr-1" />
                            Pause
                        </button>
                    )}

                    {overallStatus === 'paused' && onResume && (
                        <button
                            onClick={onResume}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Resume
                        </button>
                    )}

                    {overallStatus === 'error' && onRetry && (
                        <button
                            onClick={() => onRetry()}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Retry All
                        </button>
                    )}
                </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <span>Overall Progress</span>
                    <span>{Math.round(overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                        className={classNames(
                            'h-3 rounded-full transition-all duration-500',
                            overallStatus === 'processing' ? 'bg-blue-500' :
                                overallStatus === 'completed' ? 'bg-green-500' :
                                    overallStatus === 'error' ? 'bg-red-500' :
                                        'bg-gray-400'
                        )}
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            {/* Processing Steps */}
            <div className="space-y-3">
                {steps.map((step, index) => {
                    const isExpanded = expandedSteps.has(step.id);
                    const config = statusConfig[step.status];

                    return (
                        <div
                            key={step.id}
                            className={classNames(
                                'border rounded-lg transition-all duration-200',
                                config.borderColor,
                                config.bgColor
                            )}
                        >
                            <div
                                className="p-4 cursor-pointer"
                                onClick={() => toggleStep(step.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={classNames('flex-shrink-0', config.color)}>
                                            <StatusIcon status={step.status} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {index + 1}. {step.name}
                                                </span>
                                                {step.duration && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        ({step.duration})
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {step.progress !== undefined && (
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {step.progress}%
                                            </span>
                                        )}

                                        {step.status === 'error' && onRetry && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRetry(step.id);
                                                }}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar for current step */}
                                <ProgressBar progress={step.progress} status={step.status} />
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="pt-3">
                                        {step.error ? (
                                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                                                <strong>Error:</strong> {step.error}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                {step.status === 'processing' && 'Currently processing...'}
                                                {step.status === 'completed' && 'Successfully completed'}
                                                {step.status === 'idle' && 'Waiting to start'}
                                                {step.status === 'paused' && 'Processing paused'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Real-time Processing Status Hook (mock implementation)
export function useProcessingStatus(jobId?: string) {
    const [status, setStatus] = useState<ProcessingStatus>('idle');
    const [steps, setSteps] = useState<ProcessingStep[]>([]);

    useEffect(() => {
        if (!jobId) return;

        // Mock real-time updates
        const mockSteps: ProcessingStep[] = [
            {
                id: 'upload',
                name: 'File Upload',
                description: 'Uploading and validating documents',
                status: 'completed',
                progress: 100,
                duration: '2s'
            },
            {
                id: 'extraction',
                name: 'Content Extraction',
                description: 'Extracting text and analyzing structure',
                status: 'processing',
                progress: 65,
            },
            {
                id: 'ai-analysis',
                name: 'AI Analysis',
                description: 'Running AI models for concept extraction',
                status: 'idle',
            },
            {
                id: 'indexing',
                name: 'Knowledge Indexing',
                description: 'Creating searchable knowledge base',
                status: 'idle',
            }
        ];

        setSteps(mockSteps);
        setStatus('processing');

        // Simulate progress updates
        const interval = setInterval(() => {
            setSteps(current => {
                const updated = [...current];
                const processingStep = updated.find(s => s.status === 'processing');

                if (processingStep && processingStep.progress !== undefined) {
                    processingStep.progress = Math.min(100, processingStep.progress + Math.random() * 10);

                    if (processingStep.progress >= 100) {
                        processingStep.status = 'completed';
                        processingStep.duration = `${Math.floor(Math.random() * 10) + 3}s`;

                        // Start next step
                        const nextStepIndex = updated.findIndex(s => s.status === 'idle');
                        if (nextStepIndex !== -1) {
                            updated[nextStepIndex].status = 'processing';
                            updated[nextStepIndex].progress = 0;
                        } else {
                            setStatus('completed');
                        }
                    }
                }

                return updated;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId]);

    const retry = (stepId?: string) => {
        if (stepId) {
            setSteps(current =>
                current.map(step =>
                    step.id === stepId
                        ? { ...step, status: 'processing' as ProcessingStatus, progress: 0, error: undefined }
                        : step
                )
            );
        } else {
            setSteps(current =>
                current.map(step => ({
                    ...step,
                    status: step.status === 'completed' ? 'completed' : 'idle' as ProcessingStatus,
                    progress: step.status === 'completed' ? 100 : 0,
                    error: undefined
                }))
            );
            setStatus('processing');
        }
    };

    const pause = () => setStatus('paused');
    const resume = () => setStatus('processing');

    return {
        status,
        steps,
        retry,
        pause,
        resume
    };
}