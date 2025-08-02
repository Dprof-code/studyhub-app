'use client';

import { useState } from 'react';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileTabs } from './components/ProfileTabs';
import { ProfileSidebar } from './components/ProfileSidebar';
import { ProfileContent } from './components/ProfileContent';

export default function ProfilePage({ params }: { params: { username: string } }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { username } = params;

    return (
        <div className="min-h-screen bg-background">
            {/* Profile Header */}
            <ProfileHeader username={username} />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full lg:w-1/4">
                        <ProfileSidebar username={username} />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        <ProfileContent activeTab={activeTab} username={username} />
                    </div>
                </div>
            </div>
        </div>
    );
}