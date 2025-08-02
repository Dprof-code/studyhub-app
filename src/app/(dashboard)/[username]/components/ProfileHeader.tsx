import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type UserProfile = {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    bio: string | null;
    avatarUrl: string | null;
    level: number | null;
    faculty: { name: string } | null;
    department: { name: string } | null;
};

export function ProfileHeader({ username }: { username: string }) {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isOwner = session?.user?.email === profile?.email;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/user/profile/${username}`);
                if (!response.ok) throw new Error('Failed to fetch profile');
                const data = await response.json();
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    if (isLoading) {
        return <div className="bg-card border-b border-border p-8 animate-pulse">
            <div className="h-32 bg-muted rounded-full w-32 mb-4"></div>
        </div>;
    }

    if (!profile) {
        return <div className="bg-card border-b border-border p-8">
            Profile not found
        </div>;
    }

    return (
        <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <Avatar
                            size="xl"
                            src={profile.avatarUrl || '/default-avatar.png'}
                            alt={`${profile.username}'s avatar`}
                            className="ring-4 ring-background"
                        />
                        {isOwner && (
                            <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-background" />
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                            <h1 className="text-2xl font-bold">
                                {profile.firstname} {profile.lastname}
                            </h1>
                            <span className="text-sm text-muted-foreground">
                                @{profile.username}
                            </span>
                            <div className="flex-1" />
                            {isOwner && (
                                <Link
                                    href={`/settings/profile/${profile.username}`}
                                    className="text-sm text-primary hover:underline"
                                >
                                    <Button variant="outline" size="sm">
                                        Edit Profile
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <div className="text-muted-foreground mb-4">
                            {profile.faculty?.name} Student {profile.level && `• Year ${profile.level}`}
                        </div>

                        <div className="flex items-center gap-6 flex-wrap">
                            {profile.faculty && (
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">school</span>
                                    <span>{profile.faculty.name}</span>
                                </div>
                            )}
                            {profile.department && (
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">location_on</span>
                                    <span>{profile.department.name}</span>
                                </div>
                            )}
                            {isOwner && (
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">mail</span>
                                    <span>{profile.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}