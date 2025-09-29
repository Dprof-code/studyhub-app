import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { jobQueue, Job } from '@/lib/queue/jobQueue';
import { getQueueStats } from '@/lib/queue/aiProcessors';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const jobId = searchParams.get('jobId');
        const status = searchParams.get('status') as Job['status'] | null;

        switch (action) {
            case 'status':
                if (!jobId) {
                    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
                }

                const job = await jobQueue.getJob(jobId);
                if (!job) {
                    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
                }

                return NextResponse.json({
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress,
                    result: job.result,
                    error: job.error,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    attempts: job.attempts
                });

            case 'list':
                const jobs = await jobQueue.getJobs(status || undefined);
                const jobsList = jobs.map(job => ({
                    id: job.id,
                    type: job.type,
                    status: job.status,
                    progress: job.progress,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    attempts: job.attempts
                }));

                return NextResponse.json({ jobs: jobsList });

            case 'stats':
                const stats = await getQueueStats();
                return NextResponse.json({ stats });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Job management error:', error);
        return NextResponse.json(
            { error: 'Failed to process job request' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, jobId } = await request.json();

        switch (action) {
            case 'retry':
                if (!jobId) {
                    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
                }

                const job = await jobQueue.getJob(jobId);
                if (!job) {
                    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
                }

                if (job.status !== 'failed') {
                    return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 400 });
                }

                // Reset job status for retry
                job.status = 'pending';
                job.attempts = 0;
                job.error = undefined;
                job.updatedAt = new Date();

                return NextResponse.json({ message: 'Job queued for retry', jobId: job.id });

            case 'cancel':
                if (!jobId) {
                    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
                }

                const jobToCancel = await jobQueue.getJob(jobId);
                if (!jobToCancel) {
                    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
                }

                if (jobToCancel.status === 'processing') {
                    return NextResponse.json({ error: 'Cannot cancel processing job' }, { status: 400 });
                }

                jobToCancel.status = 'failed';
                jobToCancel.error = 'Cancelled by user';
                jobToCancel.updatedAt = new Date();

                return NextResponse.json({ message: 'Job cancelled', jobId: jobToCancel.id });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Job action error:', error);
        return NextResponse.json(
            { error: 'Failed to perform job action' },
            { status: 500 }
        );
    }
}