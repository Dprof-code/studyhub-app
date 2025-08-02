import React, { useRef, useState } from 'react';
import { Button } from './button';

interface ImageUploadProps {
    onUpload: (url: string) => void;
    onError: (error: string) => void;
}

export function ImageUpload({ onUpload, onError }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File) => {
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            onError('Please upload an image file');
            return;
        }

        if (file.size > 1024 * 1024) { // 1MB
            onError('Image size should be less than 1MB');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            onUpload(data.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            onError('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <>
                        <span className="material-symbols-outlined animate-spin mr-2">
                            refresh
                        </span>
                        Uploading...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined mr-2">
                            upload
                        </span>
                        Change Avatar
                    </>
                )}
            </Button>
        </div>
    );
}