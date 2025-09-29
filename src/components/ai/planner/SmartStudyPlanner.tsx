/**
 * Smart Study Planner Component
 * Phase 5B: Core Features Implementation
 */
'use client';

import { useState, useEffect } from 'react';
import {
    CalendarDaysIcon,
    ClockIcon,
    AcademicCapIcon,
    ChartBarIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    PlayIcon,
    PauseIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface StudySession {
    id: string;
    title: string;
    subject: string;
    topic: string;
    duration: number; // minutes
    difficulty: 'easy' | 'medium' | 'hard';
    type: 'reading' | 'practice' | 'review' | 'project';
    scheduledDate: Date;
    scheduledTime: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'skipped';
    actualDuration?: number;
    notes?: string;
    resources: {
        id: string;
        title: string;
        type: 'document' | 'video' | 'link';
        url?: string;
    }[];
}

interface StudyPlan {
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    totalHours: number;
    completedHours: number;
    sessions: StudySession[];
    aiGenerated: boolean;
    subjects: string[];
}

interface SmartStudyPlannerProps {
    userId?: string;
    courseId?: string;
    className?: string;
}

const DIFFICULTY_COLORS = {
    easy: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    hard: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
};

const TYPE_ICONS = {
    reading: '📖',
    practice: '💪',
    review: '🔄',
    project: '🏗️'
};

export default function SmartStudyPlanner({
    userId,
    courseId,
    className
}: SmartStudyPlannerProps) {
    const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
    const [activeStudyPlan, setActiveStudyPlan] = useState<StudyPlan | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'kanban'>('calendar');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
    const [sessionTimer, setSessionTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Mock data
    const mockStudyPlan: StudyPlan = {
        id: 'plan-1',
        name: 'Data Structures & Algorithms Mastery',
        description: 'Comprehensive study plan for mastering DSA concepts',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        totalHours: 60,
        completedHours: 18,
        aiGenerated: true,
        subjects: ['Data Structures', 'Algorithms', 'Problem Solving'],
        sessions: [
            {
                id: 'session-1',
                title: 'Arrays and Strings Fundamentals',
                subject: 'Data Structures',
                topic: 'Arrays',
                duration: 90,
                difficulty: 'easy',
                type: 'reading',
                scheduledDate: new Date(),
                scheduledTime: '09:00',
                status: 'completed',
                actualDuration: 95,
                notes: 'Good foundation, need more practice with string manipulation',
                resources: [
                    { id: 'r1', title: 'Array Basics Guide', type: 'document' },
                    { id: 'r2', title: 'String Processing Video', type: 'video' }
                ]
            },
            {
                id: 'session-2',
                title: 'Binary Search Implementation',
                subject: 'Algorithms',
                topic: 'Searching',
                duration: 120,
                difficulty: 'medium',
                type: 'practice',
                scheduledDate: new Date(),
                scheduledTime: '14:00',
                status: 'in-progress',
                resources: [
                    { id: 'r3', title: 'Binary Search Problems', type: 'link', url: '#' }
                ]
            },
            {
                id: 'session-3',
                title: 'Tree Traversal Algorithms',
                subject: 'Data Structures',
                topic: 'Trees',
                duration: 150,
                difficulty: 'hard',
                type: 'practice',
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                scheduledTime: '10:00',
                status: 'scheduled',
                resources: [
                    { id: 'r4', title: 'Tree Algorithms', type: 'document' }
                ]
            }
        ]
    };

    useEffect(() => {
        // Load study plans
        setStudyPlans([mockStudyPlan]);
        setActiveStudyPlan(mockStudyPlan);
    }, [userId, courseId]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && currentSession) {
            interval = setInterval(() => {
                setSessionTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, currentSession]);

    const generateAIStudyPlan = async () => {
        setIsGeneratingPlan(true);
        try {
            // Call AI study plan generation API
            const response = await fetch('/api/ai/study-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    courseId,
                    preferences: {
                        dailyHours: 3,
                        preferredTimes: ['morning', 'afternoon'],
                        difficulty: 'progressive',
                        focus: ['practice', 'review']
                    }
                })
            });

            if (response.ok) {
                const newPlan = await response.json();
                setStudyPlans(prev => [newPlan, ...prev]);
                setActiveStudyPlan(newPlan);
            }
        } catch (error) {
            console.error('Error generating study plan:', error);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const startSession = (session: StudySession) => {
        setCurrentSession(session);
        setSessionTimer(0);
        setIsTimerRunning(true);

        // Update session status
        if (activeStudyPlan) {
            const updatedPlan = {
                ...activeStudyPlan,
                sessions: activeStudyPlan.sessions.map(s =>
                    s.id === session.id ? { ...s, status: 'in-progress' as const } : s
                )
            };
            setActiveStudyPlan(updatedPlan);
        }
    };

    const pauseSession = () => {
        setIsTimerRunning(false);
    };

    const resumeSession = () => {
        setIsTimerRunning(true);
    };

    const completeSession = (notes?: string) => {
        if (!currentSession || !activeStudyPlan) return;

        const actualDuration = Math.floor(sessionTimer / 60); // Convert to minutes
        const updatedPlan = {
            ...activeStudyPlan,
            sessions: activeStudyPlan.sessions.map(s =>
                s.id === currentSession.id
                    ? {
                        ...s,
                        status: 'completed' as const,
                        actualDuration,
                        notes
                    }
                    : s
            ),
            completedHours: activeStudyPlan.completedHours + (actualDuration / 60)
        };

        setActiveStudyPlan(updatedPlan);
        setCurrentSession(null);
        setSessionTimer(0);
        setIsTimerRunning(false);
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getTodaySessions = () => {
        if (!activeStudyPlan) return [];
        const today = new Date().toDateString();
        return activeStudyPlan.sessions.filter(s =>
            s.scheduledDate.toDateString() === today
        );
    };

    const getUpcomingSessions = () => {
        if (!activeStudyPlan) return [];
        const now = new Date();
        return activeStudyPlan.sessions
            .filter(s => s.scheduledDate > now || s.status === 'scheduled')
            .slice(0, 5);
    };

    const progressPercentage = activeStudyPlan
        ? (activeStudyPlan.completedHours / activeStudyPlan.totalHours) * 100
        : 0;

    return (
        <div className={classNames(
            'flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <CalendarDaysIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Smart Study Planner
                        </h2>
                        {activeStudyPlan && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {activeStudyPlan.name}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        {(['calendar', 'timeline', 'kanban'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={classNames(
                                    'px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize',
                                    viewMode === mode
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={generateAIStudyPlan}
                        disabled={isGeneratingPlan}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGeneratingPlan ? (
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <PlusIcon className="h-4 w-4 mr-2" />
                        )}
                        Generate AI Plan
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Left Panel - Plan Overview */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    {/* Progress Overview */}
                    {activeStudyPlan && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Progress Overview
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-600 dark:text-gray-300">Overall Progress</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {Math.round(progressPercentage)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {activeStudyPlan.completedHours.toFixed(1)}h
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            Completed
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {(activeStudyPlan.totalHours - activeStudyPlan.completedHours).toFixed(1)}h
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            Remaining
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Today's Sessions */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Today&apos;s Sessions
                        </h3>
                        <div className="space-y-3">
                            {getTodaySessions().map((session) => (
                                <div
                                    key={session.id}
                                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {TYPE_ICONS[session.type]} {session.title}
                                        </span>
                                        <span className={classNames(
                                            'px-2 py-1 text-xs rounded border font-medium',
                                            DIFFICULTY_COLORS[session.difficulty]
                                        )}>
                                            {session.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                        <span>{session.scheduledTime} • {session.duration}min</span>
                                        <div className="flex gap-1">
                                            {session.status === 'scheduled' && (
                                                <button
                                                    onClick={() => startSession(session)}
                                                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                                                >
                                                    <PlayIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            {session.status === 'completed' && (
                                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Session Timer */}
                    {currentSession && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-blue-900 dark:text-blue-100">
                                    Current Session
                                </span>
                                <div className="flex gap-2">
                                    {isTimerRunning ? (
                                        <button
                                            onClick={pauseSession}
                                            className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                                        >
                                            <PauseIcon className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={resumeSession}
                                            className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                                        >
                                            <PlayIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => completeSession()}
                                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                {currentSession.title}
                            </div>
                            <div className="text-2xl font-mono font-bold text-blue-900 dark:text-blue-100 text-center">
                                {formatTime(sessionTimer)}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300 text-center mt-1">
                                Target: {currentSession.duration} minutes
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Calendar/Timeline View */}
                <div className="flex-1 p-6">
                    {viewMode === 'calendar' && (
                        <div className="h-full">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Study Calendar
                            </h3>
                            {/* Calendar implementation would go here */}
                            <div className="grid grid-cols-7 gap-4 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-300 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <p className="text-center text-gray-600 dark:text-gray-300">
                                    Calendar view implementation
                                </p>
                            </div>
                        </div>
                    )}

                    {viewMode === 'timeline' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Study Timeline
                            </h3>
                            <div className="space-y-4">
                                {getUpcomingSessions().map((session, index) => (
                                    <div key={session.id} className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-16 text-right">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {session.scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                                {session.scheduledTime}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className={classNames(
                                                'w-3 h-3 rounded-full',
                                                session.status === 'completed' ? 'bg-green-500' :
                                                    session.status === 'in-progress' ? 'bg-blue-500' :
                                                        'bg-gray-300 dark:bg-gray-600'
                                            )} />
                                        </div>
                                        <div className="flex-1 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {session.title}
                                                </h4>
                                                <span className={classNames(
                                                    'px-2 py-1 text-xs rounded border font-medium',
                                                    DIFFICULTY_COLORS[session.difficulty]
                                                )}>
                                                    {session.difficulty}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                                <span>{session.subject}</span>
                                                <span>•</span>
                                                <span>{session.duration} minutes</span>
                                                <span>•</span>
                                                <span>{session.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'kanban' && (
                        <div className="h-full">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Session Status Board
                            </h3>
                            <div className="grid grid-cols-4 gap-4 h-full">
                                {['scheduled', 'in-progress', 'completed', 'skipped'].map(status => (
                                    <div key={status} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-4 capitalize">
                                            {status.replace('-', ' ')}
                                        </h4>
                                        <div className="space-y-2">
                                            {activeStudyPlan?.sessions
                                                .filter(s => s.status === status)
                                                .map(session => (
                                                    <div
                                                        key={session.id}
                                                        className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                                                    >
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                                            {session.title}
                                                        </div>
                                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                                            {session.scheduledDate.toLocaleDateString()} • {session.duration}min
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}