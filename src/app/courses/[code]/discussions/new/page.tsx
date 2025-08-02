'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Editor } from '@/components/discussions/Editor';
import { toast } from 'sonner';

const threadSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    content: z.string().min(10, 'Content must be at least 10 characters'),
});

type ThreadFormData = z.infer<typeof threadSchema>;

export default function NewThreadPage() {
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<ThreadFormData>({
        resolver: zodResolver(threadSchema),
    });

    const onSubmit = async (data: ThreadFormData) => {
        if (!session?.user) {
            toast.error('You must be logged in to create a thread');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/courses/${params.code}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to create thread');

            const thread = await response.json();
            toast.success('Thread created successfully');
            router.push(`/courses/${params.code}/discussions/${thread.id}`);
        } catch (error) {
            toast.error('Failed to create thread');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">Create New Thread</h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Input
                                placeholder="Thread title"
                                {...register('title')}
                                className="text-lg"
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">
                                    {errors.title.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Editor
                                onChange={(content) => setValue('content', content)}
                                placeholder="Write your post here..."
                            />
                            {errors.content && (
                                <p className="text-sm text-destructive">
                                    {errors.content.message}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin mr-2">
                                            progress_activity
                                        </span>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Thread'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}