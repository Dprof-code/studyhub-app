import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET() {
    try {
        // Get recent AI processing jobs
        const recentJobs = await db.aIProcessingJob.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                resource: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'AI Processing Jobs Status',
            totalJobs: recentJobs.length,
            jobs: recentJobs.map(job => ({
                id: job.id,
                resourceId: job.resourceId,
                resourceTitle: job.resource?.title,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                errorMessage: job.errorMessage
            }))
        });
    } catch (error) {
        console.error('Error fetching AI jobs:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch AI processing jobs',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}