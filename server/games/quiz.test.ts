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

  it('scores correct answer', () => {
    const state: any = engine.init(makePlayers(3), settings);
    const correct = state.correctAnswer;
    state.timeLeft = 8;
    const result = engine.handleAction(state, 'p1', { type: 'answer', answer: correct });
    expect(result.events.some((e: any) => e.type === 'score-update')).toBe(true);
  });
});
