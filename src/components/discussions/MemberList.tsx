'use client';

import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type Member = {
    id: number;
    user: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        avatarUrl: string | null;
    };
    role: 'STUDENT' | 'INSTRUCTOR' | 'TEACHING_ASSISTANT';
    joinedAt: string;
};

export function MemberList({ courseId }: { courseId: number }) {
    const { data: members, isLoading } = useQuery<Member[]>({
        queryKey: ['course-members', courseId],
        queryFn: async () => {
            const response = await fetch(`/api/courses/${courseId}/members`);
            if (!response.ok) throw new Error('Failed to fetch members');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/6" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!members) {
        return <div>No members found</div>;
    }

    const groupedMembers = members.reduce((acc: Record<string, Member[]>, member: Member) => {
        const role = member.role.toLowerCase().replace('_', ' ');
        acc[role] = acc[role] || [];
        acc[role].push(member);
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            {Object.entries(groupedMembers).map(([role, roleMembers]) => (
                <div key={role}>
                    <h3 className="text-lg font-semibold mb-4 capitalize">{role}s</h3>
                    <div className="space-y-4">
                        {roleMembers.map((member: Member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <Avatar
                                    src={member.user.avatarUrl || '/avatar.jpg'}
                                    alt={member.user.username}
                                    className="w-10 h-10"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {member.user.firstname} {member.user.lastname}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            @{member.user.username}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}