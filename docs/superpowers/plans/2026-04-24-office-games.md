# Office Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based office party game system with 7 mini-games, supporting 2-6 players in real-time rooms.

**Architecture:** Next.js frontend communicates with a standalone Node.js + Socket.IO server. All game logic runs server-side; clients only render state and send actions. Rooms are stored in server memory (no database).

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, Socket.IO 4, TypeScript, Vitest, HTML5 Canvas, Spotify Web API

---

## File Structure

```
office-games/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env.local                          # SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
├── server/
│   ├── index.ts                        # Express + Socket.IO entry point
│   ├── room-manager.ts                 # Room CRUD, player management
│   ├── room-manager.test.ts
│   ├── game-engine.ts                  # Base game interface + registry
│   ├── games/
│   │   ├── draw.ts                     # 你画我猜
│   │   ├── draw.test.ts
│   │   ├── emoji.ts                    # Emoji 猜词
│   │   ├── emoji.test.ts
│   │   ├── spy.ts                      # 谁是卧底
│   │   ├── spy.test.ts
│   │   ├── quiz.ts                     # 抢答题
│   │   ├── quiz.test.ts
│   │   ├── rank.ts                     # 排名猜猜猜
│   │   ├── rank.test.ts
│   │   ├── music.ts                    # 听歌识曲
│   │   ├── music.test.ts
│   │   ├── story.ts                    # 故事接龙
│   │   └── story.test.ts
│   ├── data/
│   │   ├── draw-words.ts
│   │   ├── emoji-words.ts
│   │   ├── spy-words.ts
│   │   ├── quiz-questions.ts
│   │   ├── rank-questions.ts
│   │   └── story-starters.ts
│   └── spotify.ts                      # Spotify API client
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Lobby
│   │   └── room/
│   │       └── [code]/
│   │           ├── page.tsx            # Room waiting
│   │           ├── draw/page.tsx
│   │           ├── music/page.tsx
│   │           ├── emoji/page.tsx
│   │           ├── spy/page.tsx
│   │           ├── quiz/page.tsx
│   │           ├── rank/page.tsx
│   │           ├── story/page.tsx
│   │           └── result/page.tsx
│   ├── components/
│   │   ├── StatusBar.tsx
│   │   ├── PlayerList.tsx
│   │   ├── ChatBox.tsx
│   │   ├── Timer.tsx
│   │   ├── Toast.tsx
│   │   └── Canvas.tsx
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   └── usePlayerHistory.ts
│   └── lib/
│       └── types.ts
└── vitest.config.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/types.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize project**

```bash
mkdir -p office-games && cd office-games
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
npm install socket.io socket.io-client express uuid
npm install -D @types/express @types/uuid vitest tsx nodemon
```

- [ ] **Step 3: Create shared types**

Write `src/lib/types.ts`:

```typescript
export type GameType = 'draw' | 'music' | 'emoji' | 'spy' | 'quiz' | 'rank' | 'story';

export type RoomStatus = 'waiting' | 'playing' | 'result';

export interface Player {
  id: string;
  nickname: string;
  color: string;
  score: number;
  online: boolean;
}

export interface RoomSettings {
  rounds: number;
  timeLimit: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  hostId: string;
  players: Player[];
  currentGame: GameType | null;
  gameState: unknown;
  settings: RoomSettings;
}

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

// Draw game
export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface DrawGameState {
  drawerId: string;
  word: string;
  hints: string;
  round: number;
  totalRounds: number;
  guessedPlayerIds: string[];
  strokes: Stroke[];
  timeLeft: number;
}

// Music game
export interface MusicGameState {
  round: number;
  totalRounds: number;
  previewUrl: string;
  options: string[];
  correctAnswer: string;
  answeredPlayerIds: string[];
  timeLeft: number;
}

// Emoji game
export interface EmojiGameState {
  presenterId: string;
  word: string;
  emojis: string;
  round: number;
  totalRounds: number;
  guessedPlayerIds: string[];
  timeLeft: number;
}

// Spy game
export interface SpyGameState {
  phase: 'describe' | 'vote' | 'result';
  alivePlayers: string[];
  spyIds: string[];
  currentSpeakerId: string | null;
  descriptions: Record<string, string>;
  votes: Record<string, string>;
  round: number;
}

// Quiz game
export interface QuizGameState {
  round: number;
  totalRounds: number;
  question: string;
  options: string[];
  correctAnswer: number;
  answers: Record<string, { answer: number; time: number }>;
  timeLeft: number;
}

// Rank game
export interface RankGameState {
  round: number;
  totalRounds: number;
  topic: string;
  items: string[];
  correctOrder: number[];
  submissions: Record<string, number[]>;
  timeLeft: number;
}

// Story game
export interface StoryGameState {
  phase: 'writing' | 'reveal' | 'voting';
  currentWriterIndex: number;
  writerOrder: string[];
  sentences: { playerId: string; text: string }[];
  lastSentence: string;
  votes: Record<string, string>;
  timeLeft: number;
}

// Client → Server events
export interface ClientEvents {
  'room:create': (data: { nickname: string }) => void;
  'room:join': (data: { nickname: string; code: string }) => void;
  'room:start': (data: { game: GameType }) => void;
  'room:kick': (data: { playerId: string }) => void;
  'room:settings': (data: Partial<RoomSettings>) => void;
  'game:action': (data: GameEvent) => void;
  'draw:stroke': (data: Stroke) => void;
}

// Server → Client events
export interface ServerEvents {
  'room:created': (data: { code: string; playerId: string }) => void;
  'room:joined': (data: { playerId: string }) => void;
  'room:state': (data: Room) => void;
  'room:error': (data: { message: string }) => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'game:state': (data: unknown) => void;
  'game:event': (data: GameEvent) => void;
  'draw:stroke': (data: Stroke) => void;
}
```

- [ ] **Step 4: Create vitest config**

Write `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Create .env.local**

Write `.env.local`:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

- [ ] **Step 6: Add server scripts to package.json**

Add to `scripts` in `package.json`:

```json
{
  "server": "tsx watch server/index.ts",
  "test:server": "vitest run server/",
  "test:server:watch": "vitest watch server/"
}
```

- [ ] **Step 7: Update .gitignore**

Append to `.gitignore`:

```
.env.local
.superpowers/
```

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js + Socket.IO project with shared types"
```

---

## Task 2: Room Manager (Server)

**Files:**
- Create: `server/room-manager.ts`, `server/room-manager.test.ts`

- [ ] **Step 1: Write failing tests for room creation and joining**

Write `server/room-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './room-manager';

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager();
  });

  describe('createRoom', () => {
    it('creates a room and returns code + player', () => {
      const { code, player } = rm.createRoom('Alice');
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(player.nickname).toBe('Alice');
      expect(player.online).toBe(true);
      const room = rm.getRoom(code);
      expect(room).toBeDefined();
      expect(room!.hostId).toBe(player.id);
      expect(room!.players).toHaveLength(1);
      expect(room!.status).toBe('waiting');
    });
  });

  describe('joinRoom', () => {
    it('adds player to existing room', () => {
      const { code } = rm.createRoom('Alice');
      const { player } = rm.joinRoom(code, 'Bob');
      expect(player.nickname).toBe('Bob');
      const room = rm.getRoom(code)!;
      expect(room.players).toHaveLength(2);
    });

    it('throws on invalid room code', () => {
      expect(() => rm.joinRoom('ZZZZZZ', 'Bob')).toThrow('Room not found');
    });

    it('throws when room is full (6 players)', () => {
      const { code } = rm.createRoom('P1');
      for (let i = 2; i <= 6; i++) rm.joinRoom(code, `P${i}`);
      expect(() => rm.joinRoom(code, 'P7')).toThrow('Room is full');
    });
  });

  describe('removePlayer', () => {
    it('removes player from room', () => {
      const { code, player: host } = rm.createRoom('Alice');
      const { player: bob } = rm.joinRoom(code, 'Bob');
      rm.removePlayer(code, bob.id);
      expect(rm.getRoom(code)!.players).toHaveLength(1);
    });

    it('transfers host when host leaves', () => {
      const { code, player: host } = rm.createRoom('Alice');
      const { player: bob } = rm.joinRoom(code, 'Bob');
      rm.removePlayer(code, host.id);
      expect(rm.getRoom(code)!.hostId).toBe(bob.id);
    });

    it('destroys room when last player leaves', () => {
      const { code, player } = rm.createRoom('Alice');
      rm.removePlayer(code, player.id);
      expect(rm.getRoom(code)).toBeUndefined();
    });
  });

  describe('setPlayerOnline', () => {
    it('toggles player online status', () => {
      const { code, player } = rm.createRoom('Alice');
      rm.setPlayerOnline(code, player.id, false);
      expect(rm.getRoom(code)!.players[0].online).toBe(false);
      rm.setPlayerOnline(code, player.id, true);
      expect(rm.getRoom(code)!.players[0].online).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('removes stale rooms', () => {
      const { code } = rm.createRoom('Alice');
      // Force the room's lastActivity to 31 minutes ago
      (rm as any).rooms.get(code).lastActivity = Date.now() - 31 * 60 * 1000;
      rm.cleanup();
      expect(rm.getRoom(code)).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run server/room-manager.test.ts
```

Expected: FAIL — `room-manager` module not found.

- [ ] **Step 3: Implement RoomManager**

Write `server/room-manager.ts`:

```typescript
import { v4 as uuid } from 'uuid';
import type { Player, Room, RoomSettings, GameType } from '../src/lib/types';

const PLAYER_COLORS = ['#ff6b6b', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6348'];

interface InternalRoom extends Room {
  lastActivity: number;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, InternalRoom>();

  createRoom(nickname: string): { code: string; player: Player } {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const player: Player = {
      id: uuid(),
      nickname,
      color: PLAYER_COLORS[0],
      score: 0,
      online: true,
    };

    const room: InternalRoom = {
      code,
      status: 'waiting',
      hostId: player.id,
      players: [player],
      currentGame: null,
      gameState: null,
      settings: { rounds: 3, timeLimit: 60 },
      lastActivity: Date.now(),
    };

    this.rooms.set(code, room);
    return { code, player };
  }

  joinRoom(code: string, nickname: string): { player: Player } {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.players.length >= 6) throw new Error('Room is full');

    const player: Player = {
      id: uuid(),
      nickname,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      score: 0,
      online: true,
    };

    room.players.push(player);
    room.lastActivity = Date.now();
    return { player };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  removePlayer(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }

    room.lastActivity = Date.now();
  }

  setPlayerOnline(code: string, playerId: string, online: boolean): void {
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.online = online;
    room.lastActivity = Date.now();
  }

  updateSettings(code: string, settings: Partial<RoomSettings>): void {
    const room = this.rooms.get(code);
    if (!room) return;
    Object.assign(room.settings, settings);
    room.lastActivity = Date.now();
  }

  setGameState(code: string, game: GameType, state: unknown): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.currentGame = game;
    room.gameState = state;
    room.status = 'playing';
    room.lastActivity = Date.now();
  }

  endGame(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.status = 'result';
    room.lastActivity = Date.now();
  }

  resetToWaiting(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.status = 'waiting';
    room.currentGame = null;
    room.gameState = null;
    room.players.forEach((p) => (p.score = 0));
    room.lastActivity = Date.now();
  }

  cleanup(): void {
    const thirtyMinutes = 30 * 60 * 1000;
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > thirtyMinutes) {
        this.rooms.delete(code);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run server/room-manager.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/room-manager.ts server/room-manager.test.ts
git commit -m "feat: implement RoomManager with create/join/leave/cleanup"
```

---

## Task 3: Game Engine Interface + Socket.IO Server

**Files:**
- Create: `server/game-engine.ts`, `server/index.ts`

- [ ] **Step 1: Create game engine interface**

Write `server/game-engine.ts`:

```typescript
import type { Player, GameEvent, RoomSettings } from '../src/lib/types';

export interface GameEngine {
  init(players: Player[], settings: RoomSettings): unknown;
  handleAction(state: unknown, playerId: string, action: GameEvent): {
    state: unknown;
    events: GameEvent[];
    ended: boolean;
  };
  getClientState(state: unknown, playerId: string): unknown;
  tick?(state: unknown): {
    state: unknown;
    events: GameEvent[];
    ended: boolean;
  };
}

const registry = new Map<string, GameEngine>();

export function registerGame(name: string, engine: GameEngine): void {
  registry.set(name, engine);
}

export function getGameEngine(name: string): GameEngine | undefined {
  return registry.get(name);
}
```

- [ ] **Step 2: Create Socket.IO server**

Write `server/index.ts`:

```typescript
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
    const room = roomManager.getRoom(info.roomCode);
    if (!room || !room.currentGame || room.status !== 'playing') return;

    const engine = getGameEngine(room.currentGame);
    if (!engine) return;

    const result = engine.handleAction(room.gameState, info.playerId, action);
    room.gameState = result.state;

    for (const event of result.events) {
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
```

- [ ] **Step 3: Verify server compiles**

```bash
npx tsx --no-warnings server/index.ts &
sleep 2 && kill %1
```

Expected: "Socket.IO server running on port 3001" then exits cleanly.

- [ ] **Step 4: Commit**

```bash
git add server/game-engine.ts server/index.ts
git commit -m "feat: add game engine interface and Socket.IO server with room events"
```

---

## Task 4: Client — Socket Hook + Lobby Page

**Files:**
- Create: `src/hooks/useSocket.ts`, `src/hooks/usePlayerHistory.ts`, `src/app/page.tsx`, `src/app/globals.css` (modify), `src/app/layout.tsx` (modify)

- [ ] **Step 1: Create Socket hook**

Write `src/hooks/useSocket.ts`:

```typescript
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
```

- [ ] **Step 2: Create player history hook**

Write `src/hooks/usePlayerHistory.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';

interface GameRecord {
  game: string;
  score: number;
  rank: number;
  totalPlayers: number;
  date: string;
}

interface PlayerHistory {
  nickname: string;
  totalGames: number;
  totalWins: number;
  records: GameRecord[];
}

const STORAGE_KEY = 'office-games-history';

function loadHistory(): PlayerHistory {
  if (typeof window === 'undefined') {
    return { nickname: '', totalGames: 0, totalWins: 0, records: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { nickname: '', totalGames: 0, totalWins: 0, records: [] };
}

function saveHistory(history: PlayerHistory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function usePlayerHistory() {
  const [history, setHistory] = useState<PlayerHistory>(loadHistory);

  const addRecord = useCallback((record: GameRecord) => {
    setHistory((prev) => {
      const updated = {
        ...prev,
        totalGames: prev.totalGames + 1,
        totalWins: record.rank === 1 ? prev.totalWins + 1 : prev.totalWins,
        records: [record, ...prev.records].slice(0, 50),
      };
      saveHistory(updated);
      return updated;
    });
  }, []);

  const setNickname = useCallback((nickname: string) => {
    setHistory((prev) => {
      const updated = { ...prev, nickname };
      saveHistory(updated);
      return updated;
    });
  }, []);

  return { history, addRecord, setNickname };
}
```

- [ ] **Step 3: Update globals.css with playful theme**

Replace contents of `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --gradient-start: #667eea;
  --gradient-end: #764ba2;
}

body {
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  min-height: 100vh;
}

@layer utilities {
  .glass {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-primary {
    @apply bg-red-400 hover:bg-red-500 text-white font-semibold py-3 px-8 rounded-full transition-all duration-200 hover:scale-105;
  }

  .btn-secondary {
    @apply glass text-white font-semibold py-3 px-8 rounded-full transition-all duration-200 hover:scale-105;
  }

  .card {
    @apply glass rounded-2xl p-6;
  }
}
```

- [ ] **Step 4: Update root layout**

Replace contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Office Games 🎮',
  description: '和同事来一局吧！',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} text-white min-h-screen`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create lobby page**

Write `src/app/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerHistory } from '@/hooks/usePlayerHistory';

export default function LobbyPage() {
  const router = useRouter();
  const { connected, room, playerId, error, createRoom, joinRoom } = useSocket();
  const { history, setNickname: saveNickname } = usePlayerHistory();
  const [nickname, setNickname] = useState(history.nickname);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');

  useEffect(() => {
    if (room && room.code) {
      saveNickname(nickname);
      router.push(`/room/${room.code}`);
    }
  }, [room, nickname, router, saveNickname]);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    createRoom(nickname.trim());
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    joinRoom(nickname.trim(), roomCode.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-2">🎮 Game Zone</h1>
          <p className="text-white/70 text-lg">和同事来一局吧！</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">你的昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称..."
              maxLength={12}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50"
            />
          </div>

          {error && (
            <div className="bg-red-500/30 border border-red-400/50 rounded-xl px-4 py-2 text-sm">
              {error}
            </div>
          )}

          {mode === 'home' ? (
            <div className="space-y-3">
              <button
                onClick={handleCreate}
                disabled={!connected || !nickname.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建房间
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full btn-secondary"
              >
                加入房间
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/60 mb-1">房间码</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入6位房间码..."
                  maxLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 tracking-widest text-center text-xl"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={!connected || !nickname.trim() || roomCode.length !== 6}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                加入
              </button>
              <button onClick={() => setMode('home')} className="w-full btn-secondary">
                返回
              </button>
            </div>
          )}

          {!connected && (
            <p className="text-center text-yellow-300/70 text-sm">正在连接服务器...</p>
          )}
        </div>

        {history.totalGames > 0 && (
          <div className="card mt-4">
            <h3 className="font-semibold mb-2">📊 战绩</h3>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold">{history.totalGames}</div>
                <div className="text-sm text-white/60">总场次</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{history.totalWins}</div>
                <div className="text-sm text-white/60">获胜</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.totalGames > 0
                    ? Math.round((history.totalWins / history.totalGames) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-white/60">胜率</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify frontend compiles**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ src/app/ src/lib/
git commit -m "feat: add socket hook, player history, and lobby page"
```

---

## Task 5: Room Waiting Page + Common Components

**Files:**
- Create: `src/components/StatusBar.tsx`, `src/components/PlayerList.tsx`, `src/components/Timer.tsx`, `src/components/Toast.tsx`, `src/components/ChatBox.tsx`, `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Create StatusBar component**

Write `src/components/StatusBar.tsx`:

```tsx
'use client';

interface StatusBarProps {
  roomCode: string;
  gameName?: string;
  timeLeft?: number;
}

export default function StatusBar({ roomCode, gameName, timeLeft }: StatusBarProps) {
  return (
    <div className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="bg-white/20 px-3 py-1 rounded-lg font-mono tracking-widest">
          {roomCode}
        </span>
        {gameName && <span className="text-white/70">{gameName}</span>}
      </div>
      {timeLeft !== undefined && (
        <div className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>
          {timeLeft}s
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerList component**

Write `src/components/PlayerList.tsx`:

```tsx
'use client';

import type { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId?: string;
  highlightId?: string;
}

export default function PlayerList({ players, hostId, currentPlayerId, highlightId }: PlayerListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm ${
            p.id === highlightId ? 'ring-2 ring-yellow-400' : ''
          } ${!p.online ? 'opacity-40' : ''}`}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: p.color }}
          >
            {p.nickname[0]}
          </div>
          <span>{p.nickname}</span>
          {p.id === hostId && <span className="text-yellow-400 text-xs">👑</span>}
          {p.id === currentPlayerId && <span className="text-xs text-white/40">(你)</span>}
          {p.score > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{p.score}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create Timer component**

Write `src/components/Timer.tsx`:

```tsx
'use client';

interface TimerProps {
  seconds: number;
  total: number;
}

export default function Timer({ seconds, total }: TimerProps) {
  const pct = (seconds / total) * 100;
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-1000 ${
          pct > 30 ? 'bg-green-400' : pct > 10 ? 'bg-yellow-400' : 'bg-red-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create Toast component**

Write `src/components/Toast.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;
const listeners: Array<(msg: ToastMessage) => void> = [];

export function showToast(text: string) {
  const msg = { id: ++toastId, text };
  listeners.forEach((fn) => fn(msg));
}

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 3000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="glass rounded-xl px-4 py-2 text-sm animate-[slideIn_0.3s_ease-out]"
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create ChatBox component**

Write `src/components/ChatBox.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatBox({ messages, onSend, placeholder = '输入答案...', disabled }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="glass rounded-xl flex flex-col h-64">
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
        {messages.map((msg, i) => (
          <div key={i} className={msg.isCorrect ? 'text-green-400 font-semibold' : ''}>
            <span className="text-white/60">{msg.nickname}:</span> {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none disabled:opacity-50"
        />
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Create room waiting page**

Write `src/app/room/[code]/page.tsx`:

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ToastContainer, { showToast } from '@/components/Toast';
import type { GameType } from '@/lib/types';

const GAMES: { id: GameType; name: string; emoji: string; minPlayers: number }[] = [
  { id: 'draw', name: '你画我猜', emoji: '🎨', minPlayers: 2 },
  { id: 'music', name: '听歌识曲', emoji: '🎵', minPlayers: 2 },
  { id: 'emoji', name: 'Emoji 猜词', emoji: '😜', minPlayers: 2 },
  { id: 'spy', name: '谁是卧底', emoji: '🕵️', minPlayers: 4 },
  { id: 'quiz', name: '抢答题', emoji: '❓', minPlayers: 2 },
  { id: 'rank', name: '排名猜猜猜', emoji: '📊', minPlayers: 2 },
  { id: 'story', name: '故事接龙', emoji: '📖', minPlayers: 2 },
];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { room, playerId, startGame, kickPlayer, updateSettings, socket } = useSocket();

  const code = params.code as string;
  const isHost = room?.hostId === playerId;
  const playerCount = room?.players.length ?? 0;

  useEffect(() => {
    if (!socket) return;
    const handler = (data: { player: any }) => {
      showToast(`${data.player.nickname} 加入了房间`);
    };
    socket.on('room:player-joined', handler);
    return () => { socket.off('room:player-joined', handler); };
  }, [socket]);

  useEffect(() => {
    if (room?.status === 'playing' && room.currentGame) {
      router.push(`/room/${code}/${room.currentGame}`);
    }
    if (room?.status === 'result') {
      router.push(`/room/${code}/result`);
    }
  }, [room?.status, room?.currentGame, code, router]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">正在连接房间...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} />

      <div className="card">
        <h2 className="font-bold text-lg mb-3">玩家 ({playerCount}/6)</h2>
        <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />
      </div>

      {isHost && (
        <div className="card">
          <h2 className="font-bold text-lg mb-3">设置</h2>
          <div className="flex items-center gap-4 text-sm">
            <label className="text-white/60">回合数</label>
            <select
              value={room.settings.rounds}
              onChange={(e) => updateSettings({ rounds: Number(e.target.value) })}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5"
            >
              {[2, 3, 5, 7].map((n) => (
                <option key={n} value={n} className="bg-gray-800">{n} 回合</option>
              ))}
            </select>
            <label className="text-white/60">时间</label>
            <select
              value={room.settings.timeLimit}
              onChange={(e) => updateSettings({ timeLimit: Number(e.target.value) })}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5"
            >
              {[30, 45, 60, 90].map((n) => (
                <option key={n} value={n} className="bg-gray-800">{n} 秒</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-bold text-lg mb-3">选择游戏</h2>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game) => {
            const disabled = !isHost || playerCount < game.minPlayers;
            return (
              <button
                key={game.id}
                onClick={() => startGame(game.id)}
                disabled={disabled}
                className="glass rounded-xl p-4 text-center transition-all hover:scale-105 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="text-3xl mb-1">{game.emoji}</div>
                <div className="text-sm font-semibold">{game.name}</div>
                {playerCount < game.minPlayers && (
                  <div className="text-xs text-white/40 mt-1">至少 {game.minPlayers} 人</div>
                )}
              </button>
            );
          })}
        </div>
        {!isHost && <p className="text-center text-white/40 text-sm mt-3">等待房主选择游戏...</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/app/room/
git commit -m "feat: add common components and room waiting page"
```

---

## Task 6: Game — 你画我猜 (Draw & Guess)

**Files:**
- Create: `server/data/draw-words.ts`, `server/games/draw.ts`, `server/games/draw.test.ts`, `src/components/Canvas.tsx`, `src/app/room/[code]/draw/page.tsx`

- [ ] **Step 1: Create word bank**

Write `server/data/draw-words.ts`:

```typescript
export const drawWords = [
  '苹果', '太阳', '月亮', '星星', '彩虹', '雨伞', '蛋糕', '自行车',
  '飞机', '火车', '猫咪', '狗狗', '大象', '长颈鹿', '企鹅', '熊猫',
  '西瓜', '香蕉', '草莓', '冰淇淋', '披萨', '汉堡', '咖啡', '篮球',
  '足球', '吉他', '钢琴', '手机', '电脑', '眼镜', '帽子', '鞋子',
  '房子', '城堡', '火山', '沙滩', '雪人', '圣诞树', '气球', '烟花',
  '蝴蝶', '蜗牛', '鲨鱼', '章鱼', '恐龙', '机器人', '外星人', '超人',
  '警察', '医生', '厨师', '宇航员', '画家', '魔术师', '国王', '公主',
];

export function getRandomWord(): string {
  return drawWords[Math.floor(Math.random() * drawWords.length)];
}
```

- [ ] **Step 2: Write failing tests for draw game engine**

Write `server/games/draw.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DrawEngine } from './draw';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('DrawEngine', () => {
  const engine = new DrawEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 60 };

  it('initializes with correct state', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.round).toBe(1);
    expect(state.totalRounds).toBe(2);
    expect(state.drawerId).toBe('p1');
    expect(state.word).toBeTruthy();
    expect(state.timeLeft).toBe(60);
    expect(state.guessedPlayerIds).toEqual([]);
  });

  it('hides word from non-drawers in client state', () => {
    const state = engine.init(makePlayers(3), settings);
    const guesserView: any = engine.getClientState(state, 'p2');
    expect(guesserView.word).toBeUndefined();
    expect(guesserView.hints).toBeDefined();
    const drawerView: any = engine.getClientState(state, 'p1');
    expect(drawerView.word).toBe((state as any).word);
  });

  it('scores correct guess and moves to next round when all guessed', () => {
    const state: any = engine.init(makePlayers(2), settings);
    const word = state.word;
    const result = engine.handleAction(state, 'p2', { type: 'guess', text: word });
    expect(result.state.guessedPlayerIds).toContain('p2');
    expect(result.events.some((e: any) => e.type === 'correct-guess')).toBe(true);
  });

  it('tick decrements timeLeft and ends round at 0', () => {
    const state: any = engine.init(makePlayers(2), settings);
    state.timeLeft = 1;
    const result = engine.tick!(state);
    expect(result.state.timeLeft).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/draw.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement DrawEngine**

Write `server/games/draw.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent, DrawGameState } from '../../src/lib/types';
import { getRandomWord } from '../data/draw-words';
import { registerGame } from '../game-engine';

function generateHints(word: string): string {
  return word.replace(/./g, '_ ').trim();
}

export class DrawEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings): DrawGameState {
    return {
      drawerId: players[0].id,
      word: getRandomWord(),
      hints: '',
      round: 1,
      totalRounds: settings.rounds * players.length,
      guessedPlayerIds: [],
      strokes: [],
      timeLeft: settings.timeLimit,
      _players: players.map((p) => p.id),
      _drawerIndex: 0,
      _roundsPerPlayer: settings.rounds,
      _settings: settings,
    } as any;
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'guess' && playerId !== s.drawerId) {
      const guess = (action.text as string).trim();
      if (guess === s.word && !s.guessedPlayerIds.includes(playerId)) {
        s.guessedPlayerIds.push(playerId);
        const bonus = Math.max(10, Math.round(s.timeLeft / s._settings.timeLimit * 50));
        events.push({
          type: 'correct-guess',
          playerId,
          score: bonus,
        });
        events.push({
          type: 'score-update',
          playerId,
          delta: bonus,
        });
        events.push({
          type: 'score-update',
          playerId: s.drawerId,
          delta: 10,
        });

        const nonDrawerCount = s._players.length - 1;
        if (s.guessedPlayerIds.length >= nonDrawerCount) {
          this.advanceRound(s, events);
        }
      } else {
        events.push({ type: 'chat', playerId, text: guess });
      }
    }

    if (action.type === 'clear-canvas') {
      s.strokes = [];
      events.push({ type: 'canvas-cleared' });
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const base = {
      drawerId: s.drawerId,
      round: s.round,
      totalRounds: s.totalRounds,
      guessedPlayerIds: s.guessedPlayerIds,
      timeLeft: s.timeLeft,
      hints: generateHints(s.word),
    };

    if (playerId === s.drawerId) {
      return { ...base, word: s.word };
    }
    if (s.guessedPlayerIds.includes(playerId)) {
      return { ...base, word: s.word };
    }
    return base;
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;

    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', word: s.word });
      this.advanceRound(s, events);
    }

    const totalRoundsComplete = s.round > s.totalRounds;
    return { state: s, events, ended: totalRoundsComplete };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    s._drawerIndex += 1;
    s.round += 1;

    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }

    const playerIndex = s._drawerIndex % s._players.length;
    s.drawerId = s._players[playerIndex];
    s.word = getRandomWord();
    s.guessedPlayerIds = [];
    s.strokes = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round, drawerId: s.drawerId });
  }
}

registerGame('draw', new DrawEngine());
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run server/games/draw.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Create Canvas component**

Write `src/components/Canvas.tsx`:

```tsx
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Stroke } from '@/lib/types';

interface CanvasProps {
  disabled?: boolean;
  onStroke?: (stroke: Stroke) => void;
  remoteStrokes?: Stroke[];
}

const COLORS = ['#000000', '#ff0000', '#0066ff', '#00cc44', '#ff9900', '#9933ff', '#ffffff'];
const WIDTHS = [2, 5, 10];

export default function Canvas({ disabled, onStroke, remoteStrokes }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) => {
    if (stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!remoteStrokes?.length) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const last = remoteStrokes[remoteStrokes.length - 1];
    drawStroke(ctx, last, canvas.width, canvas.height);
  }, [remoteStrokes, drawStroke]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStrokeRef.current.push(pos);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const points = currentStrokeRef.current;
    if (points.length >= 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[points.length - 2].x * canvas.width, points[points.length - 2].y * canvas.height);
      ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
      ctx.stroke();
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 1) {
      const stroke: Stroke = { points: currentStrokeRef.current, color, width };
      onStroke?.(stroke);
    }
    currentStrokeRef.current = [];
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full aspect-[4/3] rounded-xl cursor-crosshair touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {!disabled && (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-yellow-400 scale-110' : 'border-white/30'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`w-8 h-8 rounded-lg glass flex items-center justify-center ${width === w ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="bg-white rounded-full" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>
          <button onClick={handleClear} className="ml-auto text-sm btn-secondary py-1.5 px-4">
            清空
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create draw game page**

Write `src/app/room/[code]/draw/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ChatBox from '@/components/ChatBox';
import Timer from '@/components/Timer';
import Canvas from '@/components/Canvas';
import ToastContainer, { showToast } from '@/components/Toast';
import type { Stroke } from '@/lib/types';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

export default function DrawPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction, sendStroke } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStrokes, setRemoteStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-guess') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname ?? '???'} 答对了! +${event.score}分`);
        setMessages((prev) => [...prev, {
          playerId: event.playerId,
          nickname: player?.nickname ?? '???',
          text: '答对了!',
          isCorrect: true,
        }]);
      }
      if (event.type === 'chat') {
        const player = room?.players.find((p) => p.id === event.playerId);
        setMessages((prev) => [...prev, {
          playerId: event.playerId as string,
          nickname: player?.nickname ?? '???',
          text: event.text as string,
        }]);
      }
      if (event.type === 'new-round') {
        setMessages([]);
        setRemoteStrokes([]);
      }
      if (event.type === 'time-up') {
        showToast(`时间到! 答案是: ${event.word}`);
      }
    };
    const handleStroke = (stroke: Stroke) => {
      setRemoteStrokes((prev) => [...prev, stroke]);
    };

    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    socket.on('draw:stroke', handleStroke);
    return () => {
      socket.off('game:state', handleState);
      socket.off('game:event', handleEvent);
      socket.off('draw:stroke', handleStroke);
    };
  }, [socket, room?.players]);

  const handleGuess = useCallback((text: string) => {
    sendAction({ type: 'guess', text });
  }, [sendAction]);

  const handleStroke = useCallback((stroke: Stroke) => {
    sendStroke(stroke);
  }, [sendStroke]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isDrawer = playerId === gameState.drawerId;
  const hasGuessed = gameState.guessedPlayerIds?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-3">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="🎨 你画我猜" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList
        players={room.players}
        hostId={room.hostId}
        currentPlayerId={playerId ?? undefined}
        highlightId={gameState.drawerId}
      />

      <div className="text-center text-lg font-semibold">
        第 {gameState.round} / {gameState.totalRounds} 轮
        {isDrawer ? (
          <span className="ml-2">你来画: <span className="text-yellow-400">{gameState.word}</span></span>
        ) : (
          <span className="ml-2">提示: <span className="tracking-widest">{gameState.hints}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Canvas
            disabled={!isDrawer}
            onStroke={isDrawer ? handleStroke : undefined}
            remoteStrokes={!isDrawer ? remoteStrokes : undefined}
          />
        </div>
        <div>
          <ChatBox
            messages={messages}
            onSend={handleGuess}
            placeholder={isDrawer ? '你是画手，不能猜哦' : hasGuessed ? '你已答对!' : '输入答案...'}
            disabled={isDrawer || hasGuessed}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Import draw engine in server index**

Add to top of `server/index.ts`:

```typescript
import './games/draw';
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add server/data/draw-words.ts server/games/draw.ts server/games/draw.test.ts src/components/Canvas.tsx src/app/room/\[code\]/draw/
git commit -m "feat: implement draw-and-guess game (server + client)"
```

---

## Task 7: Game — Emoji 猜词

**Files:**
- Create: `server/data/emoji-words.ts`, `server/games/emoji.ts`, `server/games/emoji.test.ts`, `src/app/room/[code]/emoji/page.tsx`

- [ ] **Step 1: Create emoji word bank**

Write `server/data/emoji-words.ts`:

```typescript
export interface EmojiWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const emojiWords: EmojiWord[] = [
  { word: '西瓜', difficulty: 'easy' },
  { word: '下雨', difficulty: 'easy' },
  { word: '生日', difficulty: 'easy' },
  { word: '睡觉', difficulty: 'easy' },
  { word: '跑步', difficulty: 'easy' },
  { word: '开心', difficulty: 'easy' },
  { word: '游泳', difficulty: 'easy' },
  { word: '音乐', difficulty: 'easy' },
  { word: '看书', difficulty: 'easy' },
  { word: '吃饭', difficulty: 'easy' },
  { word: '飞机', difficulty: 'easy' },
  { word: '太阳', difficulty: 'easy' },
  { word: '蜜蜂', difficulty: 'medium' },
  { word: '地铁', difficulty: 'medium' },
  { word: '外卖', difficulty: 'medium' },
  { word: '加班', difficulty: 'medium' },
  { word: '迟到', difficulty: 'medium' },
  { word: '拍照', difficulty: 'medium' },
  { word: '减肥', difficulty: 'medium' },
  { word: '失眠', difficulty: 'medium' },
  { word: '网购', difficulty: 'medium' },
  { word: '追剧', difficulty: 'medium' },
  { word: '塞车', difficulty: 'medium' },
  { word: '约会', difficulty: 'medium' },
  { word: '世界末日', difficulty: 'hard' },
  { word: '一见钟情', difficulty: 'hard' },
  { word: '对牛弹琴', difficulty: 'hard' },
  { word: '守株待兔', difficulty: 'hard' },
  { word: '望梅止渴', difficulty: 'hard' },
  { word: '画蛇添足', difficulty: 'hard' },
];

export function getRandomEmojiWord(difficulty?: string): EmojiWord {
  const filtered = difficulty ? emojiWords.filter((w) => w.difficulty === difficulty) : emojiWords;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
```

- [ ] **Step 2: Write failing tests**

Write `server/games/emoji.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EmojiEngine } from './emoji';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('EmojiEngine', () => {
  const engine = new EmojiEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 60 };

  it('initializes with first player as presenter', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.presenterId).toBe('p1');
    expect(state.word).toBeTruthy();
    expect(state.emojis).toBe('');
    expect(state.round).toBe(1);
  });

  it('hides word from non-presenters', () => {
    const state = engine.init(makePlayers(3), settings);
    const view: any = engine.getClientState(state, 'p2');
    expect(view.word).toBeUndefined();
  });

  it('accepts emoji input from presenter', () => {
    const state = engine.init(makePlayers(3), settings);
    const result = engine.handleAction(state, 'p1', { type: 'set-emojis', emojis: '🍉' });
    expect((result.state as any).emojis).toBe('🍉');
  });

  it('handles correct guess', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const word = state.word;
    const result = engine.handleAction(state, 'p2', { type: 'guess', text: word });
    expect(result.events.some((e: any) => e.type === 'correct-guess')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/emoji.test.ts
```

- [ ] **Step 4: Implement EmojiEngine**

Write `server/games/emoji.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomEmojiWord } from '../data/emoji-words';
import { registerGame } from '../game-engine';

export class EmojiEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const word = getRandomEmojiWord();
    return {
      presenterId: players[0].id,
      word: word.word,
      emojis: '',
      round: 1,
      totalRounds: settings.rounds * players.length,
      guessedPlayerIds: [] as string[],
      timeLeft: settings.timeLimit,
      _players: players.map((p) => p.id),
      _presenterIndex: 0,
      _settings: settings,
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'set-emojis' && playerId === s.presenterId) {
      s.emojis = action.emojis as string;
      events.push({ type: 'emojis-updated', emojis: s.emojis });
    }

    if (action.type === 'guess' && playerId !== s.presenterId) {
      const guess = (action.text as string).trim();
      if (guess === s.word && !s.guessedPlayerIds.includes(playerId)) {
        s.guessedPlayerIds.push(playerId);
        const bonus = Math.max(10, Math.round((s.timeLeft / s._settings.timeLimit) * 50));
        events.push({ type: 'correct-guess', playerId, score: bonus });
        events.push({ type: 'score-update', playerId, delta: bonus });
        events.push({ type: 'score-update', playerId: s.presenterId, delta: 10 });

        if (s.guessedPlayerIds.length >= s._players.length - 1) {
          this.advanceRound(s, events);
        }
      } else {
        events.push({ type: 'chat', playerId, text: guess });
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const base = {
      presenterId: s.presenterId,
      emojis: s.emojis,
      round: s.round,
      totalRounds: s.totalRounds,
      guessedPlayerIds: s.guessedPlayerIds,
      timeLeft: s.timeLeft,
      hints: s.word.replace(/./g, '_ ').trim(),
    };
    if (playerId === s.presenterId || s.guessedPlayerIds.includes(playerId)) {
      return { ...base, word: s.word };
    }
    return base;
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;
    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', word: s.word });
      this.advanceRound(s, events);
    }
    return { state: s, events, ended: s.round > s.totalRounds };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    s._presenterIndex += 1;
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const idx = s._presenterIndex % s._players.length;
    s.presenterId = s._players[idx];
    s.word = getRandomEmojiWord().word;
    s.emojis = '';
    s.guessedPlayerIds = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round, presenterId: s.presenterId });
  }
}

registerGame('emoji', new EmojiEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/emoji.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Create emoji game page**

Write `src/app/room/[code]/emoji/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ChatBox from '@/components/ChatBox';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

export default function EmojiPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [emojiInput, setEmojiInput] = useState('');

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-guess') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname ?? '???'} 答对了! +${event.score}分`);
        setMessages((prev) => [...prev, {
          playerId: event.playerId, nickname: player?.nickname ?? '???', text: '答对了!', isCorrect: true,
        }]);
      }
      if (event.type === 'chat') {
        const player = room?.players.find((p) => p.id === event.playerId);
        setMessages((prev) => [...prev, {
          playerId: event.playerId as string, nickname: player?.nickname ?? '???', text: event.text as string,
        }]);
      }
      if (event.type === 'new-round') {
        setMessages([]);
        setEmojiInput('');
      }
      if (event.type === 'time-up') showToast(`时间到! 答案是: ${event.word}`);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  const handleSendEmojis = () => {
    sendAction({ type: 'set-emojis', emojis: emojiInput });
  };

  const handleGuess = useCallback((text: string) => {
    sendAction({ type: 'guess', text });
  }, [sendAction]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isPresenter = playerId === gameState.presenterId;
  const hasGuessed = gameState.guessedPlayerIds?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-3">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="😜 Emoji 猜词" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} highlightId={gameState.presenterId} />

      <div className="text-center text-lg font-semibold">
        第 {gameState.round} / {gameState.totalRounds} 轮
        {isPresenter ? (
          <span className="ml-2">你的词: <span className="text-yellow-400">{gameState.word}</span></span>
        ) : (
          <span className="ml-2">提示: <span className="tracking-widest">{gameState.hints}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <div className="card min-h-[200px] flex items-center justify-center">
            <div className="text-6xl tracking-wider">{gameState.emojis || '...'}</div>
          </div>
          {isPresenter && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={emojiInput}
                onChange={(e) => setEmojiInput(e.target.value)}
                placeholder="输入 emoji 组合..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center"
              />
              <button onClick={handleSendEmojis} className="btn-primary">发送</button>
            </div>
          )}
        </div>
        <div>
          <ChatBox
            messages={messages}
            onSend={handleGuess}
            placeholder={isPresenter ? '你是出题者' : hasGuessed ? '你已答对!' : '输入答案...'}
            disabled={isPresenter || hasGuessed}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Import in server index**

Add to `server/index.ts`:

```typescript
import './games/emoji';
```

- [ ] **Step 8: Commit**

```bash
git add server/data/emoji-words.ts server/games/emoji.ts server/games/emoji.test.ts src/app/room/\[code\]/emoji/
git commit -m "feat: implement emoji guessing game (server + client)"
```

---

## Task 8: Game — 谁是卧底 (Spy)

**Files:**
- Create: `server/data/spy-words.ts`, `server/games/spy.ts`, `server/games/spy.test.ts`, `src/app/room/[code]/spy/page.tsx`

- [ ] **Step 1: Create spy word pairs**

Write `server/data/spy-words.ts`:

```typescript
export interface SpyWordPair {
  normal: string;
  spy: string;
}

export const spyWordPairs: SpyWordPair[] = [
  { normal: '苹果', spy: '梨子' },
  { normal: '可乐', spy: '雪碧' },
  { normal: '微信', spy: '支付宝' },
  { normal: '火锅', spy: '麻辣烫' },
  { normal: '篮球', spy: '排球' },
  { normal: '地铁', spy: '公交车' },
  { normal: '猫', spy: '狗' },
  { normal: '医生', spy: '护士' },
  { normal: '手机', spy: '平板' },
  { normal: '牛奶', spy: '豆浆' },
  { normal: '星巴克', spy: '瑞幸' },
  { normal: '抖音', spy: '快手' },
  { normal: '钢琴', spy: '吉他' },
  { normal: '大学', spy: '高中' },
  { normal: '飞机', spy: '高铁' },
  { normal: '西装', spy: '衬衫' },
  { normal: '北京', spy: '上海' },
  { normal: '日本', spy: '韩国' },
  { normal: '圣诞节', spy: '万圣节' },
  { normal: '蛋糕', spy: '面包' },
];

export function getRandomWordPair(): SpyWordPair {
  return spyWordPairs[Math.floor(Math.random() * spyWordPairs.length)];
}
```

- [ ] **Step 2: Write failing tests**

Write `server/games/spy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SpyEngine } from './spy';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('SpyEngine', () => {
  const engine = new SpyEngine();
  const settings: RoomSettings = { rounds: 1, timeLimit: 60 };

  it('assigns 1 spy for 4-5 players', () => {
    const state: any = engine.init(makePlayers(4), settings);
    expect(state.spyIds).toHaveLength(1);
    expect(state.alivePlayers).toHaveLength(4);
    expect(state.phase).toBe('describe');
  });

  it('assigns 2 spies for 6 players', () => {
    const state: any = engine.init(makePlayers(6), settings);
    expect(state.spyIds).toHaveLength(2);
  });

  it('shows different words to spy vs normal', () => {
    const state: any = engine.init(makePlayers(4), settings);
    const spyView: any = engine.getClientState(state, state.spyIds[0]);
    const normalId = state.alivePlayers.find((id: string) => !state.spyIds.includes(id));
    const normalView: any = engine.getClientState(state, normalId);
    expect(spyView.myWord).toBe(state.spyWord);
    expect(normalView.myWord).toBe(state.normalWord);
  });

  it('handles describe then vote flow', () => {
    const state: any = engine.init(makePlayers(4), settings);
    // All players describe
    for (const pid of state.alivePlayers) {
      engine.handleAction(state, pid, { type: 'describe', text: 'something' });
    }
    expect(state.phase).toBe('vote');
    // All alive players vote for p1
    for (const pid of state.alivePlayers) {
      if (pid !== 'p1') {
        engine.handleAction(state, pid, { type: 'vote', targetId: 'p1' });
      }
    }
    // p1 should be eliminated
    expect(state.alivePlayers).not.toContain('p1');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/spy.test.ts
```

- [ ] **Step 4: Implement SpyEngine**

Write `server/games/spy.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomWordPair } from '../data/spy-words';
import { registerGame } from '../game-engine';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class SpyEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const pair = getRandomWordPair();
    const spyCount = players.length >= 6 ? 2 : 1;
    const shuffled = shuffle(players.map((p) => p.id));
    const spyIds = shuffled.slice(0, spyCount);

    return {
      phase: 'describe' as const,
      alivePlayers: players.map((p) => p.id),
      spyIds,
      normalWord: pair.normal,
      spyWord: pair.spy,
      currentSpeakerIndex: 0,
      descriptions: {} as Record<string, string>,
      votes: {} as Record<string, string>,
      round: 1,
      eliminatedThisRound: null as string | null,
      timeLeft: settings.timeLimit,
      _settings: settings,
      _allPlayers: players.map((p) => p.id),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (s.phase === 'describe' && action.type === 'describe') {
      s.descriptions[playerId] = action.text as string;
      events.push({ type: 'player-described', playerId, text: action.text as string });

      const allDescribed = s.alivePlayers.every((id: string) => s.descriptions[id]);
      if (allDescribed) {
        s.phase = 'vote';
        s.votes = {};
        s.timeLeft = s._settings.timeLimit;
        events.push({ type: 'phase-change', phase: 'vote' });
      }
    }

    if (s.phase === 'vote' && action.type === 'vote') {
      s.votes[playerId] = action.targetId as string;
      events.push({ type: 'player-voted', playerId });

      const allVoted = s.alivePlayers.every((id: string) => s.votes[id]);
      if (allVoted) {
        const tally: Record<string, number> = {};
        for (const targetId of Object.values(s.votes) as string[]) {
          tally[targetId] = (tally[targetId] || 0) + 1;
        }
        const maxVotes = Math.max(...Object.values(tally));
        const eliminated = Object.entries(tally).filter(([, v]) => v === maxVotes);

        if (eliminated.length === 1) {
          const eliminatedId = eliminated[0][0];
          s.alivePlayers = s.alivePlayers.filter((id: string) => id !== eliminatedId);
          s.eliminatedThisRound = eliminatedId;
          const isSpy = s.spyIds.includes(eliminatedId);
          events.push({ type: 'player-eliminated', playerId: eliminatedId, isSpy });
        } else {
          events.push({ type: 'vote-tie', tiedPlayers: eliminated.map(([id]) => id) });
        }

        const aliveSpies = s.spyIds.filter((id: string) => s.alivePlayers.includes(id));
        const aliveNormals = s.alivePlayers.filter((id: string) => !s.spyIds.includes(id));

        if (aliveSpies.length === 0) {
          events.push({ type: 'game-over', winner: 'normal', spyIds: s.spyIds });
          for (const id of s._allPlayers) {
            if (!s.spyIds.includes(id)) {
              events.push({ type: 'score-update', playerId: id, delta: 20 });
            }
          }
          return { state: s, events, ended: true };
        }

        if (aliveNormals.length <= aliveSpies.length) {
          events.push({ type: 'game-over', winner: 'spy', spyIds: s.spyIds });
          for (const id of s.spyIds) {
            events.push({ type: 'score-update', playerId: id, delta: 30 });
          }
          return { state: s, events, ended: true };
        }

        s.phase = 'describe';
        s.descriptions = {};
        s.votes = {};
        s.round += 1;
        s.eliminatedThisRound = null;
        s.timeLeft = s._settings.timeLimit;
        events.push({ type: 'new-round', round: s.round });
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const isSpy = s.spyIds.includes(playerId);
    return {
      phase: s.phase,
      alivePlayers: s.alivePlayers,
      round: s.round,
      myWord: isSpy ? s.spyWord : s.normalWord,
      descriptions: s.descriptions,
      votes: s.phase === 'vote' ? Object.keys(s.votes) : [],
      eliminatedThisRound: s.eliminatedThisRound,
      timeLeft: s.timeLeft,
      isSpy,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    s.timeLeft -= 1;
    return { state: s, events: [], ended: false };
  }
}

registerGame('spy', new SpyEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/spy.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Create spy game page**

Write `src/app/room/[code]/spy/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ToastContainer, { showToast } from '@/components/Toast';

export default function SpyPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'player-eliminated') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 被投出! ${event.isSpy ? '是卧底!' : '不是卧底...'}`);
      }
      if (event.type === 'vote-tie') showToast('平票! 无人出局');
      if (event.type === 'game-over') {
        showToast(event.winner === 'spy' ? '卧底获胜!' : '平民获胜!');
      }
      if (event.type === 'new-round') {
        setDescription('');
        setVoteTarget(null);
      }
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isAlive = gameState.alivePlayers.includes(playerId);
  const hasDescribed = gameState.descriptions[playerId!];
  const hasVoted = gameState.votes?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="🕵️ 谁是卧底" timeLeft={gameState.timeLeft} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="card text-center">
        <div className="text-sm text-white/60 mb-1">你的词语</div>
        <div className="text-3xl font-bold">{gameState.myWord}</div>
        <div className={`text-xs mt-1 ${gameState.isSpy ? 'text-red-400' : 'text-green-400'}`}>
          {gameState.isSpy ? '你是卧底' : '你是平民'}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">第 {gameState.round} 轮 — {gameState.phase === 'describe' ? '描述阶段' : '投票阶段'}</h3>

        {gameState.phase === 'describe' && (
          <div>
            {Object.entries(gameState.descriptions).map(([pid, text]) => {
              const player = room.players.find((p) => p.id === pid);
              return (
                <div key={pid} className="py-2 border-b border-white/10">
                  <span className="text-white/60">{player?.nickname}:</span> {text as string}
                </div>
              );
            })}
            {isAlive && !hasDescribed && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="用一句话描述你的词..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2"
                />
                <button
                  onClick={() => { sendAction({ type: 'describe', text: description }); }}
                  disabled={!description.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  提交
                </button>
              </div>
            )}
            {hasDescribed && <p className="text-white/40 text-sm mt-2">等待其他玩家描述...</p>}
          </div>
        )}

        {gameState.phase === 'vote' && isAlive && !hasVoted && (
          <div className="space-y-2">
            <p className="text-sm text-white/60">投票选出你认为的卧底:</p>
            {gameState.alivePlayers
              .filter((id: string) => id !== playerId)
              .map((id: string) => {
                const player = room.players.find((p) => p.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setVoteTarget(id);
                      sendAction({ type: 'vote', targetId: id });
                    }}
                    className={`w-full glass rounded-xl px-4 py-3 text-left hover:bg-white/20 ${
                      voteTarget === id ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    {player?.nickname}
                  </button>
                );
              })}
          </div>
        )}
        {gameState.phase === 'vote' && hasVoted && (
          <p className="text-white/40 text-sm">等待其他玩家投票...</p>
        )}
        {!isAlive && <p className="text-white/40 text-sm">你已出局，观战中...</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Import in server index and commit**

Add `import './games/spy';` to `server/index.ts`.

```bash
git add server/data/spy-words.ts server/games/spy.ts server/games/spy.test.ts src/app/room/\[code\]/spy/
git commit -m "feat: implement spy (谁是卧底) game"
```

---

## Task 9: Game — 抢答题 (Quiz)

**Files:**
- Create: `server/data/quiz-questions.ts`, `server/games/quiz.ts`, `server/games/quiz.test.ts`, `src/app/room/[code]/quiz/page.tsx`

- [ ] **Step 1: Create quiz question bank**

Write `server/data/quiz-questions.ts`:

```typescript
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  category: string;
}

export const quizQuestions: QuizQuestion[] = [
  { question: '地球上最大的海洋是？', options: ['大西洋', '太平洋', '印度洋', '北冰洋'], answer: 1, category: '常识' },
  { question: '光年是什么单位？', options: ['时间', '距离', '速度', '质量'], answer: 1, category: '科技' },
  { question: '人体最大的器官是？', options: ['肝脏', '大脑', '皮肤', '心脏'], answer: 2, category: '常识' },
  { question: '"床前明月光" 的作者是？', options: ['杜甫', '李白', '白居易', '王维'], answer: 1, category: '文学' },
  { question: 'HTTP 状态码 404 表示？', options: ['服务器错误', '未找到', '重定向', '未授权'], answer: 1, category: '科技' },
  { question: '世界上最长的河流是？', options: ['亚马逊河', '长江', '尼罗河', '密西西比河'], answer: 2, category: '常识' },
  { question: 'DNA 的全称是？', options: ['脱氧核糖核酸', '核糖核酸', '蛋白质', '氨基酸'], answer: 0, category: '科技' },
  { question: '一年有多少个星期？', options: ['48', '50', '52', '54'], answer: 2, category: '常识' },
  { question: '"千里江陵一日还" 描写的交通工具是？', options: ['马', '船', '车', '飞鸽'], answer: 1, category: '文学' },
  { question: '世界杯足球赛几年举办一次？', options: ['2年', '3年', '4年', '5年'], answer: 2, category: '娱乐' },
  { question: 'JavaScript 中 typeof null 的结果是？', options: ['"null"', '"undefined"', '"object"', '"boolean"'], answer: 2, category: '科技' },
  { question: '人类有多少对染色体？', options: ['22', '23', '24', '25'], answer: 1, category: '科技' },
  { question: '《哈利波特》的作者是？', options: ['托尔金', 'J.K.罗琳', 'C.S.刘易斯', '乔治·马丁'], answer: 1, category: '娱乐' },
  { question: '什么东西越洗越脏？', options: ['衣服', '碗', '水', '手'], answer: 2, category: '脑筋急转弯' },
  { question: '太阳系中最大的行星是？', options: ['土星', '木星', '海王星', '天王星'], answer: 1, category: '常识' },
  { question: '世界上面积最小的国家是？', options: ['摩纳哥', '梵蒂冈', '列支敦士登', '圣马力诺'], answer: 1, category: '常识' },
];

export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

- [ ] **Step 2: Write failing tests**

Write `server/games/quiz.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { QuizEngine } from './quiz';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('QuizEngine', () => {
  const engine = new QuizEngine();
  const settings: RoomSettings = { rounds: 3, timeLimit: 10 };

  it('initializes with question and options', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.round).toBe(1);
    expect(state.question).toBeTruthy();
    expect(state.options).toHaveLength(4);
    expect(state.timeLeft).toBe(10);
  });

  it('hides correct answer from client', () => {
    const state = engine.init(makePlayers(3), settings);
    const view: any = engine.getClientState(state, 'p1');
    expect(view.correctAnswer).toBeUndefined();
  });

  it('scores faster answers higher', () => {
    const state: any = engine.init(makePlayers(2), settings);
    const correct = state.correctAnswer;
    state.timeLeft = 8;
    const r1 = engine.handleAction(state, 'p1', { type: 'answer', answer: correct });
    state.timeLeft = 3;
    const r2 = engine.handleAction(r1.state, 'p2', { type: 'answer', answer: correct });
    const s1 = r1.events.find((e: any) => e.type === 'score-update' && e.playerId === 'p1');
    const s2 = r2.events.find((e: any) => e.type === 'score-update' && e.playerId === 'p2');
    expect((s1 as any).delta).toBeGreaterThan((s2 as any).delta);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/quiz.test.ts
```

- [ ] **Step 4: Implement QuizEngine**

Write `server/games/quiz.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomQuestions, QuizQuestion } from '../data/quiz-questions';
import { registerGame } from '../game-engine';

export class QuizEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const questions = getRandomQuestions(settings.rounds);
    const q = questions[0];
    return {
      round: 1,
      totalRounds: settings.rounds,
      question: q.question,
      options: q.options,
      correctAnswer: q.answer,
      answers: {} as Record<string, { answer: number; time: number }>,
      timeLeft: settings.timeLimit,
      _questions: questions,
      _settings: settings,
      _players: players.map((p) => p.id),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'answer' && !s.answers[playerId]) {
      const answer = action.answer as number;
      s.answers[playerId] = { answer, time: s.timeLeft };

      if (answer === s.correctAnswer) {
        const bonus = Math.max(5, Math.round((s.timeLeft / s._settings.timeLimit) * 30));
        events.push({ type: 'score-update', playerId, delta: bonus });
        events.push({ type: 'correct-answer', playerId, bonus });
      } else {
        events.push({ type: 'wrong-answer', playerId });
      }

      if (Object.keys(s.answers).length >= s._players.length) {
        this.advanceRound(s, events);
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    return {
      round: s.round,
      totalRounds: s.totalRounds,
      question: s.question,
      options: s.options,
      myAnswer: s.answers[playerId]?.answer ?? null,
      answeredCount: Object.keys(s.answers).length,
      totalPlayers: s._players.length,
      timeLeft: s.timeLeft,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;

    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', correctAnswer: s.correctAnswer });
      this.advanceRound(s, events);
    }

    return { state: s, events, ended: s.round > s.totalRounds };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    events.push({ type: 'round-result', correctAnswer: s.correctAnswer, answers: s.answers });
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const q = s._questions[s.round - 1];
    s.question = q.question;
    s.options = q.options;
    s.correctAnswer = q.answer;
    s.answers = {};
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round });
  }
}

registerGame('quiz', new QuizEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/quiz.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Create quiz game page**

Write `src/app/room/[code]/quiz/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function QuizPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-answer') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 答对了! +${event.bonus}分`);
      }
      if (event.type === 'round-result') {
        setCorrectAnswer(event.correctAnswer as number);
        setTimeout(() => setCorrectAnswer(null), 2000);
      }
      if (event.type === 'time-up') setCorrectAnswer(event.correctAnswer as number);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const hasAnswered = gameState.myAnswer !== null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="❓ 抢答题" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 题 · {gameState.answeredCount}/{gameState.totalPlayers} 已作答
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-center mb-6">{gameState.question}</h2>
        <div className="grid grid-cols-1 gap-3">
          {gameState.options.map((opt: string, i: number) => {
            let style = 'glass hover:bg-white/20';
            if (correctAnswer !== null) {
              if (i === correctAnswer) style = 'bg-green-500/40 border-green-400';
              else if (gameState.myAnswer === i) style = 'bg-red-500/40 border-red-400';
            } else if (gameState.myAnswer === i) {
              style = 'bg-blue-500/30 border-blue-400';
            }

            return (
              <button
                key={i}
                onClick={() => sendAction({ type: 'answer', answer: i })}
                disabled={hasAnswered}
                className={`${style} rounded-xl px-6 py-4 text-left text-lg transition-all border border-transparent disabled:cursor-default`}
              >
                <span className="font-bold mr-3 text-white/50">{'ABCD'[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Import in server index and commit**

Add `import './games/quiz';` to `server/index.ts`.

```bash
git add server/data/quiz-questions.ts server/games/quiz.ts server/games/quiz.test.ts src/app/room/\[code\]/quiz/
git commit -m "feat: implement quiz (抢答题) game"
```

---

## Task 10: Game — 排名猜猜猜 (Rank)

**Files:**
- Create: `server/data/rank-questions.ts`, `server/games/rank.ts`, `server/games/rank.test.ts`, `src/app/room/[code]/rank/page.tsx`

- [ ] **Step 1: Create rank question bank**

Write `server/data/rank-questions.ts`:

```typescript
export interface RankQuestion {
  topic: string;
  items: string[];
  correctOrder: number[];
}

export const rankQuestions: RankQuestion[] = [
  {
    topic: '以下国家面积从大到小排列',
    items: ['加拿大', '中国', '美国', '巴西', '澳大利亚'],
    correctOrder: [0, 3, 2, 1, 4],
  },
  {
    topic: '以下行星离太阳从近到远排列',
    items: ['地球', '火星', '金星', '水星', '木星'],
    correctOrder: [3, 2, 0, 1, 4],
  },
  {
    topic: '以下编程语言发布时间从早到晚',
    items: ['Python', 'Java', 'JavaScript', 'Go', 'Rust'],
    correctOrder: [0, 1, 2, 3, 4],
  },
  {
    topic: '以下动物寿命从长到短',
    items: ['乌龟', '大象', '鹦鹉', '狗', '仓鼠'],
    correctOrder: [0, 1, 2, 3, 4],
  },
  {
    topic: '以下建筑高度从高到低',
    items: ['哈利法塔', '上海中心', '东京晴空塔', '帝国大厦', '埃菲尔铁塔'],
    correctOrder: [0, 1, 2, 3, 4],
  },
  {
    topic: '以下社交媒体月活用户从多到少',
    items: ['Facebook', 'YouTube', 'WhatsApp', 'Instagram', 'TikTok'],
    correctOrder: [0, 1, 2, 3, 4],
  },
  {
    topic: '以下食物卡路里从高到低（每100g）',
    items: ['巧克力', '薯片', '米饭', '苹果', '黄瓜'],
    correctOrder: [0, 1, 2, 3, 4],
  },
  {
    topic: '以下奥运会举办时间从早到晚',
    items: ['北京奥运会', '伦敦奥运会', '里约奥运会', '东京奥运会', '巴黎奥运会'],
    correctOrder: [0, 1, 2, 3, 4],
  },
];

export function getRandomRankQuestions(count: number): RankQuestion[] {
  const shuffled = [...rankQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

- [ ] **Step 2: Write failing tests**

Write `server/games/rank.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { RankEngine } from './rank';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('RankEngine', () => {
  const engine = new RankEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 30 };

  it('initializes with shuffled items', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.round).toBe(1);
    expect(state.topic).toBeTruthy();
    expect(state.items).toHaveLength(5);
    expect(state.submissions).toEqual({});
  });

  it('hides correct order from clients', () => {
    const state = engine.init(makePlayers(3), settings);
    const view: any = engine.getClientState(state, 'p1');
    expect(view.correctOrder).toBeUndefined();
  });

  it('scores exact match 5 points, off-by-one 2 points', () => {
    const state: any = engine.init(makePlayers(2), settings);
    const correct = state.correctOrder;
    const result = engine.handleAction(state, 'p1', { type: 'submit', order: correct });
    const scoreEvent = result.events.find((e: any) => e.type === 'score-update' && e.playerId === 'p1');
    expect((scoreEvent as any).delta).toBe(25); // 5 items * 5 points each
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/rank.test.ts
```

- [ ] **Step 4: Implement RankEngine**

Write `server/games/rank.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomRankQuestions, RankQuestion } from '../data/rank-questions';
import { registerGame } from '../game-engine';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scoreSubmission(submitted: number[], correct: number[]): number {
  let score = 0;
  for (let i = 0; i < correct.length; i++) {
    if (submitted[i] === correct[i]) {
      score += 5;
    } else {
      const actualPos = correct.indexOf(submitted[i]);
      if (Math.abs(actualPos - i) === 1) score += 2;
    }
  }
  return score;
}

export class RankEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const questions = getRandomRankQuestions(settings.rounds);
    const q = questions[0];
    return {
      round: 1,
      totalRounds: settings.rounds,
      topic: q.topic,
      items: q.items,
      correctOrder: q.correctOrder,
      submissions: {} as Record<string, number[]>,
      timeLeft: settings.timeLimit,
      _questions: questions,
      _settings: settings,
      _players: players.map((p) => p.id),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'submit' && !s.submissions[playerId]) {
      const order = action.order as number[];
      s.submissions[playerId] = order;
      const score = scoreSubmission(order, s.correctOrder);
      events.push({ type: 'player-submitted', playerId });
      events.push({ type: 'score-update', playerId, delta: score });

      if (Object.keys(s.submissions).length >= s._players.length) {
        this.advanceRound(s, events);
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    return {
      round: s.round,
      totalRounds: s.totalRounds,
      topic: s.topic,
      items: s.items,
      mySubmission: s.submissions[playerId] ?? null,
      submittedCount: Object.keys(s.submissions).length,
      totalPlayers: s._players.length,
      timeLeft: s.timeLeft,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;
    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', correctOrder: s.correctOrder });
      this.advanceRound(s, events);
    }
    return { state: s, events, ended: s.round > s.totalRounds };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    events.push({ type: 'round-result', correctOrder: s.correctOrder, submissions: s.submissions });
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const q = s._questions[s.round - 1];
    s.topic = q.topic;
    s.items = q.items;
    s.correctOrder = q.correctOrder;
    s.submissions = {};
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round });
  }
}

registerGame('rank', new RankEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/rank.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Create rank game page**

Write `src/app/room/[code]/rank/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function RankPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => {
      setGameState(state);
      if (state.items && order.length === 0) {
        setOrder(state.items.map((_: any, i: number) => i));
      }
    };
    const handleEvent = (event: any) => {
      if (event.type === 'round-result') showToast('本轮结束!');
      if (event.type === 'new-round') setOrder([]);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, order.length]);

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, removed);
    setOrder(newOrder);
    setDragIndex(index);
  };

  const handleSubmit = useCallback(() => {
    sendAction({ type: 'submit', order });
  }, [sendAction, order]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const hasSubmitted = gameState.mySubmission !== null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="📊 排名猜猜猜" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 题 · {gameState.submittedCount}/{gameState.totalPlayers} 已提交
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-center mb-4">{gameState.topic}</h2>
        <div className="space-y-2">
          {order.map((itemIndex, position) => (
            <div
              key={itemIndex}
              draggable={!hasSubmitted}
              onDragStart={() => handleDragStart(position)}
              onDragOver={(e) => handleDragOver(e, position)}
              className={`glass rounded-xl px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing ${
                hasSubmitted ? 'opacity-60' : 'hover:bg-white/20'
              }`}
            >
              <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                {position + 1}
              </span>
              <span>{gameState.items[itemIndex]}</span>
            </div>
          ))}
        </div>
        {!hasSubmitted && (
          <button onClick={handleSubmit} className="w-full btn-primary mt-4">
            提交排名
          </button>
        )}
        {hasSubmitted && <p className="text-center text-white/40 text-sm mt-3">等待其他玩家...</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Import in server index and commit**

Add `import './games/rank';` to `server/index.ts`.

```bash
git add server/data/rank-questions.ts server/games/rank.ts server/games/rank.test.ts src/app/room/\[code\]/rank/
git commit -m "feat: implement ranking guess game"
```

---

## Task 11: Game — 故事接龙 (Story Chain)

**Files:**
- Create: `server/data/story-starters.ts`, `server/games/story.ts`, `server/games/story.test.ts`, `src/app/room/[code]/story/page.tsx`

- [ ] **Step 1: Create story starters**

Write `server/data/story-starters.ts`:

```typescript
export const storyStarters = [
  '那天早上醒来，我发现自己变成了一只猫。',
  '公司突然宣布，今天全员去火星出差。',
  '快递小哥送来了一个会说话的包裹。',
  '我在地铁上捡到了一本来自未来的日记。',
  '办公室的咖啡机突然开始预言未来。',
  '今天的会议室里多了一个没人认识的同事。',
  '下班后我按了电梯，门开了，里面是一片森林。',
  '老板说今天谁最后一个完成任务就能获得超能力。',
  '食堂阿姨神秘地递给我一碗会发光的面条。',
  '深夜加班时，我听到服务器机房传来了歌声。',
];

export function getRandomStarter(): string {
  return storyStarters[Math.floor(Math.random() * storyStarters.length)];
}
```

- [ ] **Step 2: Write failing tests**

Write `server/games/story.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { StoryEngine } from './story';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('StoryEngine', () => {
  const engine = new StoryEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 30 };

  it('initializes in writing phase with starter sentence', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.phase).toBe('writing');
    expect(state.lastSentence).toBeTruthy();
    expect(state.sentences).toHaveLength(0);
    expect(state.writerOrder).toHaveLength(6); // 3 players * 2 rounds
  });

  it('only shows last sentence to current writer', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const writerId = state.writerOrder[state.currentWriterIndex];
    const writerView: any = engine.getClientState(state, writerId);
    expect(writerView.lastSentence).toBeTruthy();
    expect(writerView.isMyTurn).toBe(true);
    const otherId = state.writerOrder.find((id: string) => id !== writerId);
    const otherView: any = engine.getClientState(state, otherId);
    expect(otherView.isMyTurn).toBe(false);
  });

  it('advances to next writer on submit', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const firstWriter = state.writerOrder[0];
    const result = engine.handleAction(state, firstWriter, { type: 'write', text: '然后我飞了起来。' });
    expect((result.state as any).currentWriterIndex).toBe(1);
    expect((result.state as any).sentences).toHaveLength(1);
  });

  it('transitions to reveal after all rounds', () => {
    const state: any = engine.init(makePlayers(2), settings);
    // 2 players * 2 rounds = 4 writes
    for (let i = 0; i < 4; i++) {
      const writer = state.writerOrder[state.currentWriterIndex];
      engine.handleAction(state, writer, { type: 'write', text: `句子${i + 1}` });
    }
    expect(state.phase).toBe('reveal');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/story.test.ts
```

- [ ] **Step 4: Implement StoryEngine**

Write `server/games/story.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomStarter } from '../data/story-starters';
import { registerGame } from '../game-engine';

export class StoryEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const playerIds = players.map((p) => p.id);
    const writerOrder: string[] = [];
    for (let r = 0; r < settings.rounds; r++) {
      writerOrder.push(...playerIds);
    }

    return {
      phase: 'writing' as 'writing' | 'reveal' | 'voting',
      currentWriterIndex: 0,
      writerOrder,
      sentences: [] as { playerId: string; text: string }[],
      lastSentence: getRandomStarter(),
      votes: {} as Record<string, string>,
      timeLeft: settings.timeLimit,
      _settings: settings,
      _players: playerIds,
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (s.phase === 'writing' && action.type === 'write') {
      const currentWriter = s.writerOrder[s.currentWriterIndex];
      if (playerId !== currentWriter) return { state: s, events, ended: false };

      const text = action.text as string;
      s.sentences.push({ playerId, text });
      s.lastSentence = text;
      s.currentWriterIndex += 1;
      s.timeLeft = s._settings.timeLimit;

      events.push({ type: 'sentence-added', playerId });

      if (s.currentWriterIndex >= s.writerOrder.length) {
        s.phase = 'reveal';
        events.push({ type: 'phase-change', phase: 'reveal' });
      } else {
        events.push({ type: 'next-writer', writerId: s.writerOrder[s.currentWriterIndex] });
      }
    }

    if (s.phase === 'reveal' && action.type === 'ready-to-vote') {
      s.phase = 'voting';
      s.timeLeft = s._settings.timeLimit;
      events.push({ type: 'phase-change', phase: 'voting' });
    }

    if (s.phase === 'voting' && action.type === 'vote') {
      s.votes[playerId] = action.sentencePlayerId as string;
      events.push({ type: 'player-voted', playerId });

      if (Object.keys(s.votes).length >= s._players.length) {
        const tally: Record<string, number> = {};
        for (const targetId of Object.values(s.votes) as string[]) {
          tally[targetId] = (tally[targetId] || 0) + 1;
        }
        let maxVotes = 0;
        let winnerId = '';
        for (const [id, count] of Object.entries(tally)) {
          if (count > maxVotes) { maxVotes = count; winnerId = id; }
        }
        if (winnerId) {
          events.push({ type: 'score-update', playerId: winnerId, delta: 20 });
          events.push({ type: 'vote-winner', playerId: winnerId, votes: maxVotes });
        }
        events.push({ type: 'game-over' });
        return { state: s, events, ended: true };
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const currentWriter = s.writerOrder[s.currentWriterIndex] ?? null;

    if (s.phase === 'writing') {
      return {
        phase: s.phase,
        isMyTurn: playerId === currentWriter,
        lastSentence: playerId === currentWriter ? s.lastSentence : null,
        sentenceCount: s.sentences.length,
        totalSentences: s.writerOrder.length,
        currentWriterIndex: s.currentWriterIndex,
        timeLeft: s.timeLeft,
      };
    }

    return {
      phase: s.phase,
      sentences: s.sentences,
      lastSentence: s.lastSentence,
      votedFor: s.votes[playerId] ?? null,
      votedCount: Object.keys(s.votes).length,
      totalPlayers: s._players.length,
      timeLeft: s.timeLeft,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    if (s.phase === 'writing') {
      s.timeLeft -= 1;
      if (s.timeLeft <= 0) {
        s.sentences.push({ playerId: s.writerOrder[s.currentWriterIndex], text: '（跳过）' });
        s.currentWriterIndex += 1;
        s.timeLeft = s._settings.timeLimit;
        if (s.currentWriterIndex >= s.writerOrder.length) {
          s.phase = 'reveal';
          events.push({ type: 'phase-change', phase: 'reveal' });
        }
      }
    }
    return { state: s, events, ended: false };
  }
}

registerGame('story', new StoryEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/story.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Create story game page**

Write `src/app/room/[code]/story/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function StoryPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'sentence-added') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 写好了!`);
      }
      if (event.type === 'vote-winner') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`最搞笑: ${player?.nickname}! 获得 ${event.votes} 票`);
      }
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendAction({ type: 'write', text: input.trim() });
    setInput('');
  };

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="📖 故事接龙" timeLeft={gameState.timeLeft} />
      {gameState.phase === 'writing' && (
        <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      )}
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      {gameState.phase === 'writing' && (
        <div className="card">
          <div className="text-center text-sm text-white/60 mb-2">
            第 {gameState.sentenceCount + 1} / {gameState.totalSentences} 句
          </div>
          {gameState.isMyTurn ? (
            <div className="space-y-3">
              <div className="glass rounded-xl p-4">
                <div className="text-sm text-white/60 mb-1">上一句:</div>
                <div className="text-lg">{gameState.lastSentence}</div>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="续写一句话..."
                maxLength={100}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none h-24"
              />
              <button onClick={handleSubmit} disabled={!input.trim()} className="w-full btn-primary disabled:opacity-50">
                提交
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✍️</div>
              <p className="text-white/60">等待其他玩家写作中...</p>
            </div>
          )}
        </div>
      )}

      {gameState.phase === 'reveal' && (
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-center">完整故事</h3>
          <div className="space-y-2">
            {gameState.sentences.map((s: any, i: number) => {
              const player = room.players.find((p) => p.id === s.playerId);
              return (
                <div key={i} className="glass rounded-xl p-3">
                  <span className="text-white/40 text-xs">{player?.nickname}</span>
                  <div>{s.text}</div>
                </div>
              );
            })}
          </div>
          {room.hostId === playerId && (
            <button onClick={() => sendAction({ type: 'ready-to-vote' })} className="w-full btn-primary mt-4">
              开始投票: 最搞笑的一句
            </button>
          )}
        </div>
      )}

      {gameState.phase === 'voting' && (
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-center">投票: 最搞笑的一句</h3>
          <div className="space-y-2">
            {gameState.sentences
              .filter((s: any) => s.playerId !== playerId)
              .map((s: any, i: number) => {
                const player = room.players.find((p) => p.id === s.playerId);
                return (
                  <button
                    key={i}
                    onClick={() => sendAction({ type: 'vote', sentencePlayerId: s.playerId })}
                    disabled={gameState.votedFor !== null}
                    className={`w-full glass rounded-xl p-3 text-left hover:bg-white/20 disabled:opacity-60 ${
                      gameState.votedFor === s.playerId ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    <span className="text-white/40 text-xs">{player?.nickname}</span>
                    <div>{s.text}</div>
                  </button>
                );
              })}
          </div>
          <p className="text-center text-white/40 text-sm mt-3">
            {gameState.votedCount}/{gameState.totalPlayers} 已投票
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Import in server index and commit**

Add `import './games/story';` to `server/index.ts`.

```bash
git add server/data/story-starters.ts server/games/story.ts server/games/story.test.ts src/app/room/\[code\]/story/
git commit -m "feat: implement story chain (故事接龙) game"
```

---

## Task 12: Game — 听歌识曲 (Music Quiz)

**Files:**
- Create: `server/spotify.ts`, `server/games/music.ts`, `server/games/music.test.ts`, `src/app/room/[code]/music/page.tsx`

- [ ] **Step 1: Create Spotify client**

Write `server/spotify.ts`:

```typescript
interface SpotifyToken {
  token: string;
  expiresAt: number;
}

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface TrackInfo {
  name: string;
  artist: string;
  previewUrl: string;
}

const PLAYLIST_IDS: Record<string, string> = {
  'chinese-pop': '37i9dQZF1DX4dxJNMnMPOx',
  'us-pop': '37i9dQZF1DXcBWIGoYBM5M',
  'kpop': '37i9dQZF1DX9tPFwDMOaN1',
  'jpop': '37i9dQZF1DXdbRLJPSmnyq',
};

export async function getTracksFromPlaylist(genre: string, count: number): Promise<TrackInfo[]> {
  const token = await getAccessToken();
  const playlistId = PLAYLIST_IDS[genre] || PLAYLIST_IDS['chinese-pop'];

  const resp = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists(name),preview_url))`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await resp.json();
  const tracks: TrackInfo[] = (data.items || [])
    .filter((item: any) => item.track?.preview_url)
    .map((item: any) => ({
      name: item.track.name,
      artist: item.track.artists[0]?.name || 'Unknown',
      previewUrl: item.track.preview_url,
    }));

  const shuffled = tracks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateOptions(correct: string, allTracks: TrackInfo[]): string[] {
  const others = allTracks
    .map((t) => t.name)
    .filter((n) => n !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [correct, ...others].sort(() => Math.random() - 0.5);
  return options;
}
```

- [ ] **Step 2: Write tests for music engine (mock Spotify)**

Write `server/games/music.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MusicEngine } from './music';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: '#ff0000',
    score: 0,
    online: true,
  }));

describe('MusicEngine', () => {
  const engine = new MusicEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 15 };

  it('initializes with preloaded tracks state', () => {
    const mockTracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
    ];
    const state: any = engine.initWithTracks(makePlayers(3), settings, mockTracks);
    expect(state.round).toBe(1);
    expect(state.previewUrl).toBe('http://example.com/a.mp3');
    expect(state.options).toHaveLength(4);
    expect(state.options).toContain('Song A');
  });

  it('hides correct answer from client', () => {
    const mockTracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
    ];
    const state = engine.initWithTracks(makePlayers(3), settings, mockTracks);
    const view: any = engine.getClientState(state, 'p1');
    expect(view.correctAnswer).toBeUndefined();
  });

  it('scores correct answer', () => {
    const mockTracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
    ];
    const state: any = engine.initWithTracks(makePlayers(2), settings, mockTracks);
    const correctName = state.correctAnswer;
    const correctIdx = state.options.indexOf(correctName);
    const result = engine.handleAction(state, 'p1', { type: 'answer', answer: correctIdx });
    expect(result.events.some((e: any) => e.type === 'score-update')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run server/games/music.test.ts
```

- [ ] **Step 4: Implement MusicEngine**

Write `server/games/music.ts`:

```typescript
import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { TrackInfo, generateOptions } from '../spotify';
import { registerGame } from '../game-engine';

const FILLER_NAMES = ['星晴', '告白气球', '七里香', '晴天', '稻香', '简单爱', '夜曲', '青花瓷'];

export class MusicEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    return this.initWithTracks(players, settings, []);
  }

  initWithTracks(players: Player[], settings: RoomSettings, tracks: TrackInfo[]) {
    const firstTrack = tracks[0];
    const allNames = tracks.length > 0
      ? tracks.map((t) => t.name)
      : FILLER_NAMES;
    const options = firstTrack
      ? generateOptions(firstTrack.name, tracks)
      : allNames.sort(() => Math.random() - 0.5).slice(0, 4);

    return {
      round: 1,
      totalRounds: Math.min(settings.rounds, Math.max(tracks.length, 2)),
      previewUrl: firstTrack?.previewUrl || '',
      options,
      correctAnswer: firstTrack?.name || options[0],
      answeredPlayerIds: [] as string[],
      answers: {} as Record<string, { answer: number; time: number }>,
      timeLeft: settings.timeLimit,
      _tracks: tracks,
      _allNames: allNames,
      _settings: settings,
      _players: players.map((p) => p.id),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'answer' && !s.answers[playerId]) {
      const answer = action.answer as number;
      s.answers[playerId] = { answer, time: s.timeLeft };
      s.answeredPlayerIds.push(playerId);

      const selectedName = s.options[answer];
      if (selectedName === s.correctAnswer) {
        const bonus = Math.max(5, Math.round((s.timeLeft / s._settings.timeLimit) * 30));
        events.push({ type: 'score-update', playerId, delta: bonus });
        events.push({ type: 'correct-answer', playerId, bonus });
      } else {
        events.push({ type: 'wrong-answer', playerId });
      }

      if (Object.keys(s.answers).length >= s._players.length) {
        this.advanceRound(s, events);
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    return {
      round: s.round,
      totalRounds: s.totalRounds,
      previewUrl: s.previewUrl,
      options: s.options,
      myAnswer: s.answers[playerId]?.answer ?? null,
      answeredCount: Object.keys(s.answers).length,
      totalPlayers: s._players.length,
      timeLeft: s.timeLeft,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;
    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', correctAnswer: s.correctAnswer });
      this.advanceRound(s, events);
    }
    return { state: s, events, ended: s.round > s.totalRounds };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    events.push({ type: 'round-result', correctAnswer: s.correctAnswer });
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const track = s._tracks[s.round - 1];
    if (track) {
      s.previewUrl = track.previewUrl;
      s.correctAnswer = track.name;
      s.options = generateOptions(track.name, s._tracks);
    }
    s.answers = {};
    s.answeredPlayerIds = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round });
  }
}

registerGame('music', new MusicEngine());
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/games/music.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Wire Spotify fetch into server start-game flow**

In `server/index.ts`, modify the `room:start` handler to pre-fetch tracks for music game:

```typescript
import { getTracksFromPlaylist } from './spotify';
import { MusicEngine } from './games/music';

// Inside room:start handler, replace the generic init with:
socket.on('room:start', async ({ game }) => {
  const info = socketPlayerMap.get(socket.id);
  if (!info) return;
  const room = roomManager.getRoom(info.roomCode);
  if (!room || room.hostId !== info.playerId) return;

  const engine = getGameEngine(game);
  if (!engine) return;

  let state: unknown;
  if (game === 'music') {
    try {
      const tracks = await getTracksFromPlaylist('chinese-pop', room.settings.rounds);
      state = (engine as MusicEngine).initWithTracks(room.players, room.settings, tracks);
    } catch {
      state = engine.init(room.players, room.settings);
    }
  } else {
    state = engine.init(room.players, room.settings);
  }

  roomManager.setGameState(info.roomCode, game, state);
  broadcastRoomState(info.roomCode);
  broadcastGameState(info.roomCode);
  startGameTimer(info.roomCode);
});
```

- [ ] **Step 7: Create music game page**

Write `src/app/room/[code]/music/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function MusicPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => {
      setGameState(state);
      if (audioRef.current && state.previewUrl) {
        audioRef.current.src = state.previewUrl;
        audioRef.current.play().catch(() => {});
      }
    };
    const handleEvent = (event: any) => {
      if (event.type === 'correct-answer') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 答对了! +${event.bonus}分`);
      }
      if (event.type === 'round-result' || event.type === 'time-up') {
        setCorrectAnswer(event.correctAnswer as string);
        setTimeout(() => setCorrectAnswer(null), 2000);
      }
      if (event.type === 'new-round') setCorrectAnswer(null);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const hasAnswered = gameState.myAnswer !== null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <audio ref={audioRef} />
      <StatusBar roomCode={code} gameName="🎵 听歌识曲" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 首 · {gameState.answeredCount}/{gameState.totalPlayers} 已作答
      </div>

      <div className="card text-center py-8">
        <div className="text-6xl mb-4">🎶</div>
        <p className="text-white/60">仔细听...</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {gameState.options.map((opt: string, i: number) => {
          let style = 'glass hover:bg-white/20';
          if (correctAnswer !== null) {
            if (opt === correctAnswer) style = 'bg-green-500/40 border-green-400';
            else if (gameState.myAnswer === i) style = 'bg-red-500/40 border-red-400';
          } else if (gameState.myAnswer === i) {
            style = 'bg-blue-500/30 border-blue-400';
          }
          return (
            <button
              key={i}
              onClick={() => sendAction({ type: 'answer', answer: i })}
              disabled={hasAnswered}
              className={`${style} rounded-xl px-6 py-4 text-left text-lg border border-transparent transition-all disabled:cursor-default`}
            >
              <span className="font-bold mr-3 text-white/50">{'ABCD'[i]}</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Import in server index and commit**

Add `import './games/music';` to `server/index.ts`.

```bash
git add server/spotify.ts server/games/music.ts server/games/music.test.ts src/app/room/\[code\]/music/
git commit -m "feat: implement music quiz game with Spotify integration"
```

---

## Task 13: Result Page + Score Aggregation

**Files:**
- Create: `src/app/room/[code]/result/page.tsx`

- [ ] **Step 1: Create result page**

Write `src/app/room/[code]/result/page.tsx`:

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerHistory } from '@/hooks/usePlayerHistory';
import StatusBar from '@/components/StatusBar';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const { addRecord } = usePlayerHistory();

  const sortedPlayers = room
    ? [...room.players].sort((a, b) => b.score - a.score)
    : [];

  const myRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

  useEffect(() => {
    if (!room || !playerId) return;
    const me = room.players.find((p) => p.id === playerId);
    if (!me || !room.currentGame) return;

    const gameNames: Record<string, string> = {
      draw: '你画我猜', music: '听歌识曲', emoji: 'Emoji猜词',
      spy: '谁是卧底', quiz: '抢答题', rank: '排名猜猜猜', story: '故事接龙',
    };

    addRecord({
      game: gameNames[room.currentGame] || room.currentGame,
      score: me.score,
      rank: myRank,
      totalPlayers: room.players.length,
      date: new Date().toISOString(),
    });
  }, [room?.status]);

  useEffect(() => {
    if (room?.status === 'waiting') {
      router.push(`/room/${code}`);
    }
  }, [room?.status, code, router]);

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isHost = room.hostId === playerId;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <StatusBar roomCode={code} gameName="游戏结束" />

      <div className="text-center py-4">
        <div className="text-5xl mb-2">{medals[myRank - 1] || '🎮'}</div>
        <h2 className="text-2xl font-bold">
          {myRank === 1 ? '你赢了!' : `第 ${myRank} 名`}
        </h2>
      </div>

      <div className="card">
        <h3 className="font-bold text-lg mb-3">排行榜</h3>
        <div className="space-y-2">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 glass rounded-xl px-4 py-3 ${
                p.id === playerId ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <span className="text-2xl w-10 text-center">{medals[i] || `${i + 1}`}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: p.color }}
              >
                {p.nickname[0]}
              </div>
              <span className="flex-1 font-semibold">{p.nickname}</span>
              <span className="text-xl font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="flex gap-3">
          <button
            onClick={() => sendAction({ type: 'back-to-room' })}
            className="flex-1 btn-primary"
          >
            换个游戏
          </button>
        </div>
      )}
      {!isHost && <p className="text-center text-white/40 text-sm">等待房主操作...</p>}
    </div>
  );
}
```

- [ ] **Step 2: Add back-to-room handler in server**

In `server/index.ts`, inside the `game:action` handler, add a check before processing:

```typescript
// At the start of game:action handler, add:
if (action.type === 'back-to-room') {
  const info = socketPlayerMap.get(socket.id);
  if (!info) return;
  const room = roomManager.getRoom(info.roomCode);
  if (!room || room.hostId !== info.playerId) return;
  roomManager.resetToWaiting(info.roomCode);
  broadcastRoomState(info.roomCode);
  return;
}
```

- [ ] **Step 3: Add score-update handling in server**

In `server/index.ts`, process `score-update` events to update room player scores. After the `handleAction` call, add:

```typescript
for (const event of result.events) {
  if (event.type === 'score-update') {
    const player = room.players.find((p) => p.id === event.playerId);
    if (player) player.score += event.delta as number;
  }
  io.to(info.roomCode).emit('game:event', event);
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/room/\[code\]/result/ server/index.ts
git commit -m "feat: add result page with leaderboard and score tracking"
```

---

## Task 14: Final Integration + Server Imports

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Ensure all game engines are imported**

At the top of `server/index.ts`, verify all imports are present:

```typescript
import './games/draw';
import './games/emoji';
import './games/spy';
import './games/quiz';
import './games/rank';
import './games/story';
import './games/music';
```

- [ ] **Step 2: Add NEXT_PUBLIC_SERVER_URL to .env.local**

Append to `.env.local`:

```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

- [ ] **Step 3: Run all server tests**

```bash
npx vitest run server/
```

Expected: All tests pass across all game engines.

- [ ] **Step 4: Run full build**

```bash
npm run build
```

- [ ] **Step 5: Manual smoke test**

Start both servers in separate terminals:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

Open `http://localhost:3000`, create a room, open a second browser tab and join with the room code. Verify:
- Room creation and joining works
- Player list updates in real-time
- At least one game (e.g. 抢答题) can be started and played through
- Result page shows scores
- "换个游戏" returns to room

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: wire up all 7 games and complete integration"
```
