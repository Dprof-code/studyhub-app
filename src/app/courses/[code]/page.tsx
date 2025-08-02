'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Course = {
    id: number;
    code: string;
    title: string;
    synopsis: string;
    department: {
        id: number;
        name: string;
        faculty: {
            id: number;
            name: string;
        };
    };
    synopsisHistory: Array<{
        id: number;
        content: string;
        createdAt: string;
        user: {
            firstname: string;
            lastname: string;
            username: string;
            avatarUrl: string | null;
        };
    }>;
};

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedSynopsis, setEditedSynopsis] = useState('');

    console.log("params:", params);

    useEffect(() => {
        const fetchCourse = async () => {
            console.log("attempting to fetch course with code:", params.code);
            try {
                const response = await fetch(`/api/courses/${params.code}`);
                console.log("Response status:", response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log("Fetched course data:", data);
                    setCourse(data);
                    setEditedSynopsis(data.synopsis);
                } else {
                    toast.error('Course not found');
                    router.push('/courses');
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                toast.error('Failed to load course');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.code) {
            fetchCourse();
        }
    }, [params.code, router]);

    const handleSynopsisUpdate = async () => {
        try {
            const response = await fetch(`/api/courses/${params.code}/synopsis`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ synopsis: editedSynopsis }),
            });

            if (!response.ok) throw new Error('Failed to update synopsis');

            const updatedCourse = await response.json();
            setCourse(updatedCourse);
            setIsEditing(false);
            toast.success('Course synopsis updated successfully');
        } catch (error) {
            console.error('Error updating synopsis:', error);
            toast.error('Failed to update synopsis');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="space-y-8">
                    {/* Course Header */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
                                <p className="text-xl text-muted-foreground">{course.code}</p>
                            </div>
                            {session && (
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/courses/${course.code}/edit`)}
                                >
                                    <span className="material-symbols-outlined mr-2">edit</span>
                                    Edit Course
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-x-6 text-sm">
                            <div className="flex items-center gap-x-2">
                                <span className="material-symbols-outlined text-muted-foreground">
                                    school
                                </span>
                                <span>{course.department.name}</span>
                            </div>
                            <div className="flex items-center gap-x-2">
                                <span className="material-symbols-outlined text-muted-foreground">
                                    account_balance
                                </span>
                                <span>{course.department.faculty.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Synopsis Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Course Synopsis</h2>
                            {session && !isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <span className="material-symbols-outlined mr-2">edit_note</span>
                                    Edit Synopsis
                                </Button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                <textarea
                                    value={editedSynopsis}
                                    onChange={(e) => setEditedSynopsis(e.target.value)}
                                    className="w-full min-h-[200px] p-4 rounded-lg border bg-background"
                                    placeholder="Enter course synopsis..."
                                />
                                <div className="flex items-center gap-2">
                                    <Button onClick={handleSynopsisUpdate}>
                                        Save Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditedSynopsis(course.synopsis);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="prose dark:prose-invert max-w-none">
                                {course.synopsis}
                            </div>
                        )}
                    </div>

                    {/* Synopsis History */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Synopsis History</h2>
                        <div className="space-y-6">
                            {course.synopsisHistory.map((history) => (
                                <div
                                    key={history.id}
                                    className="border rounded-lg p-4 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={history.user.avatarUrl || '/avatar.jpg'}
                                                alt={`${history.user.firstname} ${history.user.lastname}`}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div>
                                                <p className="font-medium">
                                                    {history.user.firstname} {history.user.lastname}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(history.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm">{history.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}