import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomQuestions } from '../data/quiz-questions';
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
