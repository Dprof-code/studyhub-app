/**
 * Question Intelligence Hub Page
 * Phase 5B: Core Features Implementation
 */
'use client';

import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import QuestionIntelligenceHub from '@/components/layout/questions/QuestionIntelligenceHub';

export default function QuestionsPage() {
    return (
        <AIDashboardLayout>
            <div className="h-full">
                <QuestionIntelligenceHub
                    className="h-full"
                />
            </div>
        </AIDashboardLayout>
    );
}