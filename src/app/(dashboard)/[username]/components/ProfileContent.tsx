'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

type Enrollment = {
    id: number;
    status: string;
    enrolledAt: string;
    isAutoEnrolled: boolean;
    course: {
        id: number;
        code: string;
        title: string;
        level: number;
        department: {
            name: string;
            faculty: {
                name: string;
            };
        };
        _count: {
            resources: number;
            enrollments: number;
        };
    };
};

type CourseRecommendation = {
    id: number;
    code: string;
    title: string;
    level: number;
    department: {
        name: string;
        faculty: {
            name: string;
        };
    };
    popularity: number;
    resourceCount: number;
};

export function ProfileContent({
    activeTab,
    username
}: {
    activeTab: string;
    username: string;
}) {
    const { data: session } = useSession();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const isOwner = session?.user?.username === username;

    // Fetch user's enrollments
    const fetchEnrollments = useCallback(async () => {
        if (!isOwner) return; // Only show enrollments to the profile owner

        setLoading(true);
        try {
            const response = await fetch('/api/courses/enrollment');
            if (response.ok) {
                const data = await response.json();
                setEnrollments(data.enrollments);
            }
        } catch (_error) {
            console.error('Error fetching enrollments:', _error);
        } finally {
            setLoading(false);
        }
    }, [isOwner]);

    // Fetch course recommendations
    const fetchRecommendations = useCallback(async () => {
        if (!isOwner) return;

        setRecommendationsLoading(true);
        try {
            const response = await fetch('/api/courses/auto-enroll');
            if (response.ok) {
                const data = await response.json();
                setRecommendations(data.recommendations);
            }
        } catch (_error) {
            console.error('Error fetching recommendations:', _error);
        } finally {
            setRecommendationsLoading(false);
        }
    }, [isOwner]);

    // Auto-enroll in recommended courses
    const handleAutoEnroll = async () => {
        try {
            const response = await fetch('/api/courses/auto-enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxEnrollments: 5 })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                fetchEnrollments(); // Refresh enrollments
                fetchRecommendations(); // Refresh recommendations
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to auto-enroll');
            }
        } catch (error) {
            toast.error('Error during auto-enrollment');
            console.error('Auto-enroll error:', error);
        }
    };

    // Drop course
    const handleDropCourse = async (courseId: number) => {
        try {
            const response = await fetch(`/api/courses/enrollment/${courseId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                fetchEnrollments(); // Refresh enrollments
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to drop course');
            }
        } catch (error) {
            toast.error('Error dropping course');
            console.error('Drop course error:', error);
        }
    };

    // Re-enroll in course
    const handleReEnroll = async (courseId: number) => {
        try {
            const response = await fetch(`/api/courses/enrollment/${courseId}`, {
                method: 'PATCH'
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                fetchEnrollments(); // Refresh enrollments
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to re-enroll');
            }
        } catch (error) {
            toast.error('Error re-enrolling in course');
            console.error('Re-enroll error:', error);
        }
    };

    // Manual course enrollment
    const handleManualEnroll = async (courseId: number) => {
        try {
            const response = await fetch('/api/courses/enrollment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                fetchEnrollments(); // Refresh enrollments
                fetchRecommendations(); // Refresh recommendations
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to enroll');
            }
        } catch (error) {
            toast.error('Error enrolling in course');
            console.error('Enroll error:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'courses') {
            fetchEnrollments();
            fetchRecommendations();
        }
    }, [activeTab, isOwner, fetchEnrollments, fetchRecommendations]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800';
            case 'DROPPED': return 'bg-gray-100 text-gray-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-card rounded-lg border border-border p-4">
                        <h2 className="font-semibold mb-4">Recent Activity</h2>
                        {/* Add activity content */}
                    </div>

                    {/* Popular Repositories */}
                    <div className="bg-card rounded-lg border border-border p-4">
                        <h2 className="font-semibold mb-4">Popular Projects</h2>
                        {/* Add projects content */}
                    </div>
                </div>
            )}

            {activeTab === 'courses' && (
                <div className="space-y-6">
                    {isOwner ? (
                        <>
                            {/* Enrolled Courses */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>My Courses</CardTitle>
                                    <div className="flex gap-2">
                                        <Link href="/courses/new">
                                            <Button variant="outline" size="sm">
                                                <span className="material-symbols-outlined mr-2">add</span>
                                                Create Course
                                            </Button>
                                        </Link>
                                        <Button
                                            onClick={handleAutoEnroll}
                                            size="sm"
                                            disabled={recommendations.length === 0}
                                        >
                                            <span className="material-symbols-outlined mr-2">auto_awesome</span>
                                            Auto Enroll
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="flex items-center justify-center p-8">
                                            <span className="material-symbols-outlined animate-spin">refresh</span>
                                            <span className="ml-2">Loading courses...</span>
                                        </div>
                                    ) : enrollments.length > 0 ? (
                                        <div className="grid gap-4">
                                            {enrollments.map((enrollment) => (
                                                <div
                                                    key={enrollment.id}
                                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-medium">
                                                                {enrollment.course.code} - {enrollment.course.title}
                                                            </h3>
                                                            <Badge className={getStatusColor(enrollment.status)}>
                                                                {enrollment.status.toLowerCase()}
                                                            </Badge>
                                                            {enrollment.isAutoEnrolled && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Auto-enrolled
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {enrollment.course.department.name} • Level {enrollment.course.level} •
                                                            {enrollment.course._count.resources} resources •
                                                            {enrollment.course._count.enrollments} students
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Link href={`/courses/${enrollment.course.code}`}>
                                                            <Button variant="outline" size="sm">
                                                                View
                                                            </Button>
                                                        </Link>
                                                        {enrollment.status === 'ACTIVE' && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDropCourse(enrollment.course.id)}
                                                            >
                                                                Drop
                                                            </Button>
                                                        )}
                                                        {enrollment.status === 'DROPPED' && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() => handleReEnroll(enrollment.course.id)}
                                                            >
                                                                Re-enroll
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">school</span>
                                            <p className="text-muted-foreground mb-4">No enrolled courses yet</p>
                                            <div className="flex gap-2 justify-center">
                                                <Link href="/courses">
                                                    <Button variant="outline">Browse Courses</Button>
                                                </Link>
                                                <Button onClick={handleAutoEnroll} disabled={recommendations.length === 0}>
                                                    Auto Enroll
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Course Recommendations */}
                            {recommendations.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="material-symbols-outlined">auto_awesome</span>
                                            Recommended Courses
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Based on courses popular with students in your department and level
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        {recommendationsLoading ? (
                                            <div className="flex items-center justify-center p-8">
                                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                                <span className="ml-2">Loading recommendations...</span>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {recommendations.slice(0, 5).map((course) => (
                                                    <div
                                                        key={course.id}
                                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="font-medium">
                                                                    {course.code} - {course.title}
                                                                </h3>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {course.popularity} students enrolled
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {course.department.name} • Level {course.level} •
                                                                {course.resourceCount} resources
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => handleManualEnroll(course.id)}
                                                            size="sm"
                                                        >
                                                            Enroll
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card>
                            <CardContent className="text-center py-8">
                                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">lock</span>
                                <p className="text-muted-foreground">Course information is private</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Other tabs can be implemented here */}
            {['projects', 'assignments', 'contributions'].includes(activeTab) && (
                <Card>
                    <CardContent className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-muted-foreground mb-4">
                            {activeTab === 'projects' ? 'folder' :
                                activeTab === 'assignments' ? 'assignment' : 'trending_up'}
                        </span>
                        <p className="text-muted-foreground">{activeTab} section coming soon</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}