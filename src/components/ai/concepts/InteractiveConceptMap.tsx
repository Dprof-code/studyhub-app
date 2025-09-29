/**
 * Interactive Concept Maps Component
 * Phase 5B: Core Features Implementation
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    ArrowsPointingOutIcon,
    BookmarkIcon,
    ShareIcon,
    PlusIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface ConceptNode {
    id: string;
    name: string;
    description?: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    masteryLevel: number; // 0-100
    x?: number;
    y?: number;
    connections: string[]; // IDs of connected concepts
    resources: {
        id: string;
        title: string;
        type: 'document' | 'video' | 'article';
    }[];
}

interface ConceptMapProps {
    courseId?: string;
    conceptIds?: string[];
    mode?: 'view' | 'edit' | 'study';
    className?: string;
}

const DIFFICULTY_COLORS = {
    beginner: 'border-green-400 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    intermediate: 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    advanced: 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
};

const CATEGORY_COLORS = {
    'Programming': 'bg-blue-500',
    'Mathematics': 'bg-purple-500',
    'Data Structures': 'bg-green-500',
    'Algorithms': 'bg-orange-500',
    'Database': 'bg-teal-500',
    'Web Development': 'bg-pink-500',
    'Machine Learning': 'bg-indigo-500',
    'default': 'bg-gray-500'
};

export default function InteractiveConceptMap({
    courseId,
    conceptIds,
    mode = 'view',
    className
}: ConceptMapProps) {
    const [concepts, setConcepts] = useState<ConceptNode[]>([]);
    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'network' | 'hierarchy' | 'timeline'>('network');
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Mock data - replace with actual API call
    const mockConcepts: ConceptNode[] = [
        {
            id: '1',
            name: 'Object-Oriented Programming',
            description: 'A programming paradigm based on objects and classes',
            category: 'Programming',
            difficulty: 'intermediate',
            masteryLevel: 75,
            x: 400,
            y: 200,
            connections: ['2', '3', '4'],
            resources: [
                { id: 'r1', title: 'OOP Fundamentals', type: 'document' },
                { id: 'r2', title: 'OOP in Practice', type: 'video' }
            ]
        },
        {
            id: '2',
            name: 'Classes and Objects',
            description: 'Basic building blocks of OOP',
            category: 'Programming',
            difficulty: 'beginner',
            masteryLevel: 90,
            x: 200,
            y: 100,
            connections: ['1', '5'],
            resources: [
                { id: 'r3', title: 'Understanding Classes', type: 'article' }
            ]
        },
        {
            id: '3',
            name: 'Inheritance',
            description: 'Mechanism for creating new classes based on existing ones',
            category: 'Programming',
            difficulty: 'intermediate',
            masteryLevel: 60,
            x: 600,
            y: 100,
            connections: ['1', '6'],
            resources: [
                { id: 'r4', title: 'Inheritance Patterns', type: 'document' }
            ]
        },
        {
            id: '4',
            name: 'Polymorphism',
            description: 'Ability of objects to take multiple forms',
            category: 'Programming',
            difficulty: 'advanced',
            masteryLevel: 40,
            x: 500,
            y: 350,
            connections: ['1'],
            resources: [
                { id: 'r5', title: 'Polymorphism Examples', type: 'video' }
            ]
        },
        {
            id: '5',
            name: 'Encapsulation',
            description: 'Bundling data and methods together',
            category: 'Programming',
            difficulty: 'beginner',
            masteryLevel: 80,
            x: 100,
            y: 250,
            connections: ['2'],
            resources: []
        },
        {
            id: '6',
            name: 'Abstract Classes',
            description: 'Classes that cannot be instantiated',
            category: 'Programming',
            difficulty: 'advanced',
            masteryLevel: 30,
            x: 700,
            y: 250,
            connections: ['3'],
            resources: [
                { id: 'r6', title: 'Abstract Class Guide', type: 'article' }
            ]
        }
    ];

    useEffect(() => {
        // Load concepts
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setConcepts(mockConcepts);
            setIsLoading(false);
        }, 1000);
    }, [courseId, conceptIds]);

    const filteredConcepts = concepts.filter(concept => {
        const matchesSearch = concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            concept.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDifficulty = filterDifficulty === 'all' || concept.difficulty === filterDifficulty;
        const matchesCategory = filterCategory === 'all' || concept.category === filterCategory;

        return matchesSearch && matchesDifficulty && matchesCategory;
    });

    const getConnectionPath = (from: ConceptNode, to: ConceptNode) => {
        const dx = (to.x || 0) - (from.x || 0);
        const dy = (to.y || 0) - (from.y || 0);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Create a curved path
        const midX = (from.x || 0) + dx * 0.5;
        const midY = (from.y || 0) + dy * 0.5;
        const offset = distance * 0.2;

        const controlX = midX + (dy / distance) * offset;
        const controlY = midY - (dx / distance) * offset;

        return `M ${from.x || 0} ${from.y || 0} Q ${controlX} ${controlY} ${to.x || 0} ${to.y || 0}`;
    };

    const handleConceptClick = (conceptId: string) => {
        setSelectedConcept(selectedConcept === conceptId ? null : conceptId);
    };

    const handleZoom = (direction: 'in' | 'out') => {
        setZoomLevel(prev => {
            const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
            return Math.max(0.5, Math.min(3, newZoom));
        });
    };

    const getMasteryColor = (level: number) => {
        if (level >= 80) return 'text-green-600 dark:text-green-400';
        if (level >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const uniqueCategories = [...new Set(concepts.map(c => c.category))];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading concept map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={classNames(
            'flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Concept Map
                    </h3>

                    {/* View Mode Selector */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        {(['network', 'hierarchy', 'timeline'] as const).map((mode) => (
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
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleZoom('out')}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        -
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={() => handleZoom('in')}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        +
                    </button>

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <ArrowsPointingOutIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <BookmarkIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <ShareIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {/* Search */}
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search concepts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Difficulty Filter */}
                <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>

                {/* Category Filter */}
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Concept Map */}
                <div className="flex-1 relative overflow-hidden">
                    <svg
                        ref={svgRef}
                        className="w-full h-full"
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                    >
                        {/* Connections */}
                        <g className="connections">
                            {filteredConcepts.map(concept =>
                                concept.connections.map(connectionId => {
                                    const targetConcept = concepts.find(c => c.id === connectionId);
                                    if (!targetConcept || !filteredConcepts.find(c => c.id === connectionId)) return null;

                                    return (
                                        <path
                                            key={`${concept.id}-${connectionId}`}
                                            d={getConnectionPath(concept, targetConcept)}
                                            stroke="rgba(156, 163, 175, 0.5)"
                                            strokeWidth="2"
                                            fill="none"
                                            className="transition-all duration-200 hover:stroke-blue-500"
                                        />
                                    );
                                })
                            )}
                        </g>

                        {/* Concept Nodes */}
                        <g className="nodes">
                            {filteredConcepts.map(concept => (
                                <g key={concept.id} transform={`translate(${concept.x || 0}, ${concept.y || 0})`}>
                                    {/* Node Background */}
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="30"
                                        className={classNames(
                                            'cursor-pointer transition-all duration-200',
                                            selectedConcept === concept.id
                                                ? 'fill-blue-500 stroke-blue-600 stroke-2'
                                                : 'fill-white dark:fill-gray-700 stroke-gray-300 dark:stroke-gray-600 hover:fill-gray-50 dark:hover:fill-gray-600'
                                        )}
                                        onClick={() => handleConceptClick(concept.id)}
                                    />

                                    {/* Category Indicator */}
                                    <circle
                                        cx="0"
                                        cy="-20"
                                        r="4"
                                        className={CATEGORY_COLORS[concept.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default}
                                    />

                                    {/* Mastery Level Arc */}
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="35"
                                        fill="none"
                                        stroke="rgba(156, 163, 175, 0.3)"
                                        strokeWidth="3"
                                    />
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="35"
                                        fill="none"
                                        stroke={concept.masteryLevel >= 80 ? '#10b981' : concept.masteryLevel >= 60 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="3"
                                        strokeDasharray={`${(concept.masteryLevel / 100) * 220} 220`}
                                        strokeLinecap="round"
                                        transform="rotate(-90)"
                                        className="transition-all duration-300"
                                    />

                                    {/* Node Label */}
                                    <text
                                        x="0"
                                        y="50"
                                        textAnchor="middle"
                                        className="text-xs font-medium fill-gray-900 dark:fill-white"
                                        style={{ maxWidth: '80px' }}
                                    >
                                        {concept.name.length > 15 ? `${concept.name.slice(0, 15)}...` : concept.name}
                                    </text>
                                </g>
                            ))}
                        </g>
                    </svg>

                    {/* Floating Add Button (Edit Mode) */}
                    {mode === 'edit' && (
                        <button className="absolute bottom-4 right-4 h-12 w-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                            <PlusIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>

                {/* Concept Details Panel */}
                {selectedConcept && (
                    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
                        {(() => {
                            const concept = concepts.find(c => c.id === selectedConcept);
                            if (!concept) return null;

                            return (
                                <div className="space-y-4">
                                    {/* Concept Header */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {concept.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={classNames(
                                                'px-2 py-1 text-xs font-medium rounded border',
                                                DIFFICULTY_COLORS[concept.difficulty]
                                            )}>
                                                {concept.difficulty}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                {concept.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {concept.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {concept.description}
                                        </p>
                                    )}

                                    {/* Mastery Level */}
                                    <div>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-gray-600 dark:text-gray-300">Mastery Level</span>
                                            <span className={classNames('font-medium', getMasteryColor(concept.masteryLevel))}>
                                                {concept.masteryLevel}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                            <div
                                                className={classNames(
                                                    'h-2 rounded-full transition-all duration-300',
                                                    concept.masteryLevel >= 80 ? 'bg-green-500' :
                                                        concept.masteryLevel >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                )}
                                                style={{ width: `${concept.masteryLevel}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Resources */}
                                    {concept.resources.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                Related Resources
                                            </h5>
                                            <div className="space-y-2">
                                                {concept.resources.map(resource => (
                                                    <div key={resource.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                        <span className="text-sm text-gray-900 dark:text-white flex-1">
                                                            {resource.title}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {resource.type}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                            Study Now
                                        </button>
                                        <button className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                            <LinkIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}