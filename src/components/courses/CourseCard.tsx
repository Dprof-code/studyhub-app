'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

type CourseCardProps = {
    id: number;
    code: string;
    title: string;
    synopsis: string;
    department: string;
    level: number;
    isEnrolled?: boolean;
    enrollmentStatus?: string;
    studentCount?: number;
    resourceCount?: number;
    onEnrollmentChange?: () => void;
};

export function CourseCard({
    id,
    code,
    title,
    synopsis,
    department,
    level,
    isEnrolled = false,
    enrollmentStatus,
    studentCount = 0,
    resourceCount = 0,
    onEnrollmentChange
}: CourseCardProps) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    const handleEnroll = async () => {
        if (!session) {
            toast.error('Please sign in to enroll in courses');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/courses/enrollment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: id })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                onEnrollmentChange?.();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to enroll');
            }
        } catch (_error) {
            toast.error('Error enrolling in course');
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = async () => {
        if (!session) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/courses/enrollment/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                onEnrollmentChange?.();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to drop course');
            }
        } catch (_error) {
            toast.error('Error dropping course');
        } finally {
            setLoading(false);
        }
    };

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
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{code}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Badge>{`${level} Level`}</Badge>
                        <Badge variant="outline">{department}</Badge>
                        {isEnrolled && enrollmentStatus && (
                            <Badge className={getStatusColor(enrollmentStatus)}>
                                {enrollmentStatus.toLowerCase()}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{synopsis}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">group</span>
                        {studentCount} students
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">folder</span>
                        {resourceCount} resources
                    </span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
                <Link href={`/courses/${code}`} passHref>
                    <Button variant="outline" className="flex-1">
                        View Course
                        <span className="material-symbols-outlined ml-2">arrow_forward</span>
                    </Button>
                </Link>

                {session && (
                    <>
                        {!isEnrolled ? (
                            <Button
                                onClick={handleEnroll}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined mr-2">add</span>
                                        Enroll
                                    </>
                                )}
                            </Button>
                        ) : enrollmentStatus === 'ACTIVE' ? (
                            <Button
                                onClick={handleDrop}
                                disabled={loading}
                                variant="destructive"
                                className="flex-1"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined mr-2">remove</span>
                                        Drop
                                    </>
                                )}
                            </Button>
                        ) : enrollmentStatus === 'DROPPED' ? (
                            <Button
                                onClick={handleEnroll}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined mr-2">refresh</span>
                                        Re-enroll
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </>
                )}
            </CardFooter>
        </Card>
    );
}