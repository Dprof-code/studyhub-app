'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Navigation } from '@/components/layout/Navigation';

import { SessionProvider } from 'next-auth/react';

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <Navigation />
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
}