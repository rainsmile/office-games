import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent } from '../../src/lib/types';
import { TrackInfo, generateOptions } from '../spotify';
import { registerGame } from '../game-engine';

const FILLER_NAMES = ['星晴', '告白气球', '七里香', '晴天', '稻香', '简单爱', '夜曲', '青花瓷'];

export class MusicEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    return this.initWithTracks(players, settings, []);
  }

  initWithTracks(players: Player[], settings: RoomSettings, tracks: TrackInfo[]) {
    const firstTrack = tracks[0];
    const allNames = tracks.length > 0 ? tracks.map((t) => t.name) : FILLER_NAMES;
    const options = firstTrack
      ? generateOptions(firstTrack.name, tracks)
      : allNames.sort(() => Math.random() - 0.5).slice(0, 4);

    return {
      round: 1,
      totalRounds: Math.min(settings.rounds, Math.max(tracks.length, 2)),
      previewUrl: firstTrack?.previewUrl || '',
      options,
      correctAnswer: firstTrack?.name || options[0],
      answeredPlayerIds: [] as string[],
      answers: {} as Record<string, { answer: number; time: number }>,
      timeLeft: settings.timeLimit,
      _tracks: tracks,
      _allNames: allNames,
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
      s.answeredPlayerIds.push(playerId);

      const selectedName = s.options[answer];
      if (selectedName === s.correctAnswer) {
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
      previewUrl: s.previewUrl,
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
    events.push({ type: 'round-result', correctAnswer: s.correctAnswer });
    s.round += 1;
    if (s.round > s.totalRounds) {
      events.push({ type: 'game-over' });
      return;
    }
    const track = s._tracks[s.round - 1];
    if (track) {
      s.previewUrl = track.previewUrl;
      s.correctAnswer = track.name;
      s.options = generateOptions(track.name, s._tracks);
    }
    s.answers = {};
    s.answeredPlayerIds = [];
    s.timeLeft = s._settings.timeLimit;
    events.push({ type: 'new-round', round: s.round });
  }
}

registerGame('music', new MusicEngine());
