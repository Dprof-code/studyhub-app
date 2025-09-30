import { NextResponse } from 'next/server';
import { jobQueue, JOB_TYPES } from '@/lib/queue/jobQueue';

export async function GET() {
    try {
        // Get queue status
        const stats = await jobQueue.getStats();
        const allJobs = await jobQueue.getJobs();

        // Check if processors are registered
        const processorCount = (jobQueue as any).processors?.size || 0;
        const availableProcessors = Array.from((jobQueue as any).processors?.keys() || []);

        return NextResponse.json({
            success: true,
            stats,
            processorCount,
            availableProcessors,
            jobTypes: Object.values(JOB_TYPES),
            totalJobs: allJobs.length,
            recentJobs: allJobs.slice(-5).map(job => ({
                id: job.id,
                type: job.type,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt
            }))
        });
    } catch (error) {
        console.error('Error getting queue status:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get queue status',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}