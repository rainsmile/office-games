import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { getRandomWordPair } from '../data/spy-words';
import { registerGame } from '../game-engine';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class SpyEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const pair = getRandomWordPair();
    const spyCount = players.length >= 6 ? 2 : 1;
    const shuffled = shuffle(players.map((p) => p.id));
    const spyIds = shuffled.slice(0, spyCount);

    return {
      phase: 'describe' as const,
      alivePlayers: players.map((p) => p.id),
      spyIds,
      normalWord: pair.normal,
      spyWord: pair.spy,
      currentSpeakerIndex: 0,
      descriptions: {} as Record<string, string>,
      votes: {} as Record<string, string>,
      round: 1,
      eliminatedThisRound: null as string | null,
      timeLeft: settings.timeLimit,
      _settings: settings,
      _allPlayers: players.map((p) => p.id),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    const events: GameEvent[] = [];

    if (s.phase === 'describe' && action.type === 'describe') {
      s.descriptions[playerId] = action.text as string;
      events.push({ type: 'player-described', playerId, text: action.text as string });

      const allDescribed = s.alivePlayers.every((id: string) => s.descriptions[id]);
      if (allDescribed) {
        s.phase = 'vote';
        s.votes = {};
        s.timeLeft = s._settings.timeLimit;
        events.push({ type: 'phase-change', phase: 'vote' });
      }
    }

    if (s.phase === 'vote' && action.type === 'vote') {
      s.votes[playerId] = action.targetId as string;
      events.push({ type: 'player-voted', playerId });

      const allVoted = s.alivePlayers.every((id: string) => s.votes[id]);
      if (allVoted) {
        const tally: Record<string, number> = {};
        for (const targetId of Object.values(s.votes) as string[]) {
          tally[targetId] = (tally[targetId] || 0) + 1;
        }
        const maxVotes = Math.max(...Object.values(tally));
        const eliminated = Object.entries(tally).filter(([, v]) => v === maxVotes);

        if (eliminated.length === 1) {
          const eliminatedId = eliminated[0][0];
          s.alivePlayers = s.alivePlayers.filter((id: string) => id !== eliminatedId);
          s.eliminatedThisRound = eliminatedId;
          const isSpy = s.spyIds.includes(eliminatedId);
          events.push({ type: 'player-eliminated', playerId: eliminatedId, isSpy });
        } else {
          events.push({ type: 'vote-tie', tiedPlayers: eliminated.map(([id]) => id) });
        }

        const aliveSpies = s.spyIds.filter((id: string) => s.alivePlayers.includes(id));
        const aliveNormals = s.alivePlayers.filter((id: string) => !s.spyIds.includes(id));

        if (aliveSpies.length === 0) {
          events.push({ type: 'game-over', winner: 'normal', spyIds: s.spyIds });
          for (const id of s._allPlayers) {
            if (!s.spyIds.includes(id)) {
              events.push({ type: 'score-update', playerId: id, delta: 20 });
            }
          }
          return { state: s, events, ended: true };
        }

        if (aliveNormals.length <= aliveSpies.length) {
          events.push({ type: 'game-over', winner: 'spy', spyIds: s.spyIds });
          for (const id of s.spyIds) {
            events.push({ type: 'score-update', playerId: id, delta: 30 });
          }
          return { state: s, events, ended: true };
        }

        s.phase = 'describe';
        s.descriptions = {};
        s.votes = {};
        s.round += 1;
        s.eliminatedThisRound = null;
        s.timeLeft = s._settings.timeLimit;
        events.push({ type: 'new-round', round: s.round });
      }
    }

    return { state: s, events, ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    const isSpy = s.spyIds.includes(playerId);
    return {
      phase: s.phase,
      alivePlayers: s.alivePlayers,
      round: s.round,
      myWord: isSpy ? s.spyWord : s.normalWord,
      descriptions: s.descriptions,
      votes: s.phase === 'vote' ? Object.keys(s.votes) : [],
      eliminatedThisRound: s.eliminatedThisRound,
      timeLeft: s.timeLeft,
      isSpy,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    s.timeLeft -= 1;
    return { state: s, events: [], ended: false };
  }
}

registerGame('spy', new SpyEngine());
