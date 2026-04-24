import { describe, it, expect } from 'vitest';
import { StoryEngine } from './story';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, nickname: `P${i + 1}`, color: '#ff0000', score: 0, online: true,
  }));

describe('StoryEngine', () => {
  const engine = new StoryEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 30 };

  it('initializes in writing phase', () => {
    const state: any = engine.init(makePlayers(3), settings);
    expect(state.phase).toBe('writing');
    expect(state.lastSentence).toBeTruthy();
    expect(state.writerOrder).toHaveLength(6);
  });

  it('shows last sentence only to current writer', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const writerId = state.writerOrder[0];
    const writerView: any = engine.getClientState(state, writerId);
    expect(writerView.isMyTurn).toBe(true);
    expect(writerView.lastSentence).toBeTruthy();
  });

  it('advances to next writer on submit', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const firstWriter = state.writerOrder[0];
    engine.handleAction(state, firstWriter, { type: 'write', text: '然后我飞了起来。' });
    expect(state.currentWriterIndex).toBe(1);
    expect(state.sentences).toHaveLength(1);
  });

  it('transitions to reveal after all writes', () => {
    const state: any = engine.init(makePlayers(2), settings);
    for (let i = 0; i < 4; i++) {
      const writer = state.writerOrder[state.currentWriterIndex];
      engine.handleAction(state, writer, { type: 'write', text: `句子${i + 1}` });
    }
    expect(state.phase).toBe('reveal');
  });
});
