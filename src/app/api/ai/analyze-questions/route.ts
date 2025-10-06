import { NextResponse } from 'next/server';
import { db } from '../../../../lib/dbconfig';
import { queueAIAnalysis } from '../../../../lib/queue/aiProcessors';

export async function POST(req: Request) {
    const { resourceId, analysisType = 'questions' } = await req.json();

    // Get resource details including tags
    const resource = await db.resource.findUnique({
        where: { id: resourceId },
        include: { tags: true }
    });

    if (!resource) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Queue enhanced analysis with Document AI support
    const job = await queueAIAnalysis({
        resourceId,
        filePath: resource.fileUrl,
        fileType: resource.fileType,
        analysisType, // 'questions', 'content', or 'all'
        tags: resource.tags.map(t => t.name),
        enableAIAnalysis: true
    });

    return NextResponse.json({
        jobId: job.id,
        message: 'Enhanced AI analysis with Document AI started',
        analysisType,
        documentAIEnabled: true
    });
}