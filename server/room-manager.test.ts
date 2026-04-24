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
      (rm as any).rooms.get(code).lastActivity = Date.now() - 31 * 60 * 1000;
      rm.cleanup();
      expect(rm.getRoom(code)).toBeUndefined();
    });
  });
});
