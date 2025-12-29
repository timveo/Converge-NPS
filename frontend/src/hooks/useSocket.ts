import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Get access token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    // Socket.IO connects to the base server URL (not the API path)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

    // Initialize socket connection
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[useSocket] Socket connection error:', error);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return { socket: socketRef.current, isConnected };
}
