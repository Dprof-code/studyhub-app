import { useEffect, useState } from 'react';

type UserProfile = {
    bio: string | null;
    level: number | null;
    department: { name: string } | null;
    // Add other fields as needed for stats
};

export function ProfileSidebar({ username }: { username: string }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        return <div className="space-y-6 animate-pulse">
            <div className="bg-card rounded-lg border border-border p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
            </div>
        </div>;
    }

    if (!profile) return null;

    return (
        <div className="space-y-6">
            {/* Bio Section */}
            <div className="bg-card rounded-lg border border-border p-4">
                <h2 className="font-semibold mb-2">About</h2>
                <p className="text-sm text-muted-foreground">
                    {profile.bio || 'No bio provided'}
                </p>
            </div>

            {/* Academic Info */}
            <div className="bg-card rounded-lg border border-border p-4">
                <h2 className="font-semibold mb-4">Academic Information</h2>
                <div className="space-y-3">
                    {profile.level && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-muted-foreground">
                                school
                            </span>
                            <span>Year {profile.level} Student</span>
                        </div>
                    )}
                    {profile.department && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-muted-foreground">
                                corporate_fare
                            </span>
                            <span>{profile.department.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="bg-card rounded-lg border border-border p-4">
                <h2 className="font-semibold mb-4">Activity</h2>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Courses</span>
                        <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Projects</span>
                        <span className="font-medium">8</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Assignments</span>
                        <span className="font-medium">45</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Contributions</span>
                        <span className="font-medium">156</span>
                    </div>
                </div>
            </div>
        </div>
    );
}