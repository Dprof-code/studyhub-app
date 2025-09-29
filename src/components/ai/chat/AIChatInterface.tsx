/**
 * AI Chat Interface Component
 * Phase 5B: Core Features Implementation
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    PaperAirplaneIcon,
    SparklesIcon,
    DocumentTextIcon,
    AcademicCapIcon,
    LightBulbIcon,
    ClipboardDocumentIcon,
    MicrophoneIcon,
    StopIcon
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    attachments?: {
        type: 'document' | 'question' | 'concept';
        id: string;
        name: string;
    }[];
    suggestions?: string[];
}

interface AIChatInterfaceProps {
    contextType?: 'general' | 'course' | 'question' | 'concept';
    contextId?: string;
    contextName?: string;
    className?: string;
}

const QUICK_ACTIONS = [
    {
        icon: DocumentTextIcon,
        label: 'Analyze Document',
        description: 'Upload a document for AI analysis',
        action: 'analyze_document'
    },
    {
        icon: AcademicCapIcon,
        label: 'Create Study Plan',
        description: 'Generate a personalized study plan',
        action: 'create_study_plan'
    },
    {
        icon: LightBulbIcon,
        label: 'Explain Concept',
        description: 'Get detailed concept explanations',
        action: 'explain_concept'
    },
    {
        icon: ClipboardDocumentIcon,
        label: 'Generate Questions',
        description: 'Create practice questions',
        action: 'generate_questions'
    }
];

const SAMPLE_SUGGESTIONS = [
    "Explain the concept of object-oriented programming",
    "Create a study plan for data structures",
    "What are the key differences between arrays and linked lists?",
    "Generate practice questions for algorithms"
];

export default function AIChatInterface({
    contextType = 'general',
    contextId,
    contextName,
    className
}: AIChatInterfaceProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                content: contextType === 'general'
                    ? "Hello! I'm your AI learning assistant. I can help you analyze documents, create study plans, explain concepts, and much more. How can I assist you today?"
                    : `Hello! I'm here to help you with ${contextName}. What would you like to explore?`,
                timestamp: new Date(),
                suggestions: SAMPLE_SUGGESTIONS
            };
            setMessages([welcomeMessage]);
        }
    }, [contextType, contextName, messages.length]);

    const handleSend = async (message?: string) => {
        const messageText = message || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Send to AI chat API
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    contextType,
                    contextId,
                    conversationHistory: messages.slice(-10) // Last 10 messages for context
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: data.id || (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date(),
                suggestions: data.suggestions,
                attachments: data.attachments
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (action: string) => {
        const actionMessages = {
            analyze_document: "I'd like to analyze a document. Can you help me with that?",
            create_study_plan: "Can you create a personalized study plan for me?",
            explain_concept: "I need help understanding a concept. Can you explain it?",
            generate_questions: "Can you generate some practice questions for me?"
        };

        handleSend(actionMessages[action as keyof typeof actionMessages]);
    };

    const handleSuggestionClick = (suggestion: string) => {
        handleSend(suggestion);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const startVoiceRecognition = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.start();
    };

    return (
        <div className={classNames(
            'flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
            className
        )}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            AI Learning Assistant
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {contextName ? `Helping with ${contextName}` : 'Ready to help you learn'}
                        </p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Online
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={classNames(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        <div
                            className={classNames(
                                'max-w-[80%] rounded-lg px-4 py-2',
                                message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>

                            {/* Attachments */}
                            {message.attachments && (
                                <div className="mt-2 space-y-2">
                                    {message.attachments.map((attachment, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-white/10 rounded">
                                            <DocumentTextIcon className="h-4 w-4" />
                                            <span className="text-sm">{attachment.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Suggestions */}
                            {message.suggestions && message.role === 'assistant' && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm opacity-80">Suggested questions:</p>
                                    {message.suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="block w-full text-left p-2 text-sm bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="text-xs opacity-60 mt-1">
                                {message.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-gray-600 dark:text-gray-300">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Quick actions:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuickAction(action.action)}
                                className="flex items-center gap-2 p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <action.icon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                                        {action.label}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        {action.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about your studies..."
                            rows={1}
                            className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            style={{
                                minHeight: '42px',
                                maxHeight: '120px',
                                overflowY: input.split('\n').length > 3 ? 'scroll' : 'hidden'
                            }}
                        />
                    </div>

                    {/* Voice Recognition */}
                    <button
                        onClick={startVoiceRecognition}
                        disabled={isListening}
                        className={classNames(
                            'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                            isListening
                                ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        )}
                    >
                        {isListening ? (
                            <StopIcon className="h-5 w-5" />
                        ) : (
                            <MicrophoneIcon className="h-5 w-5" />
                        )}
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}