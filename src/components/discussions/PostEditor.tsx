'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Editor } from '@/components/discussions/Editor';
import { toast } from 'sonner';
import { Editor as TipTapEditor } from '@tiptap/react';

type PostEditorProps = {
    postId: number;
    initialContent: string;
    onCancel: () => void;
    onSave: () => void;
};

export function PostEditor({ postId, initialContent, onCancel, onSave }: PostEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const editorRef = useRef<TipTapEditor | null>(null);

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error('Post content cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const pathSegments = window.location.pathname.split('/');
            const courseCode = pathSegments[2];
            const threadId = pathSegments[4];

            const response = await fetch(
                `/api/courses/${courseCode}/threads/${threadId}/posts/${postId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                }
            );

            if (!response.ok) throw new Error('Failed to update post');

            toast.success('Post updated successfully');
            onSave();
        } catch (error) {
            toast.error('Failed to update post');
            console.error('Error updating post:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <Editor
                onChange={setContent}
                content={content}
                placeholder="Edit your post..."
                onMount={(editor) => {
                    editorRef.current = editor;
                }}
            />
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}