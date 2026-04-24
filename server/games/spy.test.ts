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
    for (const pid of state.alivePlayers) {
      engine.handleAction(state, pid, { type: 'describe', text: 'something' });
    }
    expect(state.phase).toBe('vote');
  });
});
