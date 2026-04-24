import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientEvents, ServerEvents, GameType } from '../src/lib/types';
import { RoomManager } from './room-manager';
import { getGameEngine } from './game-engine';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
});

const roomManager = new RoomManager();
const playerSocketMap = new Map<string, string>();
const socketPlayerMap = new Map<string, { playerId: string; roomCode: string }>();
const gameTimers = new Map<string, NodeJS.Timeout>();

function broadcastRoomState(code: string) {
  const room = roomManager.getRoom(code);
  if (!room) return;
  io.to(code).emit('room:state', room);
}

function broadcastGameState(code: string) {
  const room = roomManager.getRoom(code);
  if (!room || !room.currentGame) return;
  const engine = getGameEngine(room.currentGame);
  if (!engine) return;
  for (const player of room.players) {
    const socketId = playerSocketMap.get(player.id);
    if (socketId) {
      io.to(socketId).emit('game:state', engine.getClientState(room.gameState, player.id));
    }
  }
}

function startGameTimer(code: string) {
  stopGameTimer(code);
  const timer = setInterval(() => {
    const room = roomManager.getRoom(code);
    if (!room || !room.currentGame || room.status !== 'playing') {
      stopGameTimer(code);
      return;
    }
    const engine = getGameEngine(room.currentGame);
    if (!engine?.tick) return;
    const result = engine.tick(room.gameState);
    room.gameState = result.state;
    for (const event of result.events) {
      io.to(code).emit('game:event', event);
    }
    if (result.ended) {
      roomManager.endGame(code);
      stopGameTimer(code);
    }
    broadcastGameState(code);
    broadcastRoomState(code);
  }, 1000);
  gameTimers.set(code, timer);
}

function stopGameTimer(code: string) {
  const timer = gameTimers.get(code);
  if (timer) {
    clearInterval(timer);
    gameTimers.delete(code);
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ nickname }) => {
    const { code, player } = roomManager.createRoom(nickname);
    playerSocketMap.set(player.id, socket.id);
    socketPlayerMap.set(socket.id, { playerId: player.id, roomCode: code });
    socket.join(code);
    socket.emit('room:created', { code, playerId: player.id });
    broadcastRoomState(code);
  });

  socket.on('room:join', ({ nickname, code }) => {
    try {
      const { player } = roomManager.joinRoom(code, nickname);
      playerSocketMap.set(player.id, socket.id);
      socketPlayerMap.set(socket.id, { playerId: player.id, roomCode: code });
      socket.join(code);
      socket.emit('room:joined', { playerId: player.id });
      io.to(code).emit('room:player-joined', { player });
      broadcastRoomState(code);
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  });

  socket.on('room:start', ({ game }) => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomCode);
    if (!room || room.hostId !== info.playerId) return;

    const engine = getGameEngine(game);
    if (!engine) return;

    const state = engine.init(room.players, room.settings);
    roomManager.setGameState(info.roomCode, game, state);
    broadcastRoomState(info.roomCode);
    broadcastGameState(info.roomCode);
    startGameTimer(info.roomCode);
  });

  socket.on('room:kick', ({ playerId }) => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomCode);
    if (!room || room.hostId !== info.playerId) return;

    roomManager.removePlayer(info.roomCode, playerId);
    const kickedSocketId = playerSocketMap.get(playerId);
    if (kickedSocketId) {
      io.to(kickedSocketId).emit('room:error', { message: 'You were kicked' });
      const kickedSocket = io.sockets.sockets.get(kickedSocketId);
      kickedSocket?.leave(info.roomCode);
      socketPlayerMap.delete(kickedSocketId);
      playerSocketMap.delete(playerId);
    }
    io.to(info.roomCode).emit('room:player-left', { playerId });
    broadcastRoomState(info.roomCode);
  });

  socket.on('room:settings', (settings) => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomCode);
    if (!room || room.hostId !== info.playerId) return;
    roomManager.updateSettings(info.roomCode, settings);
    broadcastRoomState(info.roomCode);
  });

  socket.on('game:action', (action) => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;

    // Handle back-to-room action
    if (action.type === 'back-to-room') {
      const room = roomManager.getRoom(info.roomCode);
      if (!room || room.hostId !== info.playerId) return;
      roomManager.resetToWaiting(info.roomCode);
      broadcastRoomState(info.roomCode);
      return;
    }

    const room = roomManager.getRoom(info.roomCode);
    if (!room || !room.currentGame || room.status !== 'playing') return;

    const engine = getGameEngine(room.currentGame);
    if (!engine) return;

    const result = engine.handleAction(room.gameState, info.playerId, action);
    room.gameState = result.state;

    for (const event of result.events) {
      // Update player scores
      if (event.type === 'score-update') {
        const player = room.players.find((p) => p.id === event.playerId);
        if (player) player.score += event.delta as number;
      }
      io.to(info.roomCode).emit('game:event', event);
    }

    if (result.ended) {
      roomManager.endGame(info.roomCode);
      stopGameTimer(info.roomCode);
    }

    broadcastGameState(info.roomCode);
    broadcastRoomState(info.roomCode);
  });

  socket.on('draw:stroke', (stroke) => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;
    socket.to(info.roomCode).emit('draw:stroke', stroke);
  });

  socket.on('disconnect', () => {
    const info = socketPlayerMap.get(socket.id);
    if (!info) return;

    roomManager.setPlayerOnline(info.roomCode, info.playerId, false);
    socketPlayerMap.delete(socket.id);
    broadcastRoomState(info.roomCode);

    setTimeout(() => {
      if (!playerSocketMap.get(info.playerId) || playerSocketMap.get(info.playerId) === socket.id) {
        roomManager.removePlayer(info.roomCode, info.playerId);
        playerSocketMap.delete(info.playerId);
        io.to(info.roomCode).emit('room:player-left', { playerId: info.playerId });
        broadcastRoomState(info.roomCode);
      }
    }, 10000);
  });
});

setInterval(() => roomManager.cleanup(), 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
