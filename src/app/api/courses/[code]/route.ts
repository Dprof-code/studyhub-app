import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";

export async function GET(
    req: Request,
    { params }: { params: { code: string } }
) {
    try {
        const course = await db.course.findUnique({
            where: { code: params.code },
            include: {
                department: {
                    include: {
                        faculty: true,
                    },
                },
                synopsisHistory: {
                    include: {
                        user: {
                            select: {
                                firstname: true,
                                lastname: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}