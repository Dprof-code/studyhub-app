import { NextResponse } from "next/server";
import { db } from "@/lib/dbconfig";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const profileUpdateSchema = z.object({
    firstname: z.string().min(2),
    lastname: z.string().min(2),
    username: z.string().min(3),
    email: z.string().email(),
    bio: z.string().max(160).optional(),
    faculty: z.object({
        name: z.string().min(2),
        id: z.number().optional()
    }),
    department: z.object({
        name: z.string().min(2),
        id: z.number().optional()
    }),
    level: z.number().min(1).max(6).optional(),
});

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = profileUpdateSchema.parse(body);

        // Find or create faculty
        let faculty = await db.faculty.findFirst({
            where: {
                name: {
                    equals: validatedData.faculty.name,
                    mode: 'insensitive',
                },
            },
        });

        if (!faculty) {
            faculty = await db.faculty.create({
                data: {
                    name: validatedData.faculty.name,
                },
            });
        }

        // Find or create department
        let department = await db.department.findFirst({
            where: {
                AND: [
                    {
                        name: {
                            equals: validatedData.department.name,
                            mode: 'insensitive',
                        },
                    },
                    { facultyId: faculty.id },
                ],
            },
        });

        if (!department) {
            department = await db.department.create({
                data: {
                    name: validatedData.department.name,
                    code: validatedData.department.name.substring(0, 3).toUpperCase(),
                    facultyId: faculty.id,
                },
            });
        }

        // Update user profile
        const updatedUser = await db.user.update({
            where: { email: session.user.email! },
            data: {
                firstname: validatedData.firstname,
                lastname: validatedData.lastname,
                username: validatedData.username,
                bio: validatedData.bio,
                departmentId: department.id,
                level: validatedData.level,
                facultyId: faculty.id,
            },
            include: {
                department: {
                    include: {
                        faculty: true,
                    },
                },
            },
        });

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}