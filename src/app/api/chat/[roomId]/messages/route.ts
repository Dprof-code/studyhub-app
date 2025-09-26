import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from "@/lib/dbconfig";
import { authOptions } from '@/lib/auth';
import { getIO } from '@/lib/socketio';

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

const SendMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    type: z.enum(['text', 'image', 'file']).default('text'),
    attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number()
    })).optional().default([])
});

export async function POST(
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
        const body = await request.json();
        const { content, type, attachments } = SendMessageSchema.parse(body);

        // Verify user is a member of this chat room
        const chatRoom = await db.chatRoom.findUnique({
            where: {
                id: roomId
            },
            include: {
                members: {
                    where: {
                        id: userId
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

        if (chatRoom.members.length === 0) {
            return NextResponse.json(
                { error: 'Access denied - not a member of this chat room' },
                { status: 403 }
            );
        }

        // Create the message
        const message = await db.chatMessage.create({
            data: {
                content,
                type,
                senderId: userId,
                chatRoomId: roomId,
                attachments: attachments.length > 0 ? {
                    create: attachments.map(attachment => ({
                        name: attachment.name,
                        url: attachment.url,
                        type: attachment.type,
                        size: attachment.size
                    }))
                } : undefined
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
        });

        // Update chat room's last activity
        await db.chatRoom.update({
            where: { id: roomId },
            data: {
                lastActivity: new Date()
            }
        });

        // Emit real-time message to all room members via Socket.IO
        const io = getIO();
        console.log('Socket IO instance:', io ? 'Available' : 'Not available');

        if (io) {
            const messageData = {
                id: message.id,
                content: message.content,
                type: message.type,
                senderId: message.sender.id,
                sender: {
                    id: message.sender.id,
                    name: formatUserName(message.sender),
                    avatar: getUserAvatar(message.sender)
                },
                createdAt: message.createdAt,
                chatRoomId: message.chatRoomId,
                attachments: message.attachments
            };

            // Emit to all clients in this room
            const roomName = `room-${roomId}`;
            console.log(`Emitting message to ${roomName}:`, messageData.id);
            console.log('Connected clients in room:', io.sockets.adapter.rooms.get(roomName)?.size || 0);

            io.to(roomName).emit('new-message', messageData);
        } else {
            console.error('Socket.IO not available - message not broadcast');
        }

        // Get all room members for real-time notifications (excluding sender)
        const roomMembers = await db.chatRoom.findUnique({
            where: { id: roomId },
            include: {
                members: {
                    where: {
                        id: {
                            not: userId
                        }
                    },
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: {
                id: message.id,
                content: message.content,
                type: message.type,
                createdAt: message.createdAt,
                sender: {
                    id: message.sender.id,
                    name: formatUserName(message.sender),
                    avatar: getUserAvatar(message.sender)
                },
                attachments: message.attachments,
                chatRoomId: message.chatRoomId
            },
            roomMembers: (roomMembers?.members || []).map(member => ({
                id: member.id,
                name: formatUserName(member),
                email: member.email
            }))
        });

    } catch (error) {
        console.error('Error sending message:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid message data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
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
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const before = url.searchParams.get('before'); // Message ID for pagination

        // Verify user is a member of this chat room
        const chatRoom = await db.chatRoom.findUnique({
            where: {
                id: roomId
            },
            include: {
                members: {
                    where: {
                        id: userId
                    }
                }
            }
        });

        if (!chatRoom || chatRoom.members.length === 0) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Build query conditions
        const whereConditions: any = {
            chatRoomId: roomId
        };

        if (before) {
            whereConditions.id = {
                lt: before
            };
        }

        // Get messages with pagination
        const messages = await db.chatMessage.findMany({
            where: whereConditions,
            take: limit,
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
        });

        // Reverse to show oldest first and transform data
        const orderedMessages = messages.reverse().map(message => ({
            id: message.id,
            content: message.content,
            type: message.type || 'text',
            createdAt: message.createdAt,
            senderId: message.senderId.toString(),
            senderName: formatUserName(message.sender),
            timestamp: message.createdAt.toISOString(),
            sender: {
                id: message.sender.id,
                name: formatUserName(message.sender),
                avatar: getUserAvatar(message.sender)
            },
            attachments: message.attachments
        }));

        return NextResponse.json({
            messages: orderedMessages,
            pagination: {
                page,
                limit,
                hasMore: messages.length === limit
            }
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}