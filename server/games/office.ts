import type { GameEngine } from '../game-engine';
import type { Player, RoomSettings, GameEvent, OfficeCell } from '../../src/lib/types';
import { registerGame } from '../game-engine';
import {
  GRID_SIZE, CYCLE_SECONDS, GAME_DURATION,
  STARTING_COINS, STARTING_ENERGY,
  WORK_COINS_PER_CELL, WORK_KPI,
  EXPAND_COST_ENEMY, EXPAND_SUCCESS_RATE,
  SABOTAGE_STEAL_AMOUNT, SABOTAGE_ENERGY_COST,
  SCORE_COIN_WEIGHT, SCORE_KPI_WEIGHT, SCORE_TERRITORY_WEIGHT,
} from '../data/office-config';

function countCells(grid: OfficeCell[][], playerId: string): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.owner === playerId) count++;
    }
  }
  return count;
}

function getAdjacentCells(y: number, x: number): [number, number][] {
  return [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]
    .filter(([ny, nx]) => ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) as [number, number][];
}

function isAdjacentToOwned(grid: OfficeCell[][], y: number, x: number, playerId: string): boolean {
  return getAdjacentCells(y, x).some(([ny, nx]) => grid[ny][nx].owner === playerId);
}

function placeStartingCells(grid: OfficeCell[][], playerId: string): void {
  const corners = [
    [0, 0], [0, GRID_SIZE - 1],
    [GRID_SIZE - 1, 0], [GRID_SIZE - 1, GRID_SIZE - 1],
    [0, Math.floor(GRID_SIZE / 2)], [Math.floor(GRID_SIZE / 2), 0],
    [GRID_SIZE - 1, Math.floor(GRID_SIZE / 2)], [Math.floor(GRID_SIZE / 2), GRID_SIZE - 1],
  ];

  for (const [y, x] of corners) {
    if (grid[y][x].owner === null) {
      grid[y][x].owner = playerId;
      const adj = getAdjacentCells(y, x);
      for (const [ny, nx] of adj) {
        if (grid[ny][nx].owner === null) {
          grid[ny][nx].owner = playerId;
          return;
        }
      }
      return;
    }
  }
}

export class OfficeEngine implements GameEngine {
  init(players: Player[], settings: RoomSettings) {
    const grid: OfficeCell[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => ({ owner: null, level: 1 }))
    );

    const playerStates: Record<string, { coins: number; energy: number; kpi: number }> = {};
    for (const p of players) {
      placeStartingCells(grid, p.id);
      playerStates[p.id] = { coins: STARTING_COINS, energy: STARTING_ENERGY, kpi: 0 };
    }

    const totalTime = settings.timeLimit || GAME_DURATION;

    return {
      grid,
      players: playerStates,
      pendingActions: {} as Record<string, GameEvent>,
      tick: 0,
      cycleDuration: CYCLE_SECONDS,
      timeLeft: totalTime,
      totalTime,
      log: [] as { text: string; tick: number }[],
      _playerIds: players.map((p) => p.id),
      _playerNames: Object.fromEntries(players.map((p) => [p.id, p.nickname])),
    };
  }

  handleAction(state: unknown, playerId: string, action: GameEvent) {
    const s = state as any;
    s.pendingActions[playerId] = action;
    return { state: s, events: [] as GameEvent[], ended: false };
  }

  getClientState(state: unknown, playerId: string) {
    const s = state as any;
    return {
      grid: s.grid,
      players: s.players,
      myAction: s.pendingActions[playerId]?.type ?? null,
      myActionData: s.pendingActions[playerId] ?? null,
      tick: s.tick,
      cycleDuration: s.cycleDuration,
      cycleProgress: s.tick % s.cycleDuration,
      timeLeft: s.timeLeft,
      totalTime: s.totalTime,
      log: s.log.slice(-10),
      playerNames: s._playerNames,
    };
  }

  tick(state: unknown) {
    const s = state as any;
    s.timeLeft -= 1;
    s.tick += 1;
    const events: GameEvent[] = [];

    if (s.tick % s.cycleDuration === 0) {
      this.resolveCycle(s, events);
    }

    if (s.timeLeft <= 0) {
      this.endGame(s, events);
      return { state: s, events, ended: true };
    }

    return { state: s, events, ended: false };
  }

  private resolveCycle(s: any, events: GameEvent[]) {
    const actions = { ...s.pendingActions };
    s.pendingActions = {};

    // Passive income: every cell produces 1 coin per cycle regardless of action
    for (const pid of s._playerIds) {
      const cellCount = countCells(s.grid, pid);
      s.players[pid].coins += cellCount;
    }

    for (const [pid, action] of Object.entries(actions) as [string, GameEvent][]) {
      if (!s.players[pid]) continue;

      switch (action.type) {
        case 'work':
          this.resolveWork(s, pid, events);
          break;
        case 'expand':
          this.resolveExpand(s, pid, action, events);
          break;
        case 'sabotage':
          this.resolveSabotage(s, pid, events);
          break;
      }
    }

    // Energy regen: +1 per cycle for everyone
    for (const pid of s._playerIds) {
      s.players[pid].energy = Math.min(s.players[pid].energy + 1, 10);
    }

    events.push({ type: 'cycle-resolved' });
  }

  private resolveWork(s: any, pid: string, events: GameEvent[]) {
    const cellCount = countCells(s.grid, pid);
    const bonus = cellCount * WORK_COINS_PER_CELL;
    s.players[pid].coins += bonus;
    s.players[pid].kpi += WORK_KPI;
    const name = s._playerNames[pid];
    s.log.push({ text: `${name} 认真工作，赚了 ${bonus} 金币`, tick: s.tick });
    events.push({ type: 'action-result', playerId: pid, action: 'work', bonus });
  }

  private resolveExpand(s: any, pid: string, action: GameEvent, events: GameEvent[]) {
    const x = action.x as number;
    const y = action.y as number;
    if (y < 0 || y >= GRID_SIZE || x < 0 || x >= GRID_SIZE) return;
    if (!isAdjacentToOwned(s.grid, y, x, pid)) return;
    if (s.grid[y][x].owner === pid) return;

    const name = s._playerNames[pid];
    const cell = s.grid[y][x];

    if (cell.owner === null) {
      cell.owner = pid;
      s.log.push({ text: `${name} 占领了空工位 [${y},${x}]`, tick: s.tick });
      events.push({ type: 'action-result', playerId: pid, action: 'expand', success: true, x, y });
    } else {
      if (s.players[pid].coins < EXPAND_COST_ENEMY) {
        s.log.push({ text: `${name} 金币不够，无法抢夺`, tick: s.tick });
        events.push({ type: 'action-result', playerId: pid, action: 'expand', success: false });
        return;
      }
      s.players[pid].coins -= EXPAND_COST_ENEMY;
      if (Math.random() < EXPAND_SUCCESS_RATE) {
        const defender = cell.owner;
        cell.owner = pid;
        const defName = s._playerNames[defender];
        s.log.push({ text: `${name} 抢了 ${defName} 的工位 [${y},${x}]!`, tick: s.tick });
        events.push({ type: 'action-result', playerId: pid, action: 'expand', success: true, x, y, from: defender });
      } else {
        s.log.push({ text: `${name} 进攻失败，损失 ${EXPAND_COST_ENEMY} 金币`, tick: s.tick });
        events.push({ type: 'action-result', playerId: pid, action: 'expand', success: false });
      }
    }
  }

  private resolveSabotage(s: any, pid: string, events: GameEvent[]) {
    const name = s._playerNames[pid];

    if (s.players[pid].energy < SABOTAGE_ENERGY_COST) {
      s.log.push({ text: `${name} 精力不够，搞不动人`, tick: s.tick });
      events.push({ type: 'action-result', playerId: pid, action: 'sabotage', success: false });
      return;
    }

    const targets = s._playerIds.filter((id: string) => id !== pid);
    if (targets.length === 0) return;

    s.players[pid].energy -= SABOTAGE_ENERGY_COST;
    const targetId = targets[Math.floor(Math.random() * targets.length)];
    const stolen = Math.min(SABOTAGE_STEAL_AMOUNT, s.players[targetId].coins);
    s.players[targetId].coins -= stolen;
    s.players[pid].coins += stolen;

    const targetName = s._playerNames[targetId];
    s.log.push({ text: `${name} 偷了 ${targetName} ${stolen} 金币!`, tick: s.tick });
    events.push({ type: 'action-result', playerId: pid, action: 'sabotage', success: true, targetId, stolen });
  }

  private endGame(s: any, events: GameEvent[]) {
    for (const pid of s._playerIds) {
      const p = s.players[pid];
      const territory = countCells(s.grid, pid);
      const score = p.coins * SCORE_COIN_WEIGHT + p.kpi * SCORE_KPI_WEIGHT + territory * SCORE_TERRITORY_WEIGHT;
      events.push({ type: 'score-update', playerId: pid, delta: score });
    }
    events.push({ type: 'game-over' });
  }
}

registerGame('office', new OfficeEngine());
