import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomEmojiWord } from '../data/emoji-words';
import { registerGame } from '../game-engine';

export class EmojiEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const word = getRandomEmojiWord();
    return {
      presenterId: players[0].id,
      word: word.word,
      emojis: '',
      round: 1,
      totalRounds: settings.rounds * players.length,
      guessedPlayerIds: [] as string[],
      timeLeft: settings.timeLimit,
      _players: players.map((p) => p.id),
      _presenterIndex: 0,
      _settings: settings,
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (action.type === 'set-emojis' && playerId === s.presenterId) {
      s.emojis = action.emojis as string;
      events.push({ type: 'emojis-updated', emojis: s.emojis });
    }

    if (action.type === 'guess' && playerId !== s.presenterId) {
      const guess = (action.text as string).trim();
      if (guess === s.word && !s.guessedPlayerIds.includes(playerId)) {
        s.guessedPlayerIds.push(playerId);
        const bonus = Math.max(10, Math.round((s.timeLeft / s._settings.timeLimit) * 50));
        events.push({ type: 'correct-guess', playerId, score: bonus });
        events.push({ type: 'score-update', playerId, delta: bonus });
        events.push({ type: 'score-update', playerId: s.presenterId, delta: 10 });

        if (s.guessedPlayerIds.length >= s._players.length - 1) {
          this.advanceRound(s, events);
        }
      } else {
        events.push({ type: 'chat', playerId, text: guess });
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const base = {
      presenterId: s.presenterId,
      emojis: s.emojis,
      round: s.round,
      totalRounds: s.totalRounds,
      guessedPlayerIds: s.guessedPlayerIds,
      timeLeft: s.timeLeft,
      hints: s.word.replace(/./g, '_ ').trim(),
    };
    if (playerId === s.presenterId || s.guessedPlayerIds.includes(playerId)) {
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
    return { state: s, events, ended: s.round > s.totalRounds };
  }

  private advanceRound(s: any, events: GameEvent[]) {
    s._presenterIndex += 1;
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const idx = s._presenterIndex % s._players.length;
    s.presenterId = s._players[idx];
    s.word = getRandomEmojiWord().word;
    s.emojis = '';
    s.guessedPlayerIds = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round, presenterId: s.presenterId });
  }
}

registerGame('emoji', new EmojiEngine());
