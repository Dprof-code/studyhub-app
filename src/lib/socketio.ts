import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket as SocketIOClient } from 'socket.io-client';

export type SocketServer = SocketIOServer;

let io: SocketIOServer | null = null;

// Make io globally accessible
declare global {
    var __socketio: SocketIOServer | undefined;
}

export function getIO(): SocketIOServer | null {
    if (globalThis.__socketio) {
        return globalThis.__socketio;
    }
    return io;
}

export function initIO(httpServer: NetServer): SocketIOServer {
    if (!io) {
        console.log('🔄 Initializing Socket.IO server...');

        io = new SocketIOServer(httpServer, {
            path: '/api/socketio',
            addTrailingSlash: false,
            cors: {
                origin: ["http://localhost:3000", process.env.NEXT_PUBLIC_SOCKET_URL || ""],
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling'],
        });

        // Store globally for API routes to access
        globalThis.__socketio = io;

        console.log('✅ Socket.IO server initialized');

        io.on('connection', (socket) => {
            console.log('🔗 Client connected:', socket.id);

            socket.on('join-thread', (threadId: number) => {
                socket.join(`thread-${threadId}`);
                console.log(`📝 Client ${socket.id} joined thread-${threadId}`);
            });

            socket.on('leave-thread', (threadId: number) => {
                socket.leave(`thread-${threadId}`);
                console.log(`📝 Client ${socket.id} left thread-${threadId}`);
            });

            // Chat room events
            socket.on('join-room', (roomId: string) => {
                socket.join(`room-${roomId}`);
                console.log(`💬 Client ${socket.id} joined room-${roomId}`);

                // Confirm room membership
                const roomClients = io?.sockets.adapter.rooms.get(`room-${roomId}`)?.size || 0;
                console.log(`💬 Room ${roomId} now has ${roomClients} clients`);
            });

            socket.on('leave-room', (roomId: string) => {
                socket.leave(`room-${roomId}`);
                console.log(`💬 Client ${socket.id} left room-${roomId}`);
            });

            socket.on('disconnect', () => {
                console.log('❌ Client disconnected:', socket.id);
            });
        });

        // Add error handling
        io.on('error', (error) => {
            console.error('💥 Socket.IO server error:', error);
        });
    }

    return io;
}