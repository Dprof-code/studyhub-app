import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { db } from '../../../../lib/dbconfig';
import { queueAIAnalysis, AnalyzeDocumentJobData } from '../../../../lib/queue/aiProcessors';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { resourceId, enableAIAnalysis = true } = body;

        if (!resourceId) {
            return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
        }

        // Get resource details
        const resource = await db.resource.findUnique({
            where: { id: resourceId },
            include: {
                course: {
                    include: { department: true }
                },
                uploader: true
            }
        });

        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        // Check if user has access to this resource or is the uploader
        if (resource.uploader.id.toString() !== session.user.id) {
            // Add additional access control logic here if needed
            // For now, we'll allow any authenticated user to analyze
        }

        // Check if already being processed
        const existingJob = await db.aIProcessingJob.findFirst({
            where: {
                resourceId: resource.id,
                status: { in: ['PENDING', 'PROCESSING'] }
            }
        });

        if (existingJob) {
            return NextResponse.json({
                jobId: existingJob.id,
                status: existingJob.status,
                message: 'Analysis already in progress'
            });
        }

        // Prepare job data
        const jobData: AnalyzeDocumentJobData = {
            resourceId: resource.id,
            filePath: resource.fileUrl, // Cloudinary URL or local path
            fileType: resource.fileType,
            enableAIAnalysis
        };

        // Queue the analysis job
        const job = await queueAIAnalysis(jobData);

        return NextResponse.json({
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            message: 'AI analysis queued successfully. Check processing status for updates.'
        });

    } catch (error) {
        console.error('Error starting AI analysis:', error);
        return NextResponse.json(
            { error: 'Failed to start AI analysis' },
            { status: 500 }
        );
    }
}