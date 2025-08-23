'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoleSelectionModalProps {
    isOpen: boolean;
    email: string;
    onClose: () => void;
}

export function RoleSelectionModal({ isOpen, email, onClose }: RoleSelectionModalProps) {
    const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'LECTURER'>('STUDENT');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/auth/google-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    role: selectedRole,
                }),
            });

            if (response.ok) {
                onClose();
                router.push('/dashboard');
            } else {
                console.error('Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">Select Your Role</h2>
                <p className="text-gray-600 mb-6">
                    Please select your role to complete your account setup.
                </p>

                <div className="space-y-3 mb-6">
                    <button
                        onClick={() => setSelectedRole('STUDENT')}
                        className={`w-full p-3 rounded-lg border-2 transition-all ${selectedRole === 'STUDENT'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">school</span>
                            <div className="text-left">
                                <div className="font-medium">Student</div>
                                <div className="text-sm text-gray-500">
                                    Access course materials and participate in discussions
                                </div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setSelectedRole('LECTURER')}
                        className={`w-full p-3 rounded-lg border-2 transition-all ${selectedRole === 'LECTURER'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">psychology</span>
                            <div className="text-left">
                                <div className="font-medium">Lecturer</div>
                                <div className="text-sm text-gray-500">
                                    Create courses and manage educational content
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}