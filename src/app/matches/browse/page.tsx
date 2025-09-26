'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import LoadingShimmer from '@/components/matching/LoadingShimmer';

interface AvailableStudent {
    id: string;
    userId: number;
    user: {
        id: number;
        name: string;
        avatar?: string;
        faculty?: string;
        department?: string;
        year?: number;
    };
    subjects: string[];
    availability: string[];
    studyFormat: string;
    maxGroupSize: number;
    studyLevel: string;
    preferredGender: string;
    locationPreference?: string;
    additionalNotes?: string;
    createdAt: string;
}

interface AvailableStudentsResponse {
    availableStudents: AvailableStudent[];
    total: number;
    error?: string;
}

export default function BrowseAvailableStudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<AvailableStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);

    useEffect(() => {
        fetchAvailableStudents();
    }, []);

    const fetchAvailableStudents = async () => {
        try {
            const response = await fetch('/api/matches/available');
            const data: AvailableStudentsResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch available students');
            }

            console.log('Available students data:', data.availableStudents);
            setStudents(data.availableStudents);
        } catch (error) {
            console.error('Error fetching available students:', error);
            toast.error('Failed to load available students');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (studentId: string) => {
        if (connecting) return;

        setConnecting(studentId);

        try {
            const response = await fetch(`/api/matches/${studentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'connect' })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect');
            }

            if (data.action === 'connected') {
                // Mutual match - they can start chatting!
                toast.success(`🎉 Mutual match! You can now chat with ${data.match?.user?.name || 'this student'}`, {
                    duration: 5000,
                    action: {
                        label: 'View Matches',
                        onClick: () => router.push('/matches/my-matches')
                    }
                });
            } else if (data.action === 'pending') {
                // Pending match - waiting for their response
                toast.success(`Connection request sent to ${data.match?.user?.name || 'student'}. They'll be notified!`, {
                    duration: 4000,
                    action: {
                        label: 'View Matches',
                        onClick: () => router.push('/matches/my-matches')
                    }
                });
            } else {
                toast.success('Connection request sent!');
            }

            // Remove the student from the list since we've connected
            setStudents(prev => prev.filter(s => s.id !== studentId));

        } catch (error) {
            console.error('Error connecting:', error);
            toast.error('Failed to send connection request');
        } finally {
            setConnecting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingShimmer />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Browse Available Students
                </h1>
                <p className="text-gray-600">
                    Connect with students who are actively looking for study partners
                </p>
            </div>

            {students.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Available Students
                    </h3>
                    <p className="text-gray-500">
                        No students are currently available for new connections. Check back later!
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => (
                        <div key={student.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors">
                            <div className="flex items-center mb-4">
                                <img
                                    src={student.user?.avatar || '/avatar.jpg'}
                                    alt={student.user?.name || 'Student'}
                                    className="w-12 h-12 rounded-full object-cover mr-3"
                                />
                                <div>
                                    <h3 className="font-semibold text-gray-900">{student.user?.name || 'Anonymous Student'}</h3>
                                    <p className="text-sm text-gray-500">
                                        {student.user?.department && student.user?.faculty && (
                                            `${student.user.department}, ${student.user.faculty}`
                                        )}
                                        {student.user?.year && ` • Year ${student.user.year}`}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Subjects</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {student.subjects.slice(0, 3).map((subject, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                {subject}
                                            </span>
                                        ))}
                                        {student.subjects.length > 3 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                +{student.subjects.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Study Format</h4>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full capitalize">
                                        {student.studyFormat.replace('_', ' ')}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Study Level</h4>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full capitalize">
                                        {student.studyLevel}
                                    </span>
                                </div>

                                {student.additionalNotes && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {student.additionalNotes}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleConnect(student.id)}
                                disabled={connecting === student.id}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {connecting === student.id ? (
                                    <LoadingShimmer />
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Connect
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}