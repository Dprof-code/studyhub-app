'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

// Dynamically import PDF viewer with SSR disabled
const PDFViewer = dynamic(
    () => import('./PDFViewer').then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }
);

interface ResourceViewerProps {
    fileUrl: string;
    fileType: string;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export function ResourceViewer({ fileUrl, fileType, currentPage, onPageChange }: ResourceViewerProps) {
    if (fileType.startsWith('image/')) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <img src={fileUrl} alt="Resource" className="max-w-full max-h-[80vh] object-contain" />
            </div>
        );
    }

    if (fileType === 'application/pdf') {
        // Convert image URLs to raw URLs for PDFs
        return <PDFViewer fileUrl={fileUrl} currentPage={currentPage} onPageChange={onPageChange} />;
    }

    return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">description</span>
                <p className="mb-4">This file type cannot be previewed</p>
                <Button asChild>
                    <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                        Download File
                    </a>
                </Button>
            </div>
        </div>
    );
}