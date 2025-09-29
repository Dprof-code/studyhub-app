/**
 * AI Features Layout
 * Phase 5A: Advanced UI Features - Foundation
 */
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Dashboard - StudyHub',
    description: 'AI-powered learning insights and analytics for personalized education',
};

interface AILayoutProps {
    children: React.ReactNode;
}

export default function AILayout({ children }: AILayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {children}
        </div>
    );
}