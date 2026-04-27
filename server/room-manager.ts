import { v4 as uuid } from 'uuid';
import type { Player, Room, RoomSettings, GameType } from '../src/lib/types';

const PLAYER_COLORS = ['#ff6b6b', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6348', '#ff7eb3', '#00d2d3'];

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
      settings: { rounds: 3, timeLimit: 60, musicGenre: 'chinese-pop' },
      lastActivity: Date.now(),
    };

    this.rooms.set(code, room);
    return { code, player };
  }

  joinRoom(code: string, nickname: string): { player: Player } {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.players.length >= 8) throw new Error('Room is full');

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
