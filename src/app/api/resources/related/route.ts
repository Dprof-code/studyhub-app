import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');
        const tags = searchParams.get('tags')?.split(',') || [];
        const exclude = searchParams.get('exclude');
        const limit = parseInt(searchParams.get('limit') || '6', 10);

        // Build the where clause for the query
        const where: any = {
            // Exclude the current resource
            NOT: { id: parseInt(exclude!, 10) },
        };

        // If courseId is provided, prioritize resources from the same course
        if (courseId) {
            where.OR = [
                { courseId: parseInt(courseId, 10) },
                {
                    AND: [
                        { tags: { some: { name: { in: tags } } } },
                        { NOT: { courseId: parseInt(courseId, 10) } },
                    ],
                },
            ];
        } else if (tags.length > 0) {
            // If no courseId, just use tags
            where.tags = { some: { name: { in: tags } } };
        }

        const resources = await db.resource.findMany({
            where,
            take: limit,
            orderBy: [
                // If courseId exists, prioritize resources from same course
                ...(courseId ? [{ courseId: 'desc' as const }] : []),
                // Then by tag match count (descending)
                {
                    tags: {
                        _count: 'desc' as const,
                    },
                },
                // Finally by creation date
                { createdAt: 'desc' as const },
            ],
            select: {
                id: true,
                title: true,
                description: true,
                fileUrl: true,
                fileType: true,
                createdAt: true,
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                uploader: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        Report: true,
                    },
                },
            },
        });

        // Filter out resources with reports
        const filteredResources = resources.filter(
            resource => resource._count.Report === 0
        );

        return NextResponse.json(filteredResources);
    } catch (error) {
        console.error('Error fetching related resources:', error);
        return NextResponse.json(
            { error: 'Failed to fetch related resources' },
            { status: 500 }
        );
    }
}