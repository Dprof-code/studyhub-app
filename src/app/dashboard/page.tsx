'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRedirect() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        console.log('Dashboard redirect - Session status:', status);
        console.log('Dashboard redirect - Session data:', session);

        if (status === 'loading') {
            console.log('Session still loading...');
            return;
        }

        if (status === 'unauthenticated') {
            console.log('User not authenticated, redirecting to sign-in');
            router.push('/sign-in');
            return;
        }

        if (session?.user?.username) {
            console.log('Redirecting to user profile:', `/${session.user.username}`);
            router.push(`/${session.user.username}`);
        } else {
            console.log('No username found, redirecting to resources');
            router.push('/resources');
        }
    }, [session, status, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Setting up your profile...</p>
                <p className="mt-2 text-sm text-gray-500">Please wait while we redirect you</p>
            </div>
        </div>
    );
}