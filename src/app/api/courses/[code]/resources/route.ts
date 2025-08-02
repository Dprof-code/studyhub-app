import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: Request,
    { params }: { params: { code: string } }
) {
    try {
        const resources = await db.resource.findMany({
            where: {
                course: {
                    code: params.code,
                },
            },
            include: {
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
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(resources);
    } catch (error) {
        console.error('Error fetching resources:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}