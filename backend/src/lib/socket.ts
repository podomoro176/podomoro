import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import prisma from './prisma';
import { OrderStatus } from '@prisma/client';

let io: SocketIOServer;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join:branch', (branchId: string) => {
      socket.join(`branch:${branchId}:pos`);
    });

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('join:owner', () => {
      socket.join('owner:live-feed');
    });

    socket.on('order:accepted', async ({ orderId }: { orderId: string }) => {
      await updateOrderStatus(orderId, OrderStatus.accepted);
    });

    socket.on('order:rejected', async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      await updateOrderStatus(orderId, OrderStatus.cancelled, reason);
    });

    socket.on('order:preparing', async ({ orderId }: { orderId: string }) => {
      await updateOrderStatus(orderId, OrderStatus.preparing);
    });

    socket.on('order:ready', async ({ orderId }: { orderId: string }) => {
      await updateOrderStatus(orderId, OrderStatus.ready);
    });
  });

  return io;
}

async function updateOrderStatus(orderId: string, status: OrderStatus, notes?: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status, ...(notes && { notes }) },
  });
  io.to(`order:${orderId}`).emit(`order:status:${orderId}`, { status: order.status });
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  getIO().to(room).emit(event, data);
}
