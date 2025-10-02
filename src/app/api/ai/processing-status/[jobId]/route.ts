import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getJobStatus } from '../../../../../lib/queue/aiProcessors';
import { db } from '../../../../../lib/dbconfig';

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

        console.log(`🔍 Fetching processing status for job: ${jobId}`);

        // Get job status from database first (for serverless compatibility)
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

        if (!dbJob) {
            console.error(`❌ Job not found in database: ${jobId}`);

            // Fallback: try to get from in-memory queue
            const job = await getJobStatus(jobId);

            if (!job) {
                return NextResponse.json({ error: 'Job not found' }, { status: 404 });
            }

            // Return queue job info
            return NextResponse.json({
                id: job.id,
                type: job.type,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                attempts: job.attempts,
                maxAttempts: job.maxAttempts,
                resource: null,
                databaseStatus: null
            });
        }

        console.log(`✅ Found job in database: ${jobId}, Status: ${dbJob.status}, Progress: ${dbJob.progress}`);

        // Return database job info (primary source for serverless)
        const response = {
            id: dbJob.id,
            type: 'analyze-document',
            status: dbJob.status,
            progress: dbJob.progress,
            createdAt: dbJob.createdAt,
            updatedAt: dbJob.createdAt, // Use createdAt as fallback since updatedAt might not exist
            attempts: 0,
            maxAttempts: 2,
            result: dbJob.results,
            error: dbJob.errorMessage,
            results: dbJob.results,
            resource: {
                id: dbJob.resource.id,
                title: dbJob.resource.title,
                courseTitle: dbJob.resource.course?.title,
                uploader: dbJob.resource.uploader.username
            },
            databaseStatus: {
                status: dbJob.status,
                progress: dbJob.progress,
                errorMessage: dbJob.errorMessage,
                results: dbJob.results,
                startedAt: dbJob.startedAt,
                completedAt: dbJob.completedAt
            }
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