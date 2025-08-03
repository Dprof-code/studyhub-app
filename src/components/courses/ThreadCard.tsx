import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ThreadCardProps = {
    thread: {
        id: number;
        title: string;
        createdAt: string;
        author: {
            firstname: string;
            lastname: string;
            avatarUrl: string | null;
        };
        _count: {
            posts: number;
        };
        isLocked: boolean;
    };
    courseCode: string;
};

export function ThreadCard({ thread, courseCode }: ThreadCardProps) {
    return (
        <Link href={`/courses/${courseCode}/discussions/${thread.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{thread.title}</h3>
                            {thread.isLocked && (
                                <Badge variant="secondary">
                                    <span className="material-symbols-outlined text-sm mr-1">lock</span>
                                    Locked
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <img
                                    src={thread.author.avatarUrl || '/avatar.jpg'}
                                    alt={`${thread.author.firstname} ${thread.author.lastname}`}
                                    className="w-5 h-5 rounded-full"
                                />
                                <span>{thread.author.firstname} {thread.author.lastname}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">forum</span>
                                <span>{thread._count.posts} posts</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}