'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Editor } from '@/components/discussions/Editor';
import { toast } from 'sonner';

type ReplyEditorProps = {
    threadId: number;
    parentId?: number | null;
    onCancel?: () => void;
    onSuccess: () => void;
};

export function ReplyEditor({ threadId, parentId, onCancel, onSuccess }: ReplyEditorProps) {
    const { data: session } = useSession();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!session?.user) {
            toast.error('You must be logged in to reply');
            return;
        }

        if (!content.trim()) {
            toast.error('Reply cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/threads/${threadId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parentId }),
            });

            if (!response.ok) throw new Error('Failed to post reply');

            toast.success('Reply posted successfully');
            setContent('');
            onSuccess();
        } catch (error) {
            toast.error('Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <Editor
                onChange={setContent}
                content={content}
                placeholder="Write your reply..."
            />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
            </div>
        </div>
    );
}