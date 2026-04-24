'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, Room } from '@/lib/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: TypedSocket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:state', (data) => setRoom(data));
    socket.on('room:created', ({ playerId: pid }) => setPlayerId(pid));
    socket.on('room:joined', ({ playerId: pid }) => setPlayerId(pid));
    socket.on('room:error', ({ message }) => setError(message));

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    setError(null);
    socketRef.current?.emit('room:create', { nickname });
  }, []);

  const joinRoom = useCallback((nickname: string, code: string) => {
    setError(null);
    socketRef.current?.emit('room:join', { nickname, code: code.toUpperCase() });
  }, []);

  const startGame = useCallback((game: string) => {
    socketRef.current?.emit('room:start', { game: game as any });
  }, []);

  const sendAction = useCallback((action: any) => {
    socketRef.current?.emit('game:action', action);
  }, []);

  const sendStroke = useCallback((stroke: any) => {
    socketRef.current?.emit('draw:stroke', stroke);
  }, []);

  const updateSettings = useCallback((settings: any) => {
    socketRef.current?.emit('room:settings', settings);
  }, []);

  const kickPlayer = useCallback((targetId: string) => {
    socketRef.current?.emit('room:kick', { playerId: targetId });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    room,
    playerId,
    error,
    createRoom,
    joinRoom,
    startGame,
    sendAction,
    sendStroke,
    updateSettings,
    kickPlayer,
  };
}
