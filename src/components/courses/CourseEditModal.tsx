'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CourseEditModalProps = {
    course: {
        id: number;
        code: string;
        title: string;
        synopsis: string;
        level: number;
    };
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedCourse: any) => void;
};

export function CourseEditModal({ course, isOpen, onClose, onUpdate }: CourseEditModalProps) {
    const [formData, setFormData] = useState({
        title: course.title,
        synopsis: course.synopsis,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/courses/${course.code}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error('Failed to update course');

            const updatedCourse = await response.json();
            onUpdate(updatedCourse);
            toast.success('Course updated successfully');
            onClose();
        } catch (error) {
            console.error('Error updating course:', error);
            toast.error('Failed to update course');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Course</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Course Code</label>
                        <Input value={course.code} disabled />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Course Title</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Synopsis</label>
                        <Textarea
                            value={formData.synopsis}
                            onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                            required
                            rows={5}
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
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}