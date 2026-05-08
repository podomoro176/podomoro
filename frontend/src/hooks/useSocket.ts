import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket(room: string) {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (room.startsWith('branch:')) {
      const branchId = room.replace(/^branch:(.+):pos$/, '$1');
      s.emit('join:branch', branchId);
    } else if (room.startsWith('order:')) {
      const orderId = room.replace(/^order:/, '');
      s.emit('join:order', orderId);
    } else if (room === 'owner:live-feed') {
      s.emit('join:owner');
    }
    return () => { /* rooms stay joined for session lifecycle */ };
  }, [room]);

  return socketRef.current;
}
