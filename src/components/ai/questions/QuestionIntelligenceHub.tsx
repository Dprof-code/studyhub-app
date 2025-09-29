/**
 * Question Intelligence Hub Component
 * Phase 5B: Core Features Implementation
 */
'use client';

import { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    SparklesIcon,
    DocumentTextIcon,
    LightBulbIcon,
    ChartBarIcon,
    EyeIcon,
    PencilIcon,
    BookmarkIcon,
    ShareIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ClockIcon,
    TagIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface Question {
    id: string;
    text: string;
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
    estimatedTime: number; // minutes
    concepts: string[];
    questionType: 'mcq' | 'short' | 'long' | 'practical' | 'essay';
    source?: {
        type: 'past_paper' | 'textbook' | 'generated';
        name: string;
        year?: number;
    };
    aiAnalysis: {
        keyTopics: string[];
        solutionApproach: string[];
        commonMistakes: string[];
        studyRecommendations: string[];
        difficultyScore: number; // 0-100
    };
    userProgress?: {
        attempted: boolean;
        solved: boolean;
        timeSpent: number;
        attempts: number;
        lastAttemptDate?: Date;
    };
    solution?: {
        explanation: string;
        steps: string[];
        code?: string;
        additionalNotes?: string;
    };
    tags: string[];
    bookmarked: boolean;
    createdAt: Date;
}

interface QuestionFilters {
    search: string;
    subjects: string[];
    difficulties: string[];
    questionTypes: string[];
    concepts: string[];
    solved: 'all' | 'solved' | 'unsolved' | 'attempted';
    sortBy: 'difficulty' | 'date' | 'relevance' | 'time';
    sortOrder: 'asc' | 'desc';
}

interface QuestionIntelligenceHubProps {
    courseId?: string;
    userId?: string;
    className?: string;
}

const DIFFICULTY_COLORS = {
    easy: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400'
};

const TYPE_ICONS = {
    mcq: '○',
    short: '📝',
    long: '📄',
    practical: '💻',
    essay: '✍️'
};

export default function QuestionIntelligenceHub({
    courseId,
    userId,
    className
}: QuestionIntelligenceHubProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [filters, setFilters] = useState<QuestionFilters>({
        search: '',
        subjects: [],
        difficulties: [],
        questionTypes: [],
        concepts: [],
        solved: 'all',
        sortBy: 'relevance',
        sortOrder: 'desc'
    });
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'analytics'>('list');
    const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

    // Mock data
    const mockQuestions: Question[] = [
        {
            id: 'q1',
            text: 'Explain the concept of dynamic programming and provide an example of how it can be used to solve the fibonacci sequence problem. Discuss the time and space complexity improvements.',
            subject: 'Algorithms',
            topic: 'Dynamic Programming',
            difficulty: 'hard',
            marks: 15,
            estimatedTime: 45,
            concepts: ['Dynamic Programming', 'Recursion', 'Memoization', 'Time Complexity'],
            questionType: 'long',
            source: {
                type: 'past_paper',
                name: 'Final Exam 2023',
                year: 2023
            },
            aiAnalysis: {
                keyTopics: ['DP Fundamentals', 'Fibonacci Optimization', 'Complexity Analysis'],
                solutionApproach: ['Define subproblems', 'Identify recurrence relation', 'Implement bottom-up approach'],
                commonMistakes: ['Not identifying overlapping subproblems', 'Incorrect base cases'],
                studyRecommendations: ['Practice more DP problems', 'Review recursion concepts'],
                difficultyScore: 85
            },
            userProgress: {
                attempted: true,
                solved: false,
                timeSpent: 30,
                attempts: 2,
                lastAttemptDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            tags: ['algorithm', 'optimization', 'recursion'],
            bookmarked: true,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
            id: 'q2',
            text: 'Which of the following data structures provides O(1) average case time complexity for insertion, deletion, and lookup operations?\nA) Array\nB) Linked List\nC) Hash Table\nD) Binary Search Tree',
            subject: 'Data Structures',
            topic: 'Hash Tables',
            difficulty: 'medium',
            marks: 2,
            estimatedTime: 3,
            concepts: ['Hash Tables', 'Time Complexity', 'Data Structures'],
            questionType: 'mcq',
            source: {
                type: 'generated',
                name: 'AI Generated'
            },
            aiAnalysis: {
                keyTopics: ['Hash Table Operations', 'Time Complexity Analysis'],
                solutionApproach: ['Analyze each option', 'Compare time complexities'],
                commonMistakes: ['Confusing average vs worst case', 'Not considering collision handling'],
                studyRecommendations: ['Review hash table implementation', 'Practice complexity analysis'],
                difficultyScore: 60
            },
            userProgress: {
                attempted: true,
                solved: true,
                timeSpent: 2,
                attempts: 1,
                lastAttemptDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            solution: {
                explanation: 'The correct answer is C) Hash Table. Hash tables provide O(1) average time complexity for basic operations due to direct indexing via hash functions.',
                steps: [
                    'Hash tables use hash functions to map keys to array indices',
                    'This allows direct access without searching',
                    'Average case assumes good hash function with minimal collisions'
                ]
            },
            tags: ['data-structure', 'complexity', 'hashing'],
            bookmarked: false,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
            id: 'q3',
            text: 'Implement a function to reverse a linked list iteratively and recursively. Compare the space complexity of both approaches.',
            subject: 'Data Structures',
            topic: 'Linked Lists',
            difficulty: 'medium',
            marks: 10,
            estimatedTime: 25,
            concepts: ['Linked Lists', 'Recursion', 'Iteration', 'Pointers'],
            questionType: 'practical',
            source: {
                type: 'textbook',
                name: 'CLRS Chapter 10'
            },
            aiAnalysis: {
                keyTopics: ['Linked List Manipulation', 'Iterative vs Recursive', 'Space Analysis'],
                solutionApproach: ['Understand pointer manipulation', 'Implement both versions', 'Analyze space usage'],
                commonMistakes: ['Losing references to nodes', 'Infinite loops', 'Incorrect base cases'],
                studyRecommendations: ['Practice pointer manipulation', 'Understand call stack'],
                difficultyScore: 70
            },
            userProgress: {
                attempted: false,
                solved: false,
                timeSpent: 0,
                attempts: 0
            },
            tags: ['linked-list', 'implementation', 'recursion'],
            bookmarked: true,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setQuestions(mockQuestions);
            setFilteredQuestions(mockQuestions);
            setIsLoading(false);
        }, 1000);
    }, [courseId, userId]);

    // Apply filters
    useEffect(() => {
        let filtered = questions.filter(question => {
            // Search filter
            if (filters.search && !question.text.toLowerCase().includes(filters.search.toLowerCase()) &&
                !question.topic.toLowerCase().includes(filters.search.toLowerCase())) {
                return false;
            }

            // Subject filter
            if (filters.subjects.length > 0 && !filters.subjects.includes(question.subject)) {
                return false;
            }

            // Difficulty filter
            if (filters.difficulties.length > 0 && !filters.difficulties.includes(question.difficulty)) {
                return false;
            }

            // Question type filter
            if (filters.questionTypes.length > 0 && !filters.questionTypes.includes(question.questionType)) {
                return false;
            }

            // Solved filter
            if (filters.solved !== 'all') {
                const progress = question.userProgress;
                if (filters.solved === 'solved' && (!progress?.solved)) return false;
                if (filters.solved === 'unsolved' && progress?.solved) return false;
                if (filters.solved === 'attempted' && !progress?.attempted) return false;
            }

            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (filters.sortBy) {
                case 'difficulty':
                    const diffMap = { easy: 1, medium: 2, hard: 3 };
                    comparison = diffMap[a.difficulty] - diffMap[b.difficulty];
                    break;
                case 'date':
                    comparison = a.createdAt.getTime() - b.createdAt.getTime();
                    break;
                case 'time':
                    comparison = a.estimatedTime - b.estimatedTime;
                    break;
                case 'relevance':
                default:
                    comparison = (b.aiAnalysis.difficultyScore || 0) - (a.aiAnalysis.difficultyScore || 0);
            }

            return filters.sortOrder === 'desc' ? -comparison : comparison;
        });

        setFilteredQuestions(filtered);
    }, [questions, filters]);

    const generateAIQuestion = async () => {
        setIsGeneratingQuestion(true);
        try {
            const response = await fetch('/api/ai/generate-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: 'Data Structures',
                    topic: 'Arrays',
                    difficulty: 'medium',
                    questionType: 'practical'
                })
            });

            if (response.ok) {
                const newQuestion = await response.json();
                setQuestions(prev => [newQuestion, ...prev]);
            }
        } catch (error) {
            console.error('Error generating question:', error);
        } finally {
            setIsGeneratingQuestion(false);
        }
    };

    const toggleBookmark = (questionId: string) => {
        setQuestions(prev => prev.map(q =>
            q.id === questionId ? { ...q, bookmarked: !q.bookmarked } : q
        ));
    };

    const getProgressIcon = (question: Question) => {
        const progress = question.userProgress;
        if (!progress?.attempted) return null;
        if (progress.solved) return <div className="w-2 h-2 bg-green-500 rounded-full" />;
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
    };

    const uniqueSubjects = [...new Set(questions.map(q => q.subject))];
    const uniqueConcepts = [...new Set(questions.flatMap(q => q.concepts))];

    return (
        <div className={classNames(
            'flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Question Intelligence Hub
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            AI-powered question analysis and recommendations
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        {(['list', 'grid', 'analytics'] as const).map((mode) => (
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
                        onClick={generateAIQuestion}
                        disabled={isGeneratingQuestion}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {isGeneratingQuestion ? (
                            <>
                                <SparklesIcon className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="h-4 w-4 mr-2" />
                                Generate Question
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 space-y-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search questions, topics, or concepts..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <FunnelIcon className="h-4 w-4 mr-2" />
                        Filters
                    </button>

                    {/* Sort */}
                    <select
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split('-');
                            setFilters(prev => ({
                                ...prev,
                                sortBy: sortBy as QuestionFilters['sortBy'],
                                sortOrder: sortOrder as QuestionFilters['sortOrder']
                            }));
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="relevance-desc">Most Relevant</option>
                        <option value="difficulty-asc">Easiest First</option>
                        <option value="difficulty-desc">Hardest First</option>
                        <option value="date-desc">Newest First</option>
                        <option value="time-asc">Shortest First</option>
                    </select>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Subject
                            </label>
                            <select
                                multiple
                                value={filters.subjects}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    subjects: Array.from(e.target.selectedOptions, option => option.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                size={3}
                            >
                                {uniqueSubjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Difficulty
                            </label>
                            <div className="space-y-2">
                                {['easy', 'medium', 'hard'].map(difficulty => (
                                    <label key={difficulty} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={filters.difficulties.includes(difficulty)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        difficulties: [...prev.difficulties, difficulty]
                                                    }));
                                                } else {
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        difficulties: prev.difficulties.filter(d => d !== difficulty)
                                                    }));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                                            {difficulty}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Question Type
                            </label>
                            <div className="space-y-2">
                                {['mcq', 'short', 'long', 'practical'].map(type => (
                                    <label key={type} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={filters.questionTypes.includes(type)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        questionTypes: [...prev.questionTypes, type]
                                                    }));
                                                } else {
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        questionTypes: prev.questionTypes.filter(t => t !== type)
                                                    }));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                                            {type === 'mcq' ? 'Multiple Choice' : type}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Progress
                            </label>
                            <div className="space-y-2">
                                {[
                                    { value: 'all', label: 'All Questions' },
                                    { value: 'solved', label: 'Solved' },
                                    { value: 'attempted', label: 'Attempted' },
                                    { value: 'unsolved', label: 'Not Attempted' }
                                ].map(option => (
                                    <label key={option.value} className="flex items-center">
                                        <input
                                            type="radio"
                                            name="progress"
                                            value={option.value}
                                            checked={filters.solved === option.value}
                                            onChange={(e) => setFilters(prev => ({
                                                ...prev,
                                                solved: e.target.value as QuestionFilters['solved']
                                            }))}
                                            className="border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Questions List */}
                <div className={classNames(
                    'flex-1 overflow-y-auto p-6 space-y-4',
                    selectedQuestion && 'w-3/5'
                )}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-300">Loading questions...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {filteredQuestions.length} questions found
                                </p>
                            </div>

                            {viewMode === 'list' && (
                                <div className="space-y-4">
                                    {filteredQuestions.map((question) => (
                                        <div
                                            key={question.id}
                                            onClick={() => setSelectedQuestion(question)}
                                            className="cursor-pointer p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    {getProgressIcon(question)}
                                                    <span className="text-2xl">{TYPE_ICONS[question.questionType]}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={classNames(
                                                                'px-2 py-1 text-xs font-medium rounded border',
                                                                DIFFICULTY_COLORS[question.difficulty]
                                                            )}>
                                                                {question.difficulty}
                                                            </span>
                                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                                {question.subject} • {question.topic}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleBookmark(question.id);
                                                        }}
                                                        className={classNames(
                                                            'p-1 rounded transition-colors',
                                                            question.bookmarked
                                                                ? 'text-yellow-500 hover:text-yellow-600'
                                                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                        )}
                                                    >
                                                        <BookmarkIcon className="h-4 w-4" />
                                                    </button>
                                                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                                        <ClockIcon className="h-4 w-4" />
                                                        {question.estimatedTime}m
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-gray-900 dark:text-white mb-3 line-clamp-3">
                                                {question.text}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-wrap gap-1">
                                                    {question.concepts.slice(0, 3).map((concept) => (
                                                        <span
                                                            key={concept}
                                                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                                                        >
                                                            {concept}
                                                        </span>
                                                    ))}
                                                    {question.concepts.length > 3 && (
                                                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                            +{question.concepts.length - 3} more
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span>{question.marks} marks</span>
                                                    {question.source && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{question.source.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'analytics' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-blue-600 dark:text-blue-400">Total Questions</p>
                                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                                        {questions.length}
                                                    </p>
                                                </div>
                                                <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-green-600 dark:text-green-400">Solved</p>
                                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                                        {questions.filter(q => q.userProgress?.solved).length}
                                                    </p>
                                                </div>
                                                <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</p>
                                                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                                        {questions.filter(q => q.userProgress?.attempted && !q.userProgress?.solved).length}
                                                    </p>
                                                </div>
                                                <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* More analytics components would go here */}
                                    <div className="p-8 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                                        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-300">
                                            Detailed analytics charts would be implemented here
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Question Details Panel */}
                {selectedQuestion && (
                    <div className="w-2/5 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* Question Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{TYPE_ICONS[selectedQuestion.questionType]}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={classNames(
                                                'px-2 py-1 text-xs font-medium rounded border',
                                                DIFFICULTY_COLORS[selectedQuestion.difficulty]
                                            )}>
                                                {selectedQuestion.difficulty}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                {selectedQuestion.marks} marks • {selectedQuestion.estimatedTime}min
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                            {selectedQuestion.subject} • {selectedQuestion.topic}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Question Text */}
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {selectedQuestion.text}
                                </p>
                            </div>

                            {/* AI Analysis */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    AI Analysis
                                </h4>

                                <div className="space-y-4">
                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Key Topics</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedQuestion.aiAnalysis.keyTopics.map((topic, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Solution Approach</h5>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedQuestion.aiAnalysis.solutionApproach.map((step, index) => (
                                                <li key={index}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Common Mistakes</h5>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedQuestion.aiAnalysis.commonMistakes.map((mistake, index) => (
                                                <li key={index}>{mistake}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Study Recommendations</h5>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedQuestion.aiAnalysis.studyRecommendations.map((rec, index) => (
                                                <li key={index}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Solution (if available) */}
                            {selectedQuestion.solution && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <LightBulbIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                        Solution
                                    </h4>

                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {selectedQuestion.solution.explanation}
                                        </p>

                                        {selectedQuestion.solution.steps && (
                                            <div>
                                                <h6 className="font-medium text-gray-900 dark:text-white mb-2">Steps:</h6>
                                                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                                    {selectedQuestion.solution.steps.map((step, index) => (
                                                        <li key={index}>{step}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}

                                        {selectedQuestion.solution.code && (
                                            <div>
                                                <h6 className="font-medium text-gray-900 dark:text-white mb-2">Code:</h6>
                                                <pre className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-x-auto">
                                                    <code>{selectedQuestion.solution.code}</code>
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                    Start Solving
                                </button>
                                <button
                                    onClick={() => toggleBookmark(selectedQuestion.id)}
                                    className={classNames(
                                        'px-4 py-2 border rounded-lg transition-colors',
                                        selectedQuestion.bookmarked
                                            ? 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    )}
                                >
                                    <BookmarkIcon className="h-4 w-4" />
                                </button>
                                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <ShareIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}