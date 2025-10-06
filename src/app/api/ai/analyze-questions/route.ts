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

    // Queue appropriate analysis based on resource type
    const job = await queueAIAnalysis({
        resourceId,
        filePath: resource.fileUrl,
        fileType: resource.fileType,
        analysisType, // 'questions' or 'content'
        tags: resource.tags.map(t => t.name),
        enableAIAnalysis: true
    });

    return NextResponse.json({ jobId: job.id });
}