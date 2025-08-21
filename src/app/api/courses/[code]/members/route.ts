import { NextResponse } from 'next/server';
import { db } from '@/lib/dbconfig';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        // Get course first
        const course = await db.course.findUnique({
            where: { code },
            include: {
                department: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                username: true,
                                firstname: true,
                                lastname: true,
                                avatarUrl: true,
                                role: true,
                            },
                        },
                    },
                },
            },
        });

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // Transform the data to match expected format
        const members = course.department.users.map(user => ({
            user,
            role: user.role,
        }));

        return NextResponse.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}