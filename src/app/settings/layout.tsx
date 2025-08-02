'use client';

import { Navigation } from '@/components/layout/Navigation';

import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <Navigation />
            {children}
        </SessionProvider>
    );
}