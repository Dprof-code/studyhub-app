import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/dbconfig';
import { authOptions } from '@/lib/auth';

const MatchRequestSchema = z.object({
    subjects: z.array(z.string()).min(1),
    availability: z.array(z.string()).min(1),
    studyFormat: z.enum(['online', 'in_person', 'hybrid']),
    maxGroupSize: z.number().min(2).max(10).optional().default(4),
    studyLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    preferredGender: z.enum(['any', 'same', 'opposite']).optional().default('any'),
    locationPreference: z.string().optional(),
    additionalNotes: z.string().optional(),
    stayAvailable: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        if (isNaN(userId)) {
            return NextResponse.json(
                { error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validatedData = MatchRequestSchema.parse(body);

        // Create new match request (users can have multiple active requests for different subjects/contexts)
        const matchRequest = await db.matchRequest.create({
            data: {
                userId: userId,
                subjects: validatedData.subjects,
                availability: validatedData.availability,
                studyFormat: validatedData.studyFormat,
                maxGroupSize: validatedData.maxGroupSize,
                studyLevel: validatedData.studyLevel,
                preferredGender: validatedData.preferredGender,
                locationPreference: validatedData.locationPreference,
                additionalNotes: validatedData.additionalNotes,
                stayAvailable: validatedData.stayAvailable ?? false,
                status: 'active'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        year: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            matchRequest
        });

    } catch (error) {
        console.error('Error creating match request:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        if (isNaN(userId)) {
            return NextResponse.json(
                { error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        const matchRequests = await db.matchRequest.findMany({
            where: {
                userId: userId,
                status: 'active'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        year: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({
            matchRequests
        });

    } catch (error) {
        console.error('Error fetching match request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}