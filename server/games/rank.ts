import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomRankQuestions } from '../data/rank-questions';
import { registerGame } from '../game-engine';

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
