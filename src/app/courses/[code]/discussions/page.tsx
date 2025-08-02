'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThreadList } from '@/components/discussions/ThreadList';
import { ResourceList } from '@/components/discussions/ResourceList';
import { MemberList } from '@/components/discussions/MemberList';
import { Badge } from '@/components/ui/badge';

export default function CourseForumHub() {
    const params = useParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('threads');

    const { data: course, isLoading } = useQuery({
        queryKey: ['course', params.code],
        queryFn: async () => {
            const response = await fetch(`/api/courses/${params.code}`);
            console.log(response);
            console.log(params.code);
            if (!response.ok) throw new Error('Failed to fetch course');
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Course Banner */}
            <div className="bg-muted">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{course.code}</h1>
                                <Badge variant="outline" className="text-sm">
                                    {course.department.name}
                                </Badge>
                            </div>
                            <h2 className="text-xl text-muted-foreground">{course.title}</h2>
                        </div>
                        <Button>
                            <span className="material-symbols-outlined mr-2">person_add</span>
                            Enroll
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="threads" className="gap-2">
                                <span className="material-symbols-outlined">forum</span>
                                Threads
                            </TabsTrigger>
                            <TabsTrigger value="resources" className="gap-2">
                                <span className="material-symbols-outlined">library_books</span>
                                Resources
                            </TabsTrigger>
                            <TabsTrigger value="members" className="gap-2">
                                <span className="material-symbols-outlined">groups</span>
                                Members
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'threads' && (
                            <Button onClick={() => router.push(`/courses/${params.code}/discussions/new`)}>
                                <span className="material-symbols-outlined mr-2">add</span>
                                New Thread
                            </Button>
                        )}
                    </div>

                    <TabsContent value="threads">
                        <ThreadList courseId={course.id} />
                    </TabsContent>

                    <TabsContent value="resources">
                        <ResourceList courseId={course.id} />
                    </TabsContent>

                    <TabsContent value="members">
                        <MemberList courseId={course.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}