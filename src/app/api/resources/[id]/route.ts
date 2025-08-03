import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const resourceId = parseInt(params.id);
        if (isNaN(resourceId)) {
            return NextResponse.json(
                { error: 'Invalid resource ID' },
                { status: 400 }
            );
        }

        const resource = await db.resource.findUnique({
            where: {
                id: resourceId
            },
            include: {
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
                uploader: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        if (!resource) {
            return NextResponse.json(
                { error: 'Resource not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(resource);
    } catch (error) {
        console.error('Error fetching resource:', error);
        return NextResponse.json(
            { error: 'Failed to fetch resource' },
            { status: 500 }
        );
    }
}