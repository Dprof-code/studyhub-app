'use client';

import { Navigation } from '@/components/layout/Navigation';
import { SessionProvider } from 'next-auth/react';

interface ChatLayoutProps {
    children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
    return (
        <SessionProvider>
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <main className="pt-16">
                    {children}
                </main>
            </div>
        </SessionProvider>
    );
}