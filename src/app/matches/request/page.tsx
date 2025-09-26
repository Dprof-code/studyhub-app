'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import StepperHeader from '@/components/matching/StepperHeader';
import TopicSelector from '@/components/matching/TopicSelector';
import AvailabilityPicker from '@/components/matching/AvailabilityPicker';
import LoadingShimmer from '@/components/matching/LoadingShimmer';
import { MatchRequestData, MatchRequestResponse } from '@/types/matching';

const STEPS = ['Topic', 'Availability', 'Preferences'];

interface ExistingMatchRequest {
    id: string;
    subjects: string[];
    availability: string[];
    studyFormat: string;
    studyLevel: string;
    maxGroupSize: number;
    preferredGender: string;
    locationPreference?: string;
    additionalNotes?: string;
    stayAvailable: boolean;
    status: string;
    createdAt: string;
}

export default function FindStudyBuddyPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<MatchRequestData>({
        subjects: [],
        availability: [],
        studyFormat: 'hybrid',
        studyLevel: 'intermediate',
        maxGroupSize: 4,
        preferredGender: 'any',
        locationPreference: '',
        additionalNotes: '',
        stayAvailable: true // New field for staying available for matching
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingRequests, setExistingRequests] = useState<ExistingMatchRequest[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // For backward compatibility with the current UI
    const existingRequest = existingRequests.length > 0 ? existingRequests[0] : null;

    useEffect(() => {
        checkExistingRequests();
    }, []);

    async function checkExistingRequests() {
        try {
            const response = await fetch('/api/matches/request');
            const data = await response.json();

            if (response.ok && data.matchRequests) {
                setExistingRequests(data.matchRequests);
                // Show create form if no existing requests or user explicitly wants to create another
                setShowCreateForm(data.matchRequests.length === 0);
            }
        } catch (error) {
            console.error('Error checking existing requests:', error);
            setShowCreateForm(true); // Show form if there's an error
        }
    }

    async function handleCancelRequest(requestId: string) {
        try {
            setLoading(true);
            const response = await fetch(`/api/matches/${requestId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setExistingRequests(prev => prev.filter(req => req.id !== requestId));
                toast.success('Match request cancelled');
            } else {
                toast.error('Failed to cancel request');
            }
        } catch (error) {
            console.error('Error cancelling request:', error);
            toast.error('Failed to cancel request');
        } finally {
            setLoading(false);
        }
    }

    // For backward compatibility with current UI
    async function handleCancelExistingRequest() {
        if (existingRequest) {
            await handleCancelRequest(existingRequest.id);
        }
    } function next() {
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        setError(null);
    }

    function prev() {
        setStep((s) => Math.max(s - 1, 0));
        setError(null);
    }

    async function handleSubmit() {
        // Validate form data
        if (form.subjects.length === 0) {
            setError('Please select at least one subject');
            setStep(0);
            return;
        }

        if (form.availability.length === 0) {
            setError('Please select at least one availability slot');
            setStep(1);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/matches/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            const data: MatchRequestResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create match request');
            }

            if (data.success) {
                toast.success('Match request created! Finding your study buddies...');
                // Redirect to results page
                router.push('/matches/results');
            } else {
                throw new Error('Failed to create match request');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const canProceed = () => {
        switch (step) {
            case 0:
                return form.subjects.length > 0;
            case 1:
                return form.availability.length > 0;
            case 2:
                return true;
            default:
                return false;
        }
    };

    return (
        <div className="py-8">
            <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Find Study Buddies</h1>
                    <p className="text-gray-600 mt-2">Let&apos;s find you the perfect study partners!</p>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                            <strong>New:</strong> You can now create multiple match requests for different subjects, study formats, or time preferences!
                        </p>
                    </div>
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">
                            <strong>Tip:</strong> Create separate requests for different contexts - like one for &quot;Calculus (in-person, beginner)&quot; and another for &quot;Physics (online, advanced)&quot;.
                        </p>
                    </div>
                </div>

                {(existingRequest && !showCreateForm) ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Active Match Request</h2>
                            <p className="text-gray-600">You have an active match request. You can manage it here or create additional ones.</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">Subjects</h3>
                                <div className="flex flex-wrap gap-2">
                                    {existingRequest.subjects.map((subject, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                            {subject}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">Study Format & Level</h3>
                                <div className="flex gap-3">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full capitalize">
                                        {existingRequest.studyFormat.replace('_', ' ')}
                                    </span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full capitalize">
                                        {existingRequest.studyLevel}
                                    </span>
                                </div>
                            </div>

                            {existingRequest.additionalNotes && (
                                <div>
                                    <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
                                    <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                        {existingRequest.additionalNotes}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <span className="text-sm text-gray-500">
                                    Created: {new Date(existingRequest.createdAt).toLocaleDateString()}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${existingRequest.stayAvailable
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {existingRequest.stayAvailable ? 'Available for matching' : 'Not available'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push('/matches/results')}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                View Matches
                            </button>
                            <button
                                onClick={handleCancelExistingRequest}
                                disabled={loading}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                {loading ? <LoadingShimmer /> : 'Cancel Request'}
                            </button>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-3"
                            >
                                Create Another Match Request
                            </button>
                            <p className="text-sm text-gray-500">
                                Create requests for different subjects, study formats, or time preferences. You can also cancel this request above.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {existingRequest && showCreateForm && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-blue-900">Creating Additional Request</h3>
                                        <p className="text-sm text-blue-700">You already have an active request for: {existingRequest.subjects.join(', ')}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                        View existing request
                                    </button>
                                </div>
                            </div>
                        )}

                        <StepperHeader steps={STEPS} current={step} />

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="mt-6">
                            {step === 0 && (
                                <TopicSelector
                                    value={form.subjects}
                                    onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
                                />
                            )}
                            {step === 1 && (
                                <AvailabilityPicker
                                    value={form.availability}
                                    onChange={(availability) => setForm((f) => ({ ...f, availability }))}
                                />
                            )}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Study Format
                                        </label>
                                        <select
                                            value={form.studyFormat}
                                            onChange={(e) => setForm(f => ({ ...f, studyFormat: e.target.value as any }))}
                                            className="form-input w-full"
                                        >
                                            <option value="online">Online</option>
                                            <option value="in_person">In Person</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Study Level
                                        </label>
                                        <select
                                            value={form.studyLevel}
                                            onChange={(e) => setForm(f => ({ ...f, studyLevel: e.target.value as any }))}
                                            className="form-input w-full"
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Max Group Size
                                        </label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="10"
                                            value={form.maxGroupSize}
                                            onChange={(e) => setForm(f => ({ ...f, maxGroupSize: parseInt(e.target.value) }))}
                                            className="form-input w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Gender Preference
                                        </label>
                                        <select
                                            value={form.preferredGender}
                                            onChange={(e) => setForm(f => ({ ...f, preferredGender: e.target.value as any }))}
                                            className="form-input w-full"
                                        >
                                            <option value="any">Any</option>
                                            <option value="same">Same Gender</option>
                                            <option value="opposite">Opposite Gender</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Location Preference (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Library, Campus Center, Online"
                                            value={form.locationPreference || ''}
                                            onChange={(e) => setForm(f => ({ ...f, locationPreference: e.target.value }))}
                                            className="form-input w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Additional Notes (Optional)
                                        </label>
                                        <textarea
                                            placeholder="Tell potential study buddies about your study style, goals, or anything else..."
                                            value={form.additionalNotes || ''}
                                            onChange={(e) => setForm(f => ({ ...f, additionalNotes: e.target.value }))}
                                            className="form-input w-full h-20 resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id="stayAvailable"
                                            checked={form.stayAvailable}
                                            onChange={(e) => setForm(f => ({ ...f, stayAvailable: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div>
                                            <label htmlFor="stayAvailable" className="text-sm font-medium text-gray-900 cursor-pointer">
                                                Stay Available for Matching
                                            </label>
                                            <p className="text-xs text-gray-600">
                                                Keep your request active to receive additional match requests from other students
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-8">
                            <button
                                className="btn-accent"
                                onClick={prev}
                                disabled={step === 0 || loading}
                            >
                                Back
                            </button>
                            {step < STEPS.length - 1 ? (
                                <button
                                    className="btn-primary"
                                    onClick={next}
                                    disabled={loading || !canProceed()}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={handleSubmit}
                                    disabled={loading || !canProceed()}
                                >
                                    {loading ? <LoadingShimmer /> : 'Find Matches'}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}