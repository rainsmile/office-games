import { describe, it, expect } from 'vitest';
import { MusicEngine } from './music';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, nickname: `P${i + 1}`, color: '#ff0000', score: 0, online: true,
  }));

describe('MusicEngine', () => {
  const engine = new MusicEngine();
  const settings: RoomSettings = { rounds: 2, timeLimit: 15 };

  it('initializes with tracks', () => {
    const tracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
    ];
    const state: any = engine.initWithTracks(makePlayers(3), settings, tracks);
    expect(state.round).toBe(1);
    expect(state.previewUrl).toBe('http://example.com/a.mp3');
    expect(state.options).toContain('Song A');
  });

  it('hides answer from client', () => {
    const tracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
    ];
    const state = engine.initWithTracks(makePlayers(3), settings, tracks);
    const view: any = engine.getClientState(state, 'p1');
    expect(view.correctAnswer).toBeUndefined();
  });

  it('scores correct answer', () => {
    const tracks = [
      { name: 'Song A', artist: 'Artist A', previewUrl: 'http://example.com/a.mp3' },
      { name: 'Song B', artist: 'Artist B', previewUrl: 'http://example.com/b.mp3' },
      { name: 'Song C', artist: 'Artist C', previewUrl: 'http://example.com/c.mp3' },
      { name: 'Song D', artist: 'Artist D', previewUrl: 'http://example.com/d.mp3' },
    ];
    const state: any = engine.initWithTracks(makePlayers(3), settings, tracks);
    const correctIdx = state.options.indexOf(state.correctAnswer);
    const result = engine.handleAction(state, 'p1', { type: 'answer', answer: correctIdx });
    expect(result.events.some((e: any) => e.type === 'score-update')).toBe(true);
  });
});
