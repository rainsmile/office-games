import { describe, it, expect } from 'vitest';
import { RankEngine } from './rank';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, nickname: `P${i + 1}`, color: '#ff0000', score: 0, online: true,
  }));

describe('RankEngine', () => {
  const engine = new RankEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 30 };

  it('initializes with topic and items', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.round).toBe(1);
    expect(state.topic).toBeTruthy();
    expect(state.items).toHaveLength(5);
  });

  it('hides correct order from clients', () => {
    const state = engine.init(makePlayers(3), settings);
    const view: any = engine.getClientState(state, 'p1');
    expect(view.correctOrder).toBeUndefined();
  });

  it('scores exact match at 25 points', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const correct = state.correctOrder;
    const result = engine.handleAction(state, 'p1', { type: 'submit', order: correct });
    const scoreEvent = result.events.find((e: any) => e.type === 'score-update');
    expect((scoreEvent as any).delta).toBe(25);
  });
});
