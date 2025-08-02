import React from 'react'
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';

const Profile = async () => {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session) {
        return (
            <div>
                <h1>Please sign in to view your profile</h1>
                <Link href="/sign-in">Sign In</Link>
            </div>
        );
    }
    return (
        <div>Welcome to your Profile</div>
    )
}

export default Profile