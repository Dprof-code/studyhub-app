'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Editor } from '@/components/discussions/Editor';
import { FileUpload } from './FileUpload';
import { toast } from 'sonner';
import { Editor as TipTapEditor } from '@tiptap/react';

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
    const [attachments, setAttachments] = useState<string[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const editorRef = useRef<TipTapEditor | null>(null);

    const handleUpload = (url: string) => {
        setAttachments(prev => [...prev, url]);
        setShowUpload(false);
    };

    const handleRemoveAttachment = (indexToRemove: number) => {
        setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
    };

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
            const pathSegments = window.location.pathname.split('/');
            const courseCode = pathSegments[2];

            const response = await fetch(`/api/courses/${courseCode}/threads/${threadId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parentId, attachments }),
            });

            if (!response.ok) throw new Error('Failed to post reply');

            toast.success('Reply posted successfully');
            setContent('');
            setAttachments([]);
            editorRef.current?.commands.clearContent();
            onSuccess();
        } catch (error) {
            toast.error('Failed to post reply');
            console.error('Error posting reply:', error);
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
                onMount={(editor) => {
                    editorRef.current = editor;
                }}
            />


            {/* Attachment Preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((url, index) => {
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return isImage ? (
                            <div key={index} className="relative group">
                                <img
                                    src={url}
                                    alt="Attachment preview"
                                    className="w-20 h-20 object-cover rounded-md"
                                />
                                <button
                                    onClick={() => handleRemoveAttachment(index)}
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        ) : (
                            <div key={index} className="relative group">
                                <div className="flex items-center gap-2 p-2 border rounded-md">
                                    <span className="material-symbols-outlined">attach_file</span>
                                    <span className="text-sm truncate max-w-[150px]">
                                        {url.split('/').pop()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveAttachment(index)}
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* File Upload */}
            {showUpload && (
                <div className="mt-4">
                    <FileUpload onUpload={handleUpload} />
                </div>
            )}

            <div className="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpload(!showUpload)}
                >
                    <span className="material-symbols-outlined mr-2">attach_file</span>
                    Add Attachment
                </Button>

                <div className="flex gap-2">
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
        </div>
    );
}