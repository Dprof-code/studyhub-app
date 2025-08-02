'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CreateMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="shrink-0"
            >
                <span className="material-symbols-outlined">add</span>
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-50"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50">
                        <nav className="p-2">
                            <Link
                                href="/courses/new"
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="material-symbols-outlined">add_task</span>
                                New Course
                            </Link>
                            <Link
                                href="/resources/upload"
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="material-symbols-outlined">upload_file</span>
                                Upload Resource
                            </Link>
                        </nav>
                    </div>
                </>
            )}
        </div>
    );
}