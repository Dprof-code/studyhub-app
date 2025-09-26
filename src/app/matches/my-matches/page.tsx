'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import LoadingShimmer from '@/components/matching/LoadingShimmer';

interface User {
    id: number;
    name: string;
    avatar?: string;
    department?: string;
    faculty?: string;
    year?: number;
}

interface ChatRoom {
    id: string;
    name: string;
    lastMessageAt: string | null;
    messageCount: number;
}

interface PendingMatch {
    id: string;
    type: 'pending_incoming';
    user: User;
    message?: string;
    createdAt: string;
}

interface ConnectedMatch {
    id: string;
    type: 'connected';
    user: User;
    chatRoom: ChatRoom | null;
    connectedAt: string;
    createdAt: string;
}

interface MyMatchesResponse {
    success: boolean;
    data: {
        incomingRequests: PendingMatch[];
        connectedMatches: ConnectedMatch[];
        summary: {
            pendingCount: number;
            connectedCount: number;
            totalMatches: number;
        };
    };
    error?: string;
}

export default function MyMatchesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<{
        incomingRequests: PendingMatch[];
        connectedMatches: ConnectedMatch[];
        summary: { pendingCount: number; connectedCount: number; totalMatches: number };
    }>({
        incomingRequests: [],
        connectedMatches: [],
        summary: { pendingCount: 0, connectedCount: 0, totalMatches: 0 }
    });
    const [activeTab, setActiveTab] = useState<'pending' | 'connected'>('pending');
    const [responding, setResponding] = useState<string | null>(null);

    useEffect(() => {
        fetchMyMatches();
    }, []);

    const fetchMyMatches = async () => {
        try {
            const response = await fetch('/api/matches/my-matches');
            const data: MyMatchesResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch matches');
            }

            setMatches(data.data);
        } catch (error) {
            console.error('Error fetching matches:', error);
            toast.error('Failed to load matches');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptMatch = async (matchId: string) => {
        if (responding) return;
        setResponding(matchId);

        try {
            const response = await fetch(`/api/matches/${matchId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept match');
            }

            toast.success(`🎉 Match accepted! You can now chat with ${data.match?.user?.name || 'this student'}`);

            // Refresh the matches list
            fetchMyMatches();

        } catch (error) {
            console.error('Error accepting match:', error);
            toast.error('Failed to accept match');
        } finally {
            setResponding(null);
        }
    };

    const handleRejectMatch = async (matchId: string) => {
        if (responding) return;
        setResponding(matchId);

        try {
            const response = await fetch(`/api/matches/${matchId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to reject match');
            }

            toast.success('Match request declined');

            // Refresh the matches list
            fetchMyMatches();

        } catch (error) {
            console.error('Error rejecting match:', error);
            toast.error('Failed to reject match');
        } finally {
            setResponding(null);
        }
    };

    const handleOpenChat = (chatRoomId: string) => {
        router.push(`/chat/${chatRoomId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingShimmer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Matches</h1>
                    <p className="text-gray-600">
                        Manage your study partner connections and chat with matched students
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                        <div className="flex items-center">
                            <span className="material-symbols-outlined text-orange-500 text-2xl mr-3">
                                pending
                            </span>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {matches.summary.pendingCount}
                                </p>
                                <p className="text-gray-600 text-sm">Pending Requests</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                        <div className="flex items-center">
                            <span className="material-symbols-outlined text-green-500 text-2xl mr-3">
                                groups
                            </span>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {matches.summary.connectedCount}
                                </p>
                                <p className="text-gray-600 text-sm">Connected</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                        <div className="flex items-center">
                            <span className="material-symbols-outlined text-blue-500 text-2xl mr-3">
                                diversity_3
                            </span>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {matches.summary.totalMatches}
                                </p>
                                <p className="text-gray-600 text-sm">Total Matches</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Pending Requests ({matches.summary.pendingCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('connected')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'connected'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Connected ({matches.summary.connectedCount})
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Pending Requests Tab */}
                {activeTab === 'pending' && (
                    <div className="space-y-6">
                        {matches.incomingRequests.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                                    inbox
                                </span>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No pending requests
                                </h3>
                                <p className="text-gray-600">
                                    When other students want to connect with you, you&apos;ll see their requests here.
                                </p>
                            </div>
                        ) : (
                            matches.incomingRequests.map((match) => (
                                <div key={match.id} className="bg-white rounded-lg shadow-sm border p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <img
                                                src={match.user.avatar || '/avatar.jpg'}
                                                alt={match.user.name}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {match.user.name}
                                                </h3>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    {match.user.department && (
                                                        <span>{match.user.department}</span>
                                                    )}
                                                    {match.user.year && (
                                                        <span className="ml-2">Year {match.user.year}</span>
                                                    )}
                                                </div>

                                                {match.message && (
                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                            Message
                                                        </h4>
                                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                                            {match.message}
                                                        </p>
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-500">
                                                    Requested {new Date(match.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleAcceptMatch(match.id)}
                                                disabled={responding === match.id}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                                            >
                                                {responding === match.id ? (
                                                    <LoadingShimmer />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-sm mr-1">check</span>
                                                        Accept
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleRejectMatch(match.id)}
                                                disabled={responding === match.id}
                                                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                                            >
                                                <span className="material-symbols-outlined text-sm mr-1">close</span>
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Connected Matches Tab */}
                {activeTab === 'connected' && (
                    <div className="space-y-6">
                        {matches.connectedMatches.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                                    groups
                                </span>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No connected matches yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    When you and another student mutually connect, you&apos;ll see them here and can start chatting.
                                </p>
                                <button
                                    onClick={() => router.push('/matches/browse')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                                >
                                    Browse Available Students
                                </button>
                            </div>
                        ) : (
                            matches.connectedMatches.map((match) => (
                                <div key={match.id} className="bg-white rounded-lg shadow-sm border p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <img
                                                src={match.user.avatar || '/avatar.jpg'}
                                                alt={match.user.name}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {match.user.name}
                                                </h3>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    {match.user.department && (
                                                        <span>{match.user.department}</span>
                                                    )}
                                                    {match.user.year && (
                                                        <span className="ml-2">Year {match.user.year}</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <span className="flex items-center">
                                                        <span className="material-symbols-outlined text-sm mr-1 text-green-500">
                                                            check_circle
                                                        </span>
                                                        Connected {new Date(match.connectedAt).toLocaleDateString()}
                                                    </span>

                                                    {match.chatRoom && (
                                                        <span className="flex items-center">
                                                            <span className="material-symbols-outlined text-sm mr-1 text-blue-500">
                                                                chat
                                                            </span>
                                                            {match.chatRoom.messageCount} messages
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {match.chatRoom && (
                                            <button
                                                onClick={() => handleOpenChat(match.chatRoom!.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                                            >
                                                <span className="material-symbols-outlined text-sm mr-2">chat</span>
                                                Open Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}