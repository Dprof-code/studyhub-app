/**
 * Real-time Collaboration Service
 * Phase 5C: Advanced Features & Optimization
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { classNames } from '@/lib/utils';

// Collaboration event types
export type CollaborationEvent =
    | 'user-join'
    | 'user-leave'
    | 'cursor-move'
    | 'concept-select'
    | 'chat-message'
    | 'study-session-start'
    | 'study-session-pause'
    | 'question-attempt'
    | 'plan-update'
    | 'annotation-create';

export interface CollaborationUser {
    id: string;
    name: string;
    avatar?: string;
    role: 'student' | 'tutor' | 'admin';
    status: 'online' | 'away' | 'busy';
    lastSeen: Date;
    currentActivity?: {
        type: 'studying' | 'chatting' | 'planning' | 'analyzing';
        details: string;
    };
}

export interface CollaborationState {
    sessionId: string;
    users: CollaborationUser[];
    isConnected: boolean;
    currentUser?: CollaborationUser;
    sharedContext?: {
        type: 'course' | 'concept' | 'question' | 'study-plan';
        id: string;
        name: string;
    };
}

interface UseCollaborationProps {
    roomId: string;
    roomType: 'study-session' | 'concept-map' | 'chat' | 'planning';
    enabled?: boolean;
}

export function useCollaboration({
    roomId,
    roomType,
    enabled = true
}: UseCollaborationProps) {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<typeof Socket | null>(null);
    const [collaborationState, setCollaborationState] = useState<CollaborationState>({
        sessionId: '',
        users: [],
        isConnected: false
    });

    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        if (!enabled || !session?.user || !roomId) return;

        // Initialize socket connection
        const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
            auth: {
                token: session.user.id,
                roomId,
                roomType
            },
            transports: ['websocket'],
            upgrade: true
        });

        socketInstance.on('connect', () => {
            console.log('Connected to collaboration service');
            setCollaborationState(prev => ({
                ...prev,
                isConnected: true,
                sessionId: socketInstance.id
            }));
            reconnectAttempts.current = 0;
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from collaboration service');
            setCollaborationState(prev => ({
                ...prev,
                isConnected: false
            }));
        });

        socketInstance.on('connect_error', (error: Error) => {
            console.error('Collaboration connection error:', error);

            // Implement exponential backoff for reconnection
            if (reconnectAttempts.current < maxReconnectAttempts) {
                const delay = Math.pow(2, reconnectAttempts.current) * 1000;
                setTimeout(() => {
                    reconnectAttempts.current++;
                    socketInstance.connect();
                }, delay);
            }
        });

        // Handle room events
        socketInstance.on('room-joined', (data: { users: CollaborationUser[], currentUser: CollaborationUser }) => {
            setCollaborationState(prev => ({
                ...prev,
                users: data.users,
                currentUser: data.currentUser
            }));
        });

        socketInstance.on('user-joined', (user: CollaborationUser) => {
            setCollaborationState(prev => ({
                ...prev,
                users: [...prev.users.filter(u => u.id !== user.id), user]
            }));
        });

        socketInstance.on('user-left', (userId: string) => {
            setCollaborationState(prev => ({
                ...prev,
                users: prev.users.filter(u => u.id !== userId)
            }));
        });

        socketInstance.on('user-activity-update', (data: { userId: string, activity: CollaborationUser['currentActivity'] }) => {
            setCollaborationState(prev => ({
                ...prev,
                users: prev.users.map(u =>
                    u.id === data.userId
                        ? { ...u, currentActivity: data.activity }
                        : u
                )
            }));
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [enabled, session, roomId, roomType]);

    // Join a collaboration room
    const joinRoom = (contextData?: CollaborationState['sharedContext']) => {
        if (socket && socket.connected) {
            socket.emit('join-room', {
                roomId,
                roomType,
                context: contextData,
                userInfo: {
                    name: session?.user?.name,
                    avatar: session?.user?.image,
                    role: 'student' // Default role
                }
            });

            setCollaborationState(prev => ({
                ...prev,
                sharedContext: contextData
            }));
        }
    };

    // Leave collaboration room
    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave-room', { roomId });
        }
    };

    // Send collaboration event
    const sendEvent = (event: CollaborationEvent, data: any) => {
        if (socket && socket.connected) {
            socket.emit('collaboration-event', {
                roomId,
                event,
                data,
                timestamp: new Date().toISOString(),
                userId: session?.user?.id
            });
        }
    };

    // Update user activity
    const updateActivity = (activity: CollaborationUser['currentActivity']) => {
        if (socket && socket.connected) {
            socket.emit('update-activity', {
                roomId,
                activity
            });
        }
    };

    // Send cursor position (for visual collaboration)
    const sendCursorPosition = (x: number, y: number, element?: string) => {
        if (socket && socket.connected) {
            socket.emit('cursor-move', {
                roomId,
                x,
                y,
                element,
                userId: session?.user?.id
            });
        }
    };

    // Send shared annotation
    const sendAnnotation = (annotation: {
        type: 'highlight' | 'note' | 'question';
        target: string;
        content: string;
        position?: { x: number; y: number };
    }) => {
        sendEvent('annotation-create', annotation);
    };

    return {
        ...collaborationState,
        joinRoom,
        leaveRoom,
        sendEvent,
        updateActivity,
        sendCursorPosition,
        sendAnnotation,
        socket
    };
}

// Real-time cursor component
export function CollaborationCursors({
    users,
    currentUserId
}: {
    users: CollaborationUser[];
    currentUserId?: string;
}) {
    const [cursors, setCursors] = useState<Map<string, { x: number; y: number; user: CollaborationUser }>>(new Map());

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Broadcast current user's cursor position
            // This would be connected to the collaboration socket
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from(cursors.entries()).map(([userId, cursor]) => {
                if (userId === currentUserId) return null;

                return (
                    <div
                        key={userId}
                        className="absolute transform -translate-x-1 -translate-y-1 transition-all duration-75 ease-out"
                        style={{
                            left: cursor.x,
                            top: cursor.y
                        }}
                    >
                        {/* Cursor pointer */}
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            className="fill-blue-500 drop-shadow-sm"
                        >
                            <path d="M5.65 2.1a1 1 0 0 1 1.7-.7l14.5 14.5a1 1 0 0 1-.7 1.7H15c-.4 0-.8.2-1 .5l-3 4a1 1 0 0 1-1.6 0l-3-4c-.2-.3-.6-.5-1-.5H.85a1 1 0 0 1-.7-1.7L14.65 1.4z" />
                        </svg>

                        {/* User info tooltip */}
                        <div className="absolute left-6 top-0 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                            {cursor.user.name}
                            {cursor.user.currentActivity && (
                                <div className="text-blue-100 text-xs">
                                    {cursor.user.currentActivity.type}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Active users panel component
export function ActiveUsersPanel({
    users,
    currentUserId,
    onUserClick
}: {
    users: CollaborationUser[];
    currentUserId?: string;
    onUserClick?: (user: CollaborationUser) => void;
}) {
    const onlineUsers = users.filter(u => u.status === 'online');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Active Users ({onlineUsers.length})
            </h3>

            <div className="space-y-2">
                {onlineUsers.map((user) => (
                    <div
                        key={user.id}
                        className={classNames(
                            'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                            user.id === currentUserId
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                        onClick={() => onUserClick?.(user)}
                    >
                        {/* Avatar */}
                        <div className="relative">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Status indicator */}
                            <div className={classNames(
                                'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
                                user.status === 'online' ? 'bg-green-500' :
                                    user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                            )} />
                        </div>

                        {/* User info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name}
                                {user.id === currentUserId && ' (You)'}
                            </p>
                            {user.currentActivity && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user.currentActivity.details}
                                </p>
                            )}
                        </div>

                        {/* Role badge */}
                        <span className={classNames(
                            'px-2 py-1 text-xs rounded-full',
                            user.role === 'tutor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        )}>
                            {user.role}
                        </span>
                    </div>
                ))}

                {onlineUsers.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No active users
                    </p>
                )}
            </div>
        </div>
    );
}

// Shared annotations component
export function SharedAnnotations({
    annotations,
    onAnnotationClick
}: {
    annotations: Array<{
        id: string;
        type: 'highlight' | 'note' | 'question';
        content: string;
        position: { x: number; y: number };
        user: CollaborationUser;
        timestamp: Date;
    }>;
    onAnnotationClick?: (annotation: any) => void;
}) {
    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            {annotations.map((annotation) => (
                <div
                    key={annotation.id}
                    className="absolute pointer-events-auto"
                    style={{
                        left: annotation.position.x,
                        top: annotation.position.y
                    }}
                >
                    <div
                        className={classNames(
                            'w-4 h-4 rounded-full cursor-pointer shadow-lg',
                            annotation.type === 'highlight' ? 'bg-yellow-400' :
                                annotation.type === 'note' ? 'bg-blue-400' : 'bg-purple-400'
                        )}
                        onClick={() => onAnnotationClick?.(annotation)}
                    />
                </div>
            ))}
        </div>
    );
}