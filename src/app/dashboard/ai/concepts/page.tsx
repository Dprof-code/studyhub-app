/**
 * Interactive Concept Maps Page
 * Phase 5B: Core Features Implementation
 */
'use client';

import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import InteractiveConceptMap from '@/components/ai/concepts/InteractiveConceptMap';

export default function ConceptMapsPage() {
    return (
        <AIDashboardLayout>
            <div className="h-full">
                <InteractiveConceptMap
                    mode="view"
                    className="h-full"
                />
            </div>
        </AIDashboardLayout>
    );
}