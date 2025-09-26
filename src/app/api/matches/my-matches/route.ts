import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/dbconfig';

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

/**
 * GET /api/matches/my-matches
 * Get user's matches (both pending requests they received and connected matches)
 */
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

        // Get pending match requests that others sent to this user
        const incomingRequests = await db.match.findMany({
            where: {
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
                        faculty: true,
                        year: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Get connected matches (mutual matches with chat rooms)
        const connectedMatches = await db.match.findMany({
            where: {
                OR: [
                    { userId: userId, status: 'connected' },
                    { matchedUserId: userId, status: 'connected' }
                ]
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
                        faculty: true,
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
                        faculty: true,
                        year: true
                    }
                },
                chatRoom: {
                    select: {
                        id: true,
                        name: true,
                        updatedAt: true,
                        _count: {
                            select: {
                                messages: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                connectedAt: 'desc'
            }
        });

        // Format incoming requests
        const formattedIncomingRequests = incomingRequests.map(match => ({
            id: match.id,
            type: 'pending_incoming',
            user: {
                id: match.user.id,
                name: formatUserName(match.user),
                avatar: getUserAvatar(match.user),
                department: match.user.department,
                faculty: match.user.faculty,
                year: match.user.year
            },
            message: match.message,
            createdAt: match.createdAt
        }));

        // Format connected matches
        const formattedConnectedMatches = connectedMatches.map(match => {
            // Determine the other user (not the current user)
            const otherUser = match.userId === userId ? match.matchedUser : match.user;

            return {
                id: match.id,
                type: 'connected',
                user: {
                    id: otherUser.id,
                    name: formatUserName(otherUser),
                    avatar: getUserAvatar(otherUser),
                    department: otherUser.department,
                    faculty: otherUser.faculty,
                    year: otherUser.year
                },
                chatRoom: match.chatRoom ? {
                    id: match.chatRoom.id,
                    name: match.chatRoom.name,
                    lastMessageAt: match.chatRoom.updatedAt,
                    messageCount: match.chatRoom._count.messages
                } : null,
                connectedAt: match.connectedAt,
                createdAt: match.createdAt
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                incomingRequests: formattedIncomingRequests,
                connectedMatches: formattedConnectedMatches,
                summary: {
                    pendingCount: formattedIncomingRequests.length,
                    connectedCount: formattedConnectedMatches.length,
                    totalMatches: formattedIncomingRequests.length + formattedConnectedMatches.length
                }
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