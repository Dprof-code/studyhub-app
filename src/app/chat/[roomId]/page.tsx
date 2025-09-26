'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useChatSocket } from '@/hooks/useChatSocket';

import ChatHeader from '@/components/chat/ChatHeader';
import MessageBubble from '@/components/chat/MessageBubble';
import EmojiPicker from '@/components/chat/EmojiPicker';
import AttachmentButton from '@/components/chat/AttachmentButton';

interface ChatMessage {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    type?: 'text' | 'image' | 'file';
}

interface ChatParticipant {
    id: string;
    name: string;
    avatar: string;
    status?: 'online' | 'offline';
}

interface ChatRoomData {
    id: string;
    participants: ChatParticipant[];
    messages: ChatMessage[];
}

export default function ChatRoomPage() {
    const params = useParams();
    const { data: session } = useSession();
    const roomId = params.roomId as string;

    const [room, setRoom] = useState<ChatRoomData | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const socket = useChatSocket(roomId);

    const fetchChatRoom = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/chat/${roomId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch chat room');
            }

            const data = await response.json();

            // Transform API data to match component interfaces
            const transformedMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId.toString(),
                senderName: msg.sender?.name || 'Unknown User',
                timestamp: msg.createdAt,
                type: 'text'
            }));

            const transformedParticipants: ChatParticipant[] = (data.chatRoom.members || []).map((member: any) => ({
                id: member.id.toString(),
                name: member.name || 'Unknown User',
                avatar: member.avatar || '/avatar.jpg',
                status: 'online' // You can implement real status later
            }));

            // Combine chatRoom data with messages and participants
            const roomData: ChatRoomData = {
                id: data.chatRoom.id,
                participants: transformedParticipants,
                messages: transformedMessages
            };

            setRoom(roomData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => {
        if (roomId) {
            fetchChatRoom();
        }
    }, [roomId, fetchChatRoom]);

    useEffect(() => {
        if (socket && roomId) {
            console.log('Setting up socket listeners for room:', roomId);
            console.log('Socket connected:', socket.connected);

            socket.on('new-message', (newMessage: any) => {
                console.log('🔥 Received new message via socket:', newMessage);

                // Transform the new message to match our interface
                const transformedMessage: ChatMessage = {
                    id: newMessage.id,
                    content: newMessage.content,
                    senderId: newMessage.senderId.toString(),
                    senderName: newMessage.sender?.name || 'Unknown User',
                    timestamp: newMessage.createdAt,
                    type: 'text'
                };

                console.log('🔥 Adding message to room state:', transformedMessage);

                setRoom(prev => {
                    if (!prev) {
                        console.log('🔥 Room state is null, cannot add message');
                        return null;
                    }

                    const updated = {
                        ...prev,
                        messages: [...prev.messages, transformedMessage]
                    };

                    console.log('🔥 Updated room state with', updated.messages.length, 'messages');
                    return updated;
                });
            });

            // Add a test listener to verify socket is working
            socket.on('connect', () => {
                console.log('🔥 Socket connected in chat page');
            });

            socket.on('disconnect', () => {
                console.log('🔥 Socket disconnected in chat page');
            });

            return () => {
                console.log('🔥 Cleaning up socket listeners');
                socket.off('new-message');
                socket.off('connect');
                socket.off('disconnect');
            };
        }
    }, [socket, roomId]); async function sendMessage() {
        if (!message.trim() || !session?.user?.id || !room) return;

        try {
            const response = await fetch(`/api/chat/${roomId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: message.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();

            // Add the new message to the local state immediately
            if (data.success && data.message) {
                const newMessage: ChatMessage = {
                    id: data.message.id,
                    content: data.message.content,
                    senderId: data.message.sender.id.toString(),
                    senderName: data.message.sender.name || 'You',
                    timestamp: data.message.createdAt,
                    type: data.message.type || 'text'
                };

                setRoom(prev => prev ? {
                    ...prev,
                    messages: [...prev.messages, newMessage]
                } : null);
            }

            setMessage('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading chat...</p>
                </div>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="text-red-500 mb-4">
                        <span className="material-symbols-outlined text-6xl">error</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load chat</h2>
                    <p className="text-gray-600">{error || 'Chat room not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-white rounded-lg shadow-lg overflow-hidden mx-4 my-4">
            <div className="flex-1 flex flex-col">
                <ChatHeader participants={room.participants} />
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {room.messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === session?.user?.id}
                        />
                    ))}
                </div>
                <div className="flex items-center p-4 border-t bg-white">
                    <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />
                    <input
                        className="flex-1 form-input mx-2"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message…"
                    />
                    <AttachmentButton />
                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className="btn-primary ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}