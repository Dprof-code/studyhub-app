import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJobStatus } from '@/lib/queue/aiProcessors';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const { jobId } = resolvedParams;

        // Get job status from queue
        const job = await getJobStatus(jobId);

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Also get database job record for additional info
        const dbJob = await db.aIProcessingJob.findUnique({
            where: { id: jobId },
            include: {
                resource: {
                    include: {
                        course: true,
                        uploader: {
                            select: { username: true }
                        }
                    }
                }
            }
        });

        // Combine queue job info with database info
        const response = {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            result: job.result,
            error: job.error,
            // Additional database info if available
            resource: dbJob ? {
                id: dbJob.resource.id,
                title: dbJob.resource.title,
                courseTitle: dbJob.resource.course.title,
                uploader: dbJob.resource.uploader.username
            } : null,
            databaseStatus: dbJob ? {
                status: dbJob.status,
                progress: dbJob.progress,
                errorMessage: dbJob.errorMessage,
                results: dbJob.results,
                startedAt: dbJob.startedAt,
                completedAt: dbJob.completedAt
            } : null
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching processing status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch processing status' },
            { status: 500 }
        );
    }
}