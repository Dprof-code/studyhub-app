'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Editor } from "@/components/discussions/Editor";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

type NewThreadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    courseCode: string;
};

export function NewThreadModal({ isOpen, onClose, courseCode }: NewThreadModalProps) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/courses/${courseCode}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });

            if (!response.ok) throw new Error('Failed to create thread');

            const thread = await response.json();
            toast.success('Thread created successfully');
            router.push(`/courses/${courseCode}/discussions/${thread.id}`);
        } catch (error) {
            console.error('Error creating thread:', error);
            toast.error('Failed to create thread');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Start New Discussion</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Thread Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter thread title..."
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Content</label>
                        <Editor
                            content={content}
                            onChange={setContent}
                            placeholder="Write your post..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Thread'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}