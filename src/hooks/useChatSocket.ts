import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export function useChatSocket(roomId: string) {
    const socketRef = useRef<ReturnType<typeof io> | null>(null);

    useEffect(() => {
        // Initialize socket connection
        if (!socketRef.current) {
            console.log('Initializing socket connection to:', process.env.NEXT_PUBLIC_SOCKET_URL || 'default');

            socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
                path: '/api/socketio',
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                transports: ['polling', 'websocket'], // Try polling first
                forceNew: true,
                autoConnect: true
            });

            socketRef.current.on('connect', () => {
                console.log('Chat socket connected with ID:', socketRef.current?.id);
            });

            socketRef.current.on('connect_error', (error: Error) => {
                console.error('Chat socket connection error:', error);
            });

            socketRef.current.on('disconnect', (reason: string) => {
                console.log('Chat socket disconnected:', reason);
            });
        }

        // Join chat room
        if (socketRef.current && roomId) {
            socketRef.current.emit('join-room', roomId);
            console.log(`Emitted join-room for: ${roomId}`);
        }

        return () => {
            if (socketRef.current && roomId) {
                socketRef.current.emit('leave-room', roomId);
                console.log(`Emitted leave-room for: ${roomId}`);
            }
        };
    }, [roomId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    return socketRef.current;
}