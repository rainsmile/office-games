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
    expect(state.totalRounds).toBe(6);
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

  it('scores correct guess', () => {
    const state: any = engine.init(makePlayers(2), settings);
    const word = state.word;
    const result = engine.handleAction(state, 'p2', { type: 'guess', text: word });
    expect(result.state.guessedPlayerIds).toContain('p2');
    expect(result.events.some((e: any) => e.type === 'correct-guess')).toBe(true);
  });

  it('tick decrements timeLeft', () => {
    const state: any = engine.init(makePlayers(2), settings);
    state.timeLeft = 1;
    const result = engine.tick!(state);
    expect(result.state.timeLeft).toBe(0);
  });
});
