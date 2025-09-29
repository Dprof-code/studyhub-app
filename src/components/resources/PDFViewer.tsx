'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker source with fallbacks
if (typeof window !== 'undefined') {
    // Use a more stable worker configuration
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;
}

interface PDFViewerProps {
    fileUrl: string;
    currentPage: number;
    onPageChange: (_pageNumber: number) => void;
}

export function PDFViewer({ fileUrl, currentPage, onPageChange }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>();
    const [scale, setScale] = useState(1);
    const [error, setError] = useState<string | null>(null);

    // Convert Cloudinary URL to proxied URL
    const proxiedUrl = `/api/proxy/pdf?url=${encodeURIComponent(fileUrl)}`;

    const handleLoadError = (error: any) => {
        console.error('Error loading PDF:', error);
        setError('Failed to load PDF. This might be due to a browser compatibility issue. Please try downloading the file.');
    };

    return (
        <div className="flex h-[80vh]">
            {/* Thumbnails */}
            <div className="w-24 bg-muted p-2 overflow-y-auto">
                {!error && (
                    <Document 
                        file={proxiedUrl}
                        onLoadError={handleLoadError}
                    >
                        {Array.from(new Array(numPages), (_, index) => (
                            <div
                                key={`thumb-${index + 1}`}
                                className={`cursor-pointer mb-2 border-2 rounded ${currentPage === index + 1 ? 'border-primary' : 'border-transparent'
                                    }`}
                                onClick={() => onPageChange(index + 1)}
                            >
                                <Page
                                    pageNumber={index + 1}
                                    width={80}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </div>
                        ))}
                    </Document>
                )}
            </div>

            {/* Main Viewer */}
            <div className="flex-1 overflow-auto">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-destructive mb-4">{error}</p>
                        <Button asChild>
                            <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                                Download PDF
                            </a>
                        </Button>
                    </div>
                ) : (
                    <Document
                        file={proxiedUrl}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        onLoadError={handleLoadError}
                        loading={
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        }
                    >
                        <Page
                            pageNumber={currentPage}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                        />
                    </Document>
                )}
            </div>

            {/* Controls */}
            {!error && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg p-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            className="p-2 hover:bg-muted rounded-full"
                        >
                            <span className="material-symbols-outlined">navigate_before</span>
                        </button>
                        <span className="text-sm">
                            Page {currentPage} of {numPages}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(numPages || 1, currentPage + 1))}
                            disabled={currentPage >= (numPages || 1)}
                            className="p-2 hover:bg-muted rounded-full"
                        >
                            <span className="material-symbols-outlined">navigate_next</span>
                        </button>
                        <Separator orientation="vertical" className="h-6" />
                        <button
                            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                            className="p-2 hover:bg-muted rounded-full"
                        >
                            <span className="material-symbols-outlined">zoom_out</span>
                        </button>
                        <button
                            onClick={() => setScale(1)}
                            className="p-2 hover:bg-muted rounded-full"
                        >
                            <span className="material-symbols-outlined">zoom_in</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}