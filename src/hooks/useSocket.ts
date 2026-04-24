'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, Room } from '@/lib/types';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

let _socket: TypedSocket | null = null;
let _room: Room | null = null;
let _playerId: string | null = null;
let _connected = false;
let _error: string | null = null;
const _subs = new Set<() => void>();

function notify() {
  _subs.forEach((fn) => fn());
}

function getSocket(): TypedSocket {
  if (_socket) return _socket;

  _socket = io(SERVER_URL, { autoConnect: true });

  _socket.on('connect', () => {
    _connected = true;
    notify();
    const pid = sessionStorage.getItem('gg-pid');
    const rc = sessionStorage.getItem('gg-rc');
    if (pid && rc) {
      _socket!.emit('room:rejoin', { playerId: pid, roomCode: rc });
    }
  });

  _socket.on('disconnect', () => {
    _connected = false;
    notify();
  });

  _socket.on('room:state', (data) => {
    _room = data;
    notify();
  });

  _socket.on('room:created', ({ code, playerId }) => {
    _playerId = playerId;
    sessionStorage.setItem('gg-pid', playerId);
    sessionStorage.setItem('gg-rc', code);
    notify();
  });

  _socket.on('room:joined', ({ playerId }) => {
    _playerId = playerId;
    sessionStorage.setItem('gg-pid', playerId);
    notify();
  });

  _socket.on('room:error', ({ message }) => {
    _error = message;
    notify();
  });

  return _socket;
}

export function useSocket() {
  const [, rerender] = useState(0);

  useEffect(() => {
    getSocket();
    const sub = () => rerender((n) => n + 1);
    _subs.add(sub);
    return () => {
      _subs.delete(sub);
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    _error = null;
    getSocket().emit('room:create', { nickname });
  }, []);

  const joinRoom = useCallback((nickname: string, code: string) => {
    _error = null;
    sessionStorage.setItem('gg-rc', code.toUpperCase());
    getSocket().emit('room:join', { nickname, code: code.toUpperCase() });
  }, []);

  const startGame = useCallback((game: string) => {
    getSocket().emit('room:start', { game: game as any });
  }, []);

  const sendAction = useCallback((action: any) => {
    getSocket().emit('game:action', action);
  }, []);

  const sendStroke = useCallback((stroke: any) => {
    getSocket().emit('draw:stroke', stroke);
  }, []);

  const updateSettings = useCallback((settings: any) => {
    getSocket().emit('room:settings', settings);
  }, []);

  const kickPlayer = useCallback((targetId: string) => {
    getSocket().emit('room:kick', { playerId: targetId });
  }, []);

  return {
    socket: _socket,
    connected: _connected,
    room: _room,
    playerId: _playerId,
    error: _error,
    createRoom,
    joinRoom,
    startGame,
    sendAction,
    sendStroke,
    updateSettings,
    kickPlayer,
  };
}
