import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

const RespondSchema = z.object({
    action: z.enum(['accept', 'reject'])
});

// Helper function to format user name from database fields
function formatUserName(user: any): string {
    if (user.name) return user.name;
    if (user.firstname && user.lastname) return `${user.firstname} ${user.lastname}`;
    if (user.firstname) return user.firstname;
    if (user.lastname) return user.lastname;
    return 'Unknown User';
}

// Helper function to get user avatar
function getUserAvatar(user: any): string | null {
    return user.avatarUrl || user.avatar || null;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
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

        const { matchId } = await params;
        const body = await request.json();
        const { action } = RespondSchema.parse(body);

        // Find the pending match where current user is the matchedUser (recipient)
        const pendingMatch = await db.match.findFirst({
            where: {
                id: matchId,
                matchedUserId: userId,
                status: 'pending'
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
                        department: true,
                        year: true
                    }
                },
                matchedUser: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        name: true,
                        avatarUrl: true,
                        avatar: true,
                        department: true,
                        year: true
                    }
                }
            }
        });

        if (!pendingMatch) {
            return NextResponse.json(
                { error: 'Pending match not found or not authorized' },
                { status: 404 }
            );
        }

        if (action === 'reject') {
            // Delete the pending match
            await db.match.delete({
                where: { id: matchId }
            });

            return NextResponse.json({
                success: true,
                action: 'rejected',
                message: 'Match request declined'
            });
        }

        if (action === 'accept') {
            // Create chat room for the mutual match
            const chatRoom = await db.chatRoom.create({
                data: {
                    name: `Study Group: ${formatUserName(pendingMatch.user)} & ${formatUserName(pendingMatch.matchedUser)}`,
                    type: 'direct',
                    members: {
                        connect: [
                            { id: pendingMatch.userId },
                            { id: pendingMatch.matchedUserId }
                        ]
                    }
                },
                include: {
                    members: {
                        select: {
                            id: true,
                            firstname: true,
                            lastname: true,
                            name: true,
                            avatarUrl: true,
                            avatar: true
                        }
                    }
                }
            });

            // Update the existing match to connected status
            const updatedMatch = await db.match.update({
                where: { id: matchId },
                data: {
                    status: 'connected',
                    chatRoomId: chatRoom.id,
                    connectedAt: new Date()
                }
            });

            // Create the reciprocal match
            await db.match.create({
                data: {
                    userId: pendingMatch.matchedUserId,
                    matchedUserId: pendingMatch.userId,
                    status: 'connected',
                    chatRoomId: chatRoom.id,
                    connectedAt: new Date()
                }
            });

            // Get both users' match requests and mark them as matched
            const userRequests = await db.matchRequest.findMany({
                where: {
                    OR: [
                        { userId: pendingMatch.userId, status: 'active' },
                        { userId: pendingMatch.matchedUserId, status: 'active' }
                    ]
                }
            });

            // Mark all their match requests as matched (they found each other)
            if (userRequests.length > 0) {
                await Promise.all(
                    userRequests.map(req =>
                        db.matchRequest.update({
                            where: { id: req.id },
                            data: { status: 'matched' }
                        })
                    )
                );
            }

            return NextResponse.json({
                success: true,
                action: 'accepted',
                match: {
                    id: updatedMatch.id,
                    user: {
                        id: pendingMatch.user.id,
                        name: formatUserName(pendingMatch.user),
                        avatar: getUserAvatar(pendingMatch.user),
                        department: pendingMatch.user.department,
                        year: pendingMatch.user.year
                    },
                    chatRoomId: chatRoom.id,
                    connectedAt: updatedMatch.connectedAt
                },
                chatRoom: {
                    id: chatRoom.id,
                    name: chatRoom.name
                }
            });
        }

    } catch (error) {
        console.error('Error responding to match:', error);

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