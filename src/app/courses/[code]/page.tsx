'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CourseEditModal } from '@/components/courses/CourseEditModal';
import { ThreadCard } from '@/components/courses/ThreadCard';
import { NewThreadModal } from '@/components/courses/NewThreadModal';

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
    threads: Array<{
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
        isStickied: boolean;
        isLocked: boolean;
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState(false);

    const pinnedThreads = course?.threads?.filter(thread => thread.isStickied) || [];
    const regularThreads = course?.threads?.filter(thread => !thread.isStickied) || [];


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

    const handleCourseUpdate = (updatedCourse: Course) => {
        setCourse(updatedCourse);
    };

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
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column - Course Details */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Course Header */}
                        <div className="bg-card rounded-lg p-6 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                                    <p className="text-lg text-muted-foreground">{course.code}</p>
                                </div>
                                {session && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditModalOpen(true)}
                                    >
                                        <span className="material-symbols-outlined mr-2">edit</span>
                                        Edit Course
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-x-2 text-sm">
                                    <span className="material-symbols-outlined text-muted-foreground">
                                        school
                                    </span>
                                    <span>{course.department.name}</span>
                                </div>
                                <div className="flex items-center gap-x-2 text-sm">
                                    <span className="material-symbols-outlined text-muted-foreground">
                                        account_balance
                                    </span>
                                    <span>{course.department.faculty.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Synopsis Section */}
                        <div className="bg-card rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Course Synopsis</h2>
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
                        <div className="bg-card rounded-lg p-6 space-y-4">
                            <h2 className="text-lg font-semibold">Synopsis History</h2>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {course.synopsisHistory.map((history) => (
                                    <div
                                        key={history.id}
                                        className="border rounded-lg p-4 space-y-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={history.user.avatarUrl || '/avatar.jpg'}
                                                alt={`${history.user.firstname} ${history.user.lastname}`}
                                                className="w-6 h-6 rounded-full"
                                            />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {history.user.firstname} {history.user.lastname}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(history.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm">{history.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Discussions */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Threads Section */}
                        <div className="bg-card rounded-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Discussion Threads</h2>
                                {session && (
                                    <Button onClick={() => setIsNewThreadModalOpen(true)}>
                                        <span className="material-symbols-outlined mr-2">add</span>
                                        New Thread
                                    </Button>
                                )}
                            </div>

                            {/* Threads List */}
                            <div className="space-y-6">
                                {/* Pinned Threads */}
                                {pinnedThreads.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-muted-foreground">
                                            Pinned Threads
                                        </h3>
                                        <div className="space-y-2">
                                            {pinnedThreads.map(thread => (
                                                <ThreadCard
                                                    key={thread.id}
                                                    thread={thread}
                                                    courseCode={course.code}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Regular Threads */}
                                <div className="space-y-3">
                                    {(!course?.threads || course.threads.length === 0) ? (
                                        <div className="text-center py-12 bg-muted/50 rounded-lg">
                                            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">
                                                forum
                                            </span>
                                            <p className="text-muted-foreground">
                                                No discussions yet. Start one!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {regularThreads.map(thread => (
                                                <ThreadCard
                                                    key={thread.id}
                                                    thread={thread}
                                                    courseCode={course.code}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {course && (
                <>
                    <CourseEditModal
                        course={course}
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onUpdate={handleCourseUpdate}
                    />
                    <NewThreadModal
                        isOpen={isNewThreadModalOpen}
                        onClose={() => setIsNewThreadModalOpen(false)}
                        courseCode={course.code}
                    />
                </>
            )}
        </div>
    );
}