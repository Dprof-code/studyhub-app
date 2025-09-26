import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

const MatchActionSchema = z.object({
    action: z.enum(['connect', 'skip']),
    message: z.string().optional()
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
        const { action, message } = MatchActionSchema.parse(body);

        // Get the match request to connect with
        const targetRequest = await db.matchRequest.findUnique({
            where: {
                id: matchId,
                status: 'active'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        name: true,
                        email: true,
                        department: true,
                        avatarUrl: true,
                        avatar: true
                    }
                }
            }
        });

        if (!targetRequest) {
            return NextResponse.json(
                { error: 'Match request not found' },
                { status: 404 }
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
                        firstname: true,
                        lastname: true,
                        name: true,
                        email: true,
                        department: true,
                        avatarUrl: true,
                        avatar: true
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

        if (action === 'skip') {
            // Simply return success for skip action
            // You might want to store skip history in a separate table
            return NextResponse.json({
                success: true,
                action: 'skipped'
            });
        }

        if (action === 'connect') {
            // Check if match already exists
            const existingMatch = await db.match.findFirst({
                where: {
                    OR: [
                        {
                            userId: userId,
                            matchedUserId: targetRequest.userId
                        },
                        {
                            userId: targetRequest.userId,
                            matchedUserId: userId
                        }
                    ]
                }
            });

            if (existingMatch) {
                return NextResponse.json(
                    { error: 'Match already exists' },
                    { status: 400 }
                );
            }

            // Check if the other user has already sent a connect request to us
            const mutualMatch = await db.match.findFirst({
                where: {
                    userId: targetRequest.userId,
                    matchedUserId: userId,
                    status: 'pending'
                }
            });

            if (mutualMatch) {
                // Mutual match! Update status and create chat room
                const chatRoom = await db.chatRoom.create({
                    data: {
                        name: `Study Group: ${formatUserName(userRequest.user)} & ${formatUserName(targetRequest.user)}`,
                        type: 'direct',
                        members: {
                            connect: [
                                { id: userId },
                                { id: targetRequest.userId }
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

                // Update the existing match status
                await db.match.update({
                    where: { id: mutualMatch.id },
                    data: {
                        status: 'connected',
                        chatRoomId: chatRoom.id,
                        connectedAt: new Date()
                    }
                });

                // Create the reciprocal match
                await db.match.create({
                    data: {
                        userId: userId,
                        matchedUserId: targetRequest.userId,
                        status: 'connected',
                        chatRoomId: chatRoom.id,
                        connectedAt: new Date(),
                        message
                    }
                });

                // Mark both match requests as matched
                await Promise.all([
                    db.matchRequest.update({
                        where: { id: userRequest.id },
                        data: { status: 'matched' }
                    }),
                    db.matchRequest.update({
                        where: { id: targetRequest.id },
                        data: { status: 'matched' }
                    })
                ]);

                return NextResponse.json({
                    success: true,
                    action: 'connected',
                    match: {
                        id: mutualMatch.id,
                        user: {
                            id: targetRequest.user.id,
                            name: formatUserName(targetRequest.user),
                            email: targetRequest.user.email,
                            department: targetRequest.user.department,
                            avatar: getUserAvatar(targetRequest.user)
                        },
                        chatRoomId: chatRoom.id,
                        connectedAt: new Date()
                    },
                    chatRoom
                });

            } else {
                // Create pending match request
                const match = await db.match.create({
                    data: {
                        userId: userId,
                        matchedUserId: targetRequest.userId,
                        status: 'pending',
                        message
                    },
                    include: {
                        matchedUser: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                name: true,
                                email: true,
                                department: true,
                                avatarUrl: true,
                                avatar: true
                            }
                        }
                    }
                });

                return NextResponse.json({
                    success: true,
                    action: 'pending',
                    match: {
                        id: match.id,
                        user: {
                            id: match.matchedUser.id,
                            name: formatUserName(match.matchedUser),
                            email: match.matchedUser.email,
                            department: match.matchedUser.department,
                            avatar: getUserAvatar(match.matchedUser)
                        },
                        status: 'pending',
                        message: match.message,
                        createdAt: match.createdAt
                    }
                });
            }
        }

    } catch (error) {
        console.error('Error processing match action:', error);

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

export async function DELETE(
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

        // Find the match request to delete
        const matchRequest = await db.matchRequest.findUnique({
            where: {
                id: matchId
            }
        });

        if (!matchRequest) {
            return NextResponse.json(
                { error: 'Match request not found' },
                { status: 404 }
            );
        }

        // Only allow user to delete their own request
        if (matchRequest.userId !== userId) {
            return NextResponse.json(
                { error: 'Not authorized to delete this request' },
                { status: 403 }
            );
        }

        // Delete the match request
        await db.matchRequest.delete({
            where: {
                id: matchId
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Match request deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting match request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}