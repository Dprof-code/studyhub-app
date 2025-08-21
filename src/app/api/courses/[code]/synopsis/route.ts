import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/dbconfig";
import { z } from "zod";

const synopsisSchema = z.object({
    synopsis: z.string().min(10).max(500),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { synopsis } = synopsisSchema.parse(body);

        // Get the course and user
        const course = await db.course.findUnique({
            where: { code: code },
        });

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Get user ID from session
        const user = await db.user.findUnique({
            where: { email: session.user.email! },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create a transaction to update synopsis and create history
        const result = await db.$transaction([
            // Update course synopsis
            db.course.update({
                where: { id: course.id },
                data: { synopsis },
            }),
            // Create history record
            db.courseSynopsisHistory.create({
                data: {
                    content: synopsis,
                    courseId: course.id,
                    userId: user.id,
                }
            })
        ]);

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error updating course synopsis:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get synopsis history
export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await db.course.findUnique({
            where: { code: code },
            include: {
                synopsisHistory: {
                    include: {
                        user: {
                            select: {
                                firstname: true,
                                lastname: true,
                                username: true,
                                avatarUrl: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        return NextResponse.json(course.synopsisHistory);
    } catch (error) {
        console.error('Error fetching synopsis history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}