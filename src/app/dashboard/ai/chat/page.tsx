/**
 * AI Chat Page
 * Phase 5B: Core Features Implementation
 */
'use client';

import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import AIChatInterface from '@/components/ai/chat/AIChatInterface';

export default function AIChatPage() {
    return (
        <AIDashboardLayout>
            <div className="h-full">
                <AIChatInterface
                    contextType="general"
                    className="h-full"
                />
            </div>
        </AIDashboardLayout>
    );
}