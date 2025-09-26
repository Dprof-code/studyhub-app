import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

/**
 * GET /api/matches/available
 * Fetch available students who have stayAvailable=true
 */
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

        // Fetch match requests where stayAvailable is true and not from current user
        const availableStudents = await db.matchRequest.findMany({
            where: {
                stayAvailable: true,
                status: 'active',
                userId: {
                    not: userId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        name: true,
                        avatarUrl: true,
                        avatar: true,
                        faculty: true,
                        department: true,
                        year: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform the data to match the expected format, with fallback for missing user data
        const formattedStudents = availableStudents.map(request => ({
            id: request.id,
            userId: request.userId,
            user: {
                id: request.user?.id || request.userId,
                // Use name field if available, otherwise combine firstname and lastname
                name: request.user?.name ||
                    (request.user?.firstname && request.user?.lastname
                        ? `${request.user.firstname} ${request.user.lastname}`
                        : request.user?.firstname || request.user?.lastname || `Student ${request.userId}`),
                // Use avatarUrl first, fallback to avatar field or default
                avatar: request.user?.avatarUrl || request.user?.avatar || '/avatar.jpg',
                faculty: request.user?.faculty || 'Faculty Not Set',
                department: request.user?.department || 'Department Not Set',
                year: request.user?.year || null
            },
            subjects: request.subjects,
            availability: request.availability,
            studyFormat: request.studyFormat,
            maxGroupSize: request.maxGroupSize,
            studyLevel: request.studyLevel,
            preferredGender: request.preferredGender,
            locationPreference: request.locationPreference,
            additionalNotes: request.additionalNotes,
            createdAt: request.createdAt
        }));

        return NextResponse.json({
            availableStudents: formattedStudents,
            total: formattedStudents.length
        });

    } catch (error) {
        console.error('Error fetching available students:', error);
        return NextResponse.json(
            { error: 'Failed to fetch available students' },
            { status: 500 }
        );
    }
}