'use client';

import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

type FileUploadProps = {
    onUpload: (url: string) => void;
    allowedTypes?: string[];
    maxSize?: number;
};

export function FileUpload({
    onUpload,
    allowedTypes = ['image/*', 'application/pdf'],
    maxSize = 5242880 // 5MB
}: FileUploadProps) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
        maxSize,
        multiple: false,
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;

            try {
                const file = acceptedFiles[0];
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload/postmedia', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Upload failed');

                const { url } = await response.json();
                onUpload(url);
                toast.success('File uploaded successfully');
            } catch (error) {
                toast.error('Failed to upload file');
                console.error(error);
            }
        },
        onDropRejected: (fileRejections) => {
            const rejection = fileRejections[0];
            if (rejection.file.size > maxSize) {
                toast.error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
            } else {
                toast.error('Invalid file type');
            }
        },
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
        >
            <input {...getInputProps()} />
            {isDragActive ? (
                <p>Drop the file here</p>
            ) : (
                <div className="space-y-2">
                    <p>Drag & drop a file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                        Supported formats: Images, PDF (max {maxSize / 1024 / 1024}MB)
                    </p>
                </div>
            )}
        </div>
    );
}