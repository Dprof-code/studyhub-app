'use client';

import { useState } from 'react';

const AVAILABLE_TOPICS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'Engineering', 'Literature', 'History', 'Psychology', 'Economics',
    'Statistics', 'Calculus', 'Linear Algebra', 'Data Structures'
];

interface TopicSelectorProps {
    value: string[];
    onChange: (topics: string[]) => void;
}

export default function TopicSelector({ value, onChange }: TopicSelectorProps) {
    const [customTopic, setCustomTopic] = useState('');

    const toggleTopic = (topic: string) => {
        if (value.includes(topic)) {
            onChange(value.filter(t => t !== topic));
        } else {
            onChange([...value, topic]);
        }
    };

    const addCustomTopic = () => {
        if (customTopic.trim() && !value.includes(customTopic.trim())) {
            onChange([...value, customTopic.trim()]);
            setCustomTopic('');
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
                What subjects do you want to study?
            </h3>
            <p className="text-sm text-gray-600">
                Select all topics you&apos;re interested in studying together.
            </p>

            <div className="flex flex-wrap gap-2">
                {AVAILABLE_TOPICS.map(topic => (
                    <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${value.includes(topic)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Add custom topic..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
                />
                <button
                    onClick={addCustomTopic}
                    className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
                >
                    Add
                </button>
            </div>

            {value.length > 0 && (
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected topics:</p>
                    <div className="flex flex-wrap gap-1">
                        {value.map(topic => (
                            <span
                                key={topic}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                            >
                                {topic}
                                <button
                                    onClick={() => toggleTopic(topic)}
                                    className="ml-1 text-primary/60 hover:text-primary"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}