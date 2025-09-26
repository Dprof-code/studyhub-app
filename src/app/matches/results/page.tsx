'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import MatchCard from '@/components/matching/MatchCard';
import LoadingShimmer from '@/components/matching/LoadingShimmer';
import { MatchResult, MatchesResponse, MatchActionResponse } from '@/types/matching';

export default function MatchResultsPage() {
    const router = useRouter();
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMatches();
    }, []);

    async function fetchMatches() {
        try {
            setLoading(true);
            setError(null); // Clear any previous errors
            const response = await fetch('/api/matches');

            if (!response.ok) {
                if (response.status === 404) {
                    // No active match request
                    router.push('/matches/request');
                    return;
                }
                throw new Error('Failed to fetch matches');
            }

            const data: MatchesResponse = await response.json();
            setMatches(data.matches || []); // Ensure matches is always an array
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load matches';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function handleConnect(matchId: string, message?: string) {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/matches/${matchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'connect',
                    message: message || `Hi! I'd love to study together!`
                }),
            });

            const data: MatchActionResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect');
            }

            if (data.success) {
                if (data.action === 'connected' && data.chatRoom) {
                    // Mutual match! Redirect to chat
                    toast.success(`🎉 It's a match! You can now chat with ${data.match?.user.name}`);
                    router.push(`/chat/${data.chatRoom.id}`);
                } else if (data.action === 'pending') {
                    // Pending match
                    toast.success(`Connect request sent to ${data.match?.user.name}! They'll be notified.`);
                    setIndex(i => i + 1);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
            toast.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleSkip(matchId: string) {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/matches/${matchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'skip'
                }),
            });

            const data: MatchActionResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to skip');
            }

            if (data.success) {
                setIndex(i => i + 1);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to skip';
            toast.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    }

    function handleBackToSearch() {
        router.push('/matches/request');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <LoadingShimmer />
                    <p className="mt-4 text-gray-600">Finding your perfect study matches...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                    <div className="text-red-500 mb-4">
                        <span className="material-symbols-outlined text-6xl">error</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchMatches}
                        className="btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (matches.length === 0 || index >= matches.length) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                    <div className="text-blue-500 mb-4">
                        <span className="material-symbols-outlined text-6xl">search</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        No study buddies found yet
                    </h2>
                    <p className="text-gray-600 mb-6">
                        We&apos;re looking for study partners who match your preferences.
                        Try expanding your availability or creating a new request later when more students are active.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={handleBackToSearch}
                            className="btn-primary w-full"
                        >
                            Modify Search Preferences
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="btn-accent w-full"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentMatch = matches[index];

    return (
        <div className="py-8">
            <div className="max-w-2xl mx-auto px-4">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Your Study Matches</h1>
                    <p className="text-gray-600">
                        {matches.length - index} potential study {matches.length - index === 1 ? 'buddy' : 'buddies'} found
                    </p>
                </div>

                <div className="relative max-w-md mx-auto">
                    <MatchCard
                        id={currentMatch.id}
                        name={currentMatch.user.name}
                        avatar={currentMatch.user.avatar}
                        score={currentMatch.compatibilityScore}
                        sharedCourses={currentMatch.commonSubjects}
                        department={currentMatch.user.department}
                        year={currentMatch.user.year}
                        studyLevel={currentMatch.studyLevel}
                        studyFormat={currentMatch.studyFormat}
                        availability={currentMatch.commonAvailability}
                        additionalNotes={currentMatch.additionalNotes}
                    />

                    <div className="flex justify-between mt-6 gap-4">
                        <button
                            className="btn-accent flex-1"
                            onClick={() => handleSkip(currentMatch.id)}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <LoadingShimmer /> : 'Skip'}
                        </button>
                        <button
                            className="btn-primary flex-1"
                            onClick={() => handleConnect(currentMatch.id)}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <LoadingShimmer /> : 'Connect'}
                        </button>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-6 text-center">
                        <div className="flex justify-center space-x-2">
                            {matches.slice(Math.max(0, index - 2), index + 3).map((_, i) => {
                                const actualIndex = Math.max(0, index - 2) + i;
                                return (
                                    <div
                                        key={actualIndex}
                                        className={`w-2 h-2 rounded-full ${actualIndex === index
                                            ? 'bg-blue-500'
                                            : actualIndex < index
                                                ? 'bg-gray-400'
                                                : 'bg-gray-200'
                                            }`}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {index + 1} of {matches.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}