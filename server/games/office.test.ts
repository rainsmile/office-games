import { describe, it, expect } from 'vitest';
import { OfficeEngine } from './office';
import type { Player, RoomSettings } from '../../src/lib/types';

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player${i + 1}`,
    color: ['#ff6b6b', '#ffa502', '#2ed573', '#1e90ff'][i],
    score: 0,
    online: true,
  }));

describe('OfficeEngine', () => {
  const engine = new OfficeEngine();
  const settings: RoomSettings = { rounds: 1, timeLimit: 180, musicGenre: 'chinese-pop' };

  it('initializes grid with player starting cells', () => {
    const state: any = engine.init(makePlayers(4), settings);
    expect(state.grid.length).toBe(6);
    expect(state.grid[0].length).toBe(6);
    expect(state.timeLeft).toBe(180);

    let ownedCells = 0;
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell.owner) ownedCells++;
      }
    }
    expect(ownedCells).toBe(8); // 4 players * 2 cells each
    expect(state.players['p1'].coins).toBe(10);
    expect(state.players['p1'].kpi).toBe(0);
  });

  it('processes work action on cycle', () => {
    const state: any = engine.init(makePlayers(2), settings);
    engine.handleAction(state, 'p1', { type: 'work' });

    // Fast-forward to cycle boundary (tick from timeLeft=180 down 5 times)
    for (let i = 0; i < 4; i++) engine.tick!(state);
    const result = engine.tick!(state); // 5th tick = cycle resolve

    const p1 = result.state.players['p1'];
    // p1 has 2 cells, work gives 3 coins per cell = 6 + starting 10
    expect(p1.coins).toBeGreaterThan(10);
    expect(p1.kpi).toBeGreaterThanOrEqual(1);
  });

  it('processes expand action to take empty cell', () => {
    const state: any = engine.init(makePlayers(2), settings);

    // Find an empty cell adjacent to p1's territory
    let targetX = -1, targetY = -1;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (state.grid[y][x].owner !== null) continue;
        // Check adjacency to p1
        const neighbors = [
          [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1],
        ];
        for (const [ny, nx] of neighbors) {
          if (ny >= 0 && ny < 6 && nx >= 0 && nx < 6 && state.grid[ny][nx].owner === 'p1') {
            targetX = x;
            targetY = y;
            break;
          }
        }
        if (targetX >= 0) break;
      }
      if (targetX >= 0) break;
    }

    expect(targetX).toBeGreaterThanOrEqual(0);
    engine.handleAction(state, 'p1', { type: 'expand', x: targetX, y: targetY });

    // Tick to cycle
    for (let i = 0; i < 5; i++) engine.tick!(state);

    expect(state.grid[targetY][targetX].owner).toBe('p1');
  });

  it('processes sabotage action to steal coins', () => {
    const state: any = engine.init(makePlayers(2), settings);
    const p2CoinsBefore = state.players['p2'].coins;

    engine.handleAction(state, 'p1', { type: 'sabotage' });
    for (let i = 0; i < 5; i++) engine.tick!(state);

    // p1 sabotaged p2 (only other player), should steal some coins
    expect(state.players['p2'].coins).toBeLessThan(p2CoinsBefore);
  });

  it('hides other players pending actions in client state', () => {
    const state: any = engine.init(makePlayers(2), settings);
    engine.handleAction(state, 'p1', { type: 'work' });
    engine.handleAction(state, 'p2', { type: 'sabotage' });

    const view1: any = engine.getClientState(state, 'p1');
    expect(view1.myAction).toBe('work');
    expect(view1.pendingActions).toBeUndefined();
  });

  it('ends game when time runs out', () => {
    const state: any = engine.init(makePlayers(2), settings);
    state.timeLeft = 1;
    const result = engine.tick!(state);
    expect(result.ended).toBe(true);
    expect(result.events.some((e: any) => e.type === 'game-over')).toBe(true);
  });

  it('calculates final scores correctly', () => {
    const state: any = engine.init(makePlayers(2), settings);
    state.players['p1'].coins = 20;
    state.players['p1'].kpi = 5;
    // p1 has 2 cells by default
    state.timeLeft = 1;
    const result = engine.tick!(state);
    // score = coins(20)*1 + kpi(5)*2 + territory(2)*10 = 50
    const scoreEvent = result.events.find((e: any) => e.type === 'score-update' && e.playerId === 'p1');
    expect(scoreEvent?.delta).toBe(50);
  });
});
