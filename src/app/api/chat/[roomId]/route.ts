import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from "@/lib/dbconfig";
import { authOptions } from '@/lib/auth';

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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
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

        const { roomId } = await params;

        // Get chat room with member verification
        const chatRoom = await db.chatRoom.findUnique({
            where: {
                id: roomId
            },
            include: {
                members: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        name: true,
                        avatarUrl: true,
                        avatar: true,
                        department: true,
                        year: true,
                        lastSeen: true
                    }
                },
                messages: {
                    take: 50, // Load last 50 messages
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                name: true,
                                avatarUrl: true,
                                avatar: true
                            }
                        },
                        attachments: true
                    }
                },
                _count: {
                    select: {
                        messages: true
                    }
                }
            }
        });

        if (!chatRoom) {
            return NextResponse.json(
                { error: 'Chat room not found' },
                { status: 404 }
            );
        }

        // Verify user is a member of this chat room
        const isMember = chatRoom.members.some((member: any) => member.id === userId);
        if (!isMember) {
            return NextResponse.json(
                { error: 'Access denied - not a member of this chat room' },
                { status: 403 }
            );
        }

        // Reverse messages to show oldest first
        const messages = chatRoom.messages.reverse();

        // Get related match information
        const relatedMatch = await db.match.findFirst({
            where: {
                chatRoomId: roomId,
                OR: [
                    { userId: userId },
                    { matchedUserId: userId }
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
                        department: true
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
                        department: true
                    }
                }
            }
        });

        // Update user's last seen in this room
        await db.user.update({
            where: { id: userId },
            data: { lastSeen: new Date() }
        });

        // Format members with correct field names
        const formattedMembers = chatRoom.members.map(member => ({
            id: member.id,
            name: formatUserName(member),
            avatar: getUserAvatar(member),
            department: member.department,
            year: member.year,
            lastSeen: member.lastSeen
        }));

        // Format messages with correct sender field names
        const formattedMessages = messages.map(msg => ({
            ...msg,
            sender: {
                id: msg.sender.id,
                name: formatUserName(msg.sender),
                avatar: getUserAvatar(msg.sender)
            }
        }));

        return NextResponse.json({
            chatRoom: {
                id: chatRoom.id,
                name: chatRoom.name,
                type: chatRoom.type,
                createdAt: chatRoom.createdAt,
                members: formattedMembers,
                messageCount: chatRoom._count.messages
            },
            messages: formattedMessages,
            relatedMatch: relatedMatch ? {
                id: relatedMatch.id,
                connectedAt: relatedMatch.connectedAt,
                participants: [
                    {
                        id: relatedMatch.user.id,
                        name: formatUserName(relatedMatch.user),
                        avatar: getUserAvatar(relatedMatch.user),
                        department: relatedMatch.user.department
                    },
                    {
                        id: relatedMatch.matchedUser.id,
                        name: formatUserName(relatedMatch.matchedUser),
                        avatar: getUserAvatar(relatedMatch.matchedUser),
                        department: relatedMatch.matchedUser.department
                    }
                ]
            } : null
        });

    } catch (error) {
        console.error('Error fetching chat room:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}