import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: Request,
    { params }: { params: { code: string } }
) {
    try {
        const members = await db.courseEnrollment.findMany({
            where: {
                course: {
                    code: params.code,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstname: true,
                        lastname: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' },
                { user: { firstname: 'asc' } },
            ],
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}