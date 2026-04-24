import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomWord } from '../data/draw-words';
import { registerGame } from '../game-engine';

function generateHints(word: string): string {
  return word.replace(/./g, '_ ').trim();
}

export class DrawEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    return {
      drawerId: players[0].id,
      word: getRandomWord(),
      hints: '',
      round: 1,
      totalRounds: settings.rounds * players.length,
      guessedPlayerIds: [] as string[],
      strokes: [],
      timeLeft: settings.timeLimit,
      _players: players.map((p) => p.id),
      _drawerIndex: 0,
      _roundsPerPlayer: settings.rounds,
      _settings: settings,
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'guess' && playerId !== s.drawerId) {
      const guess = (action.text as string).trim();
      if (guess === s.word && !s.guessedPlayerIds.includes(playerId)) {
        s.guessedPlayerIds.push(playerId);
        const bonus = Math.max(10, Math.round(s.timeLeft / s._settings.timeLimit * 50));
        events.push({ type: 'correct-guess', playerId, score: bonus });
        events.push({ type: 'score-update', playerId, delta: bonus });
        events.push({ type: 'score-update', playerId: s.drawerId, delta: 10 });

        const nonDrawerCount = s._players.length - 1;
        if (s.guessedPlayerIds.length >= nonDrawerCount) {
          this.advanceRound(s, events);
        }
      } else {
        events.push({ type: 'chat', playerId, text: guess });
      }
    }

    if (action.type === 'clear-canvas') {
      s.strokes = [];
      events.push({ type: 'canvas-cleared' });
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const base = {
      drawerId: s.drawerId,
      round: s.round,
      totalRounds: s.totalRounds,
      guessedPlayerIds: s.guessedPlayerIds,
      timeLeft: s.timeLeft,
      hints: generateHints(s.word),
    };

    if (playerId === s.drawerId || s.guessedPlayerIds.includes(playerId)) {
      return { ...base, word: s.word };
    }
    return base;
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    s.timeLeft -= 1;

    if (s.timeLeft <= 0) {
      events.push({ type: 'time-up', word: s.word });
      this.advanceRound(s, events);
    }

    const totalRoundsComplete = s.round > s.totalRounds;
    return { state: s, events, ended: totalRoundsComplete };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    s._drawerIndex += 1;
    s.round += 1;

    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }

    const playerIndex = s._drawerIndex % s._players.length;
    s.drawerId = s._players[playerIndex];
    s.word = getRandomWord();
    s.guessedPlayerIds = [];
    s.strokes = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round, drawerId: s.drawerId });
  }
}

registerGame('draw', new DrawEngine());
