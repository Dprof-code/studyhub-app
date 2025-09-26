import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { db } from '@/lib/dbconfig';

// Cosine similarity calculation for matching algorithm
function _calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length');
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + (a * vectorB[i]), 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + (a * a), 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + (b * b), 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

// Compatibility scoring algorithm
function calculateCompatibilityScore(userRequest: any, candidateRequest: any): number {
    let score = 0;

    // Subject overlap (40% weight)
    const userSubjects = new Set(userRequest.subjects);
    const candidateSubjects = new Set(candidateRequest.subjects);
    const commonSubjects = new Set([...userSubjects].filter(x => candidateSubjects.has(x)));
    const subjectScore = commonSubjects.size / Math.max(userSubjects.size, candidateSubjects.size);
    score += subjectScore * 0.4;

    // Availability overlap (30% weight)
    const userAvailability = new Set(userRequest.availability);
    const candidateAvailability = new Set(candidateRequest.availability);
    const commonAvailability = new Set([...userAvailability].filter(x => candidateAvailability.has(x)));
    const availabilityScore = commonAvailability.size / Math.max(userAvailability.size, candidateAvailability.size);
    score += availabilityScore * 0.3;

    // Department match (20% weight)
    const departmentScore = userRequest.user.department === candidateRequest.user.department ? 1 : 0;
    score += departmentScore * 0.2;

    // Study format compatibility (10% weight)
    const formatScore = userRequest.studyFormat === candidateRequest.studyFormat ||
        userRequest.studyFormat === 'hybrid' ||
        candidateRequest.studyFormat === 'hybrid' ? 1 : 0;
    score += formatScore * 0.1;

    return Math.round(score * 100); // Return as percentage
}

export async function GET(_request: NextRequest) {
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

        // Get user's active match request
        const userRequest = await db.matchRequest.findFirst({
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
                        year: true,
                        gender: true
                    }
                }
            }
        });

        if (!userRequest) {
            return NextResponse.json(
                { error: 'No active match request found' },
                { status: 404 }
            );
        }

        // Get potential matches (excluding user's own request and already matched users)
        const existingMatches = await db.match.findMany({
            where: {
                OR: [
                    { userId: userId },
                    { matchedUserId: userId }
                ]
            },
            select: {
                userId: true,
                matchedUserId: true
            }
        });

        const excludedUserIds = new Set([
            userId,
            ...existingMatches.map((match: any) => match.userId),
            ...existingMatches.map((match: any) => match.matchedUserId)
        ]);

        const candidateRequests = await db.matchRequest.findMany({
            where: {
                status: 'active',
                userId: {
                    notIn: Array.from(excludedUserIds)
                },
                // Allow matching with requests created before or after this one
                // This enables cross-matching between users with active requests
                NOT: {
                    id: userRequest.id
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        year: true,
                        gender: true,
                        avatar: true
                    }
                }
            }
        });

        // Apply gender preference filtering
        const filteredCandidates = candidateRequests.filter(candidate => {
            if (userRequest.preferredGender === 'any') return true;
            if (userRequest.preferredGender === 'same') {
                return userRequest.user.gender === candidate.user.gender;
            }
            if (userRequest.preferredGender === 'opposite') {
                return userRequest.user.gender !== candidate.user.gender;
            }
            return true;
        });

        // Calculate compatibility scores
        const matches = filteredCandidates.map(candidate => {
            const compatibilityScore = calculateCompatibilityScore(userRequest, candidate);

            return {
                id: candidate.id,
                user: candidate.user,
                subjects: candidate.subjects,
                availability: candidate.availability,
                studyFormat: candidate.studyFormat,
                studyLevel: candidate.studyLevel,
                locationPreference: candidate.locationPreference,
                additionalNotes: candidate.additionalNotes,
                compatibilityScore,
                commonSubjects: userRequest.subjects.filter(subject =>
                    candidate.subjects.includes(subject)
                ),
                commonAvailability: userRequest.availability.filter(slot =>
                    candidate.availability.includes(slot)
                )
            };
        });

        // Sort by compatibility score (highest first) and limit to top 10
        const sortedMatches = matches
            .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
            .slice(0, 10);

        return NextResponse.json({
            matches: sortedMatches,
            userRequest: {
                id: userRequest.id,
                subjects: userRequest.subjects,
                availability: userRequest.availability,
                studyFormat: userRequest.studyFormat,
                studyLevel: userRequest.studyLevel
            }
        });

    } catch (error) {
        console.error('Error fetching matches:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}