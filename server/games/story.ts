import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomStarter } from '../data/story-starters';
import { registerGame } from '../game-engine';

export class StoryEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const playerIds = players.map((p) => p.id);
    const writerOrder: string[] = [];
    for (let r = 0; r < settings.rounds; r++) {
      writerOrder.push(...playerIds);
    }
    return {
      phase: 'writing' as 'writing' | 'reveal' | 'voting',
      currentWriterIndex: 0,
      writerOrder,
      sentences: [] as { playerId: string; text: string }[],
      lastSentence: getRandomStarter(),
      votes: {} as Record<string, string>,
      timeLeft: settings.timeLimit,
      _settings: settings,
      _players: playerIds,
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (s.phase === 'writing' && action.type === 'write') {
      const currentWriter = s.writerOrder[s.currentWriterIndex];
      if (playerId !== currentWriter) return { state: s, events, ended: false };
      const text = action.text as string;
      s.sentences.push({ playerId, text });
      s.lastSentence = text;
      s.currentWriterIndex += 1;
      s.timeLeft = s._settings.timeLimit;
      events.push({ type: 'sentence-added', playerId });
      if (s.currentWriterIndex >= s.writerOrder.length) {
        s.phase = 'reveal';
        events.push({ type: 'phase-change', phase: 'reveal' });
      } else {
        events.push({ type: 'next-writer', writerId: s.writerOrder[s.currentWriterIndex] });
      }
    }

    if (s.phase === 'reveal' && action.type === 'ready-to-vote') {
      s.phase = 'voting';
      s.timeLeft = s._settings.timeLimit;
      events.push({ type: 'phase-change', phase: 'voting' });
    }

    if (s.phase === 'voting' && action.type === 'vote') {
      s.votes[playerId] = action.sentencePlayerId as string;
      events.push({ type: 'player-voted', playerId });
      if (Object.keys(s.votes).length >= s._players.length) {
        const tally: Record<string, number> = {};
        for (const targetId of Object.values(s.votes) as string[]) {
          tally[targetId] = (tally[targetId] || 0) + 1;
        }
        let maxVotes = 0;
        let winnerId = '';
        for (const [id, count] of Object.entries(tally)) {
          if (count > maxVotes) { maxVotes = count; winnerId = id; }
        }
        if (winnerId) {
          events.push({ type: 'score-update', playerId: winnerId, delta: 20 });
          events.push({ type: 'vote-winner', playerId: winnerId, votes: maxVotes });
        }
        events.push({ type: 'game-over' });
        return { state: s, events, ended: true };
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const currentWriter = s.writerOrder[s.currentWriterIndex] ?? null;
    if (s.phase === 'writing') {
      return {
        phase: s.phase,
        isMyTurn: playerId === currentWriter,
        lastSentence: playerId === currentWriter ? s.lastSentence : null,
        sentenceCount: s.sentences.length,
        totalSentences: s.writerOrder.length,
        currentWriterIndex: s.currentWriterIndex,
        timeLeft: s.timeLeft,
      };
    }
    return {
      phase: s.phase,
      sentences: s.sentences,
      lastSentence: s.lastSentence,
      votedFor: s.votes[playerId] ?? null,
      votedCount: Object.keys(s.votes).length,
      totalPlayers: s._players.length,
      timeLeft: s.timeLeft,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    const events: GameEvent[] = [];
    if (s.phase === 'writing') {
      s.timeLeft -= 1;
      if (s.timeLeft <= 0) {
        s.sentences.push({ playerId: s.writerOrder[s.currentWriterIndex], text: '（跳过）' });
        s.currentWriterIndex += 1;
        s.timeLeft = s._settings.timeLimit;
        if (s.currentWriterIndex >= s.writerOrder.length) {
          s.phase = 'reveal';
          events.push({ type: 'phase-change', phase: 'reveal' });
        }
      }
    }
    return { state: s, events, ended: false };
  }
}

registerGame('story', new StoryEngine());
