import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export function useSocket(threadId: number) {
    const socketRef = useRef<typeof Socket | null>(null);

    useEffect(() => {
        // Initialize socket connection
        if (!socketRef.current) {
            socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
                path: '/api/socketio',
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
            });

            socketRef.current.on('connect', () => {
                console.log('Socket connected');
            });

            socketRef.current.on('connect_error', (error: Error) => {
                console.error('Socket connection error:', error);
            });
        }

        // Join thread room
        if (socketRef.current) {
            socketRef.current.emit('join-thread', threadId);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-thread', threadId);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [threadId]);

    return socketRef.current;
}