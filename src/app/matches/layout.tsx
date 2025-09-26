'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { Navigation } from '@/components/layout/Navigation';

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <Navigation />
            <main className="min-h-screen bg-gray-50">
                {children}
            </main>
        </SessionProvider>
    );
}