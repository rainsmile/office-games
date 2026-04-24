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
