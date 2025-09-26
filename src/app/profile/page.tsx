import React from 'react'
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import { UserStatsDisplay, AchievementsDisplay } from '@/components/gamification';

const Profile = async () => {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your profile</h1>
                    <Link href="/sign-in" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
                    <p className="text-gray-600">Welcome back, {session.user.firstname || session.user.username}!</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Profile Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Profile Info */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Username</label>
                                    <p className="text-lg text-gray-900">@{session.user.username}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-lg text-gray-900">{session.user.email}</p>
                                </div>
                                {(session.user.firstname || session.user.lastname) && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                                        <p className="text-lg text-gray-900">
                                            {session.user.firstname} {session.user.lastname}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Gamification Stats */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Progress</h2>
                            <UserStatsDisplay userId={parseInt(session.user.id)} variant="full" />
                        </div>

                        {/* Recent Achievements */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Achievements</h2>
                            <AchievementsDisplay
                                userId={session.user.id}
                                showOnlyUnlocked={true}
                                compact={true}
                            />
                            <div className="mt-4">
                                <Link
                                    href="/gamification"
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    View all achievements →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <Link
                                    href="/resources/upload"
                                    className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <span className="material-symbols-outlined text-blue-600 mr-3">upload</span>
                                        <div>
                                            <p className="font-medium text-blue-900">Upload Resource</p>
                                            <p className="text-sm text-blue-600">+20 XP</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link
                                    href="/discussions"
                                    className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <span className="material-symbols-outlined text-green-600 mr-3">forum</span>
                                        <div>
                                            <p className="font-medium text-green-900">Join Discussion</p>
                                            <p className="text-sm text-green-600">+15 XP</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link
                                    href="/matches/request"
                                    className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <span className="material-symbols-outlined text-purple-600 mr-3">group_add</span>
                                        <div>
                                            <p className="font-medium text-purple-900">Find Study Buddy</p>
                                            <p className="text-sm text-purple-600">Connect & Learn</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Profile Links */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
                            <div className="space-y-2">
                                <Link
                                    href="/settings"
                                    className="block text-gray-600 hover:text-gray-900 py-2"
                                >
                                    Edit Profile
                                </Link>
                                <Link
                                    href="/gamification"
                                    className="block text-gray-600 hover:text-gray-900 py-2"
                                >
                                    Gamification Hub
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile