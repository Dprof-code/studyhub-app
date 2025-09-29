/**
 * Smart Study Planner Page
 * Phase 5B: Core Features Implementation
 */
'use client';

import AIDashboardLayout from '@/components/layout/AIDashboardLayout';
import SmartStudyPlanner from '@/components/ai/planner/SmartStudyPlanner';

export default function StudyPlanPage() {
    return (
        <AIDashboardLayout>
            <div className="h-full">
                <SmartStudyPlanner
                    className="h-full"
                />
            </div>
        </AIDashboardLayout>
    );
}