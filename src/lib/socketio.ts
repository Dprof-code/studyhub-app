import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket as SocketIOClient } from 'socket.io-client';

export type SocketServer = SocketIOServer;
// export type SocketClient = SocketIOClient;

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
    return io;
}

export function initIO(httpServer: NetServer): SocketIOServer {
    if (!io) {
        io = new SocketIOServer(httpServer, {
            path: '/api/socketio',
            addTrailingSlash: false,
            cors: {
                origin: process.env.NEXT_PUBLIC_SOCKET_URL,
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join-thread', (threadId: number) => {
                socket.join(`thread-${threadId}`);
                console.log(`Client ${socket.id} joined thread-${threadId}`);
            });

            socket.on('leave-thread', (threadId: number) => {
                socket.leave(`thread-${threadId}`);
                console.log(`Client ${socket.id} left thread-${threadId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
    return io;
}