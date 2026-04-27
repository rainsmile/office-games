import fs from 'fs';
import path from 'path';

const SAVE_PATH = path.join(__dirname, '../../data/office-world.json');
const GRID_SIZE = 8;
const CYCLE_SECONDS = 5;

export type CellType = 'desk' | 'meeting' | 'break' | 'plant' | 'server-room' | 'empty';

export interface OfficeCell {
  type: CellType;
  owner: string | null;
  level: number;
}

export interface OfficePlayer {
  id: string;
  nickname: string;
  color: string;
  coins: number;
  energy: number;
  kpi: number;
  online: boolean;
  lastSeen: number;
  joinedAt: number;
}

export interface OfficeWorld {
  grid: OfficeCell[][];
  players: Record<string, OfficePlayer>;
  tick: number;
  log: { text: string; time: number }[];
}

const FLOOR_PLAN: CellType[][] = [
  ['desk','desk','desk','meeting','meeting','desk','desk','desk'],
  ['desk','desk','desk','meeting','meeting','desk','desk','desk'],
  ['desk','desk','desk','empty','empty','desk','desk','desk'],
  ['plant','empty','empty','empty','empty','empty','empty','plant'],
  ['desk','desk','desk','empty','empty','desk','desk','desk'],
  ['desk','desk','desk','break','break','desk','desk','desk'],
  ['desk','desk','desk','break','server-room','desk','desk','desk'],
  ['desk','desk','desk','plant','plant','desk','desk','desk'],
];

const PLAYER_COLORS = [
  '#4a90d9','#d94a4a','#4ad97a','#d9a84a',
  '#9b59b6','#1abc9c','#e74c8c','#3498db',
  '#e67e22','#2ecc71','#e74c3c','#8e44ad',
];

function createEmptyWorld(): OfficeWorld {
  const grid: OfficeCell[][] = FLOOR_PLAN.map(row =>
    row.map(type => ({ type, owner: null, level: 1 }))
  );
  return { grid, players: {}, tick: 0, log: [] };
}

export class WorldManager {
  world: OfficeWorld;
  private dirty = false;

  constructor() {
    this.world = this.load();
  }

  private load(): OfficeWorld {
    try {
      if (fs.existsSync(SAVE_PATH)) {
        const data = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf-8'));
        return data as OfficeWorld;
      }
    } catch {}
    return createEmptyWorld();
  }

  save() {
    if (!this.dirty) return;
    try {
      fs.writeFileSync(SAVE_PATH, JSON.stringify(this.world, null, 2));
      this.dirty = false;
    } catch {}
  }

  markDirty() {
    this.dirty = true;
  }

  addPlayer(nickname: string, existingId?: string): OfficePlayer {
    if (existingId && this.world.players[existingId]) {
      const p = this.world.players[existingId];
      p.online = true;
      p.nickname = nickname;
      this.calcOfflineIncome(p);
      this.markDirty();
      return p;
    }

    const id = 'op_' + Math.random().toString(36).slice(2, 10);
    const colorIdx = Object.keys(this.world.players).length;
    const player: OfficePlayer = {
      id,
      nickname,
      color: PLAYER_COLORS[colorIdx % PLAYER_COLORS.length],
      coins: 20,
      energy: 5,
      kpi: 0,
      online: true,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
    };

    this.world.players[id] = player;
    this.assignStartingCells(id);
    this.addLog(`${nickname} 入职了！`);
    this.markDirty();
    return player;
  }

  setOffline(playerId: string) {
    const p = this.world.players[playerId];
    if (!p) return;
    p.online = false;
    p.lastSeen = Date.now();
    this.markDirty();
  }

  private calcOfflineIncome(player: OfficePlayer) {
    const now = Date.now();
    const offlineMs = now - player.lastSeen;
    const offlineCycles = Math.floor(offlineMs / (CYCLE_SECONDS * 1000));
    if (offlineCycles <= 0) return;

    const cellCount = this.countCells(player.id);
    const passivePerCycle = cellCount;
    const offlineRate = 0.3;
    const earned = Math.floor(offlineCycles * passivePerCycle * offlineRate);
    if (earned > 0) {
      player.coins += earned;
      this.addLog(`${player.nickname} 回来了，离线赚了 ${earned} 金币`);
    }
  }

  private assignStartingCells(playerId: string) {
    const desks = this.getEmptyDesks();
    const toAssign = Math.min(2, desks.length);
    const shuffled = desks.sort(() => Math.random() - 0.5);

    // Try to pick 2 adjacent desks
    for (let i = 0; i < shuffled.length && toAssign > 0; i++) {
      const [y, x] = shuffled[i];
      if (this.world.grid[y][x].owner !== null) continue;
      this.world.grid[y][x].owner = playerId;

      // Find adjacent empty desk
      const adj = this.getAdjacentDesks(y, x);
      for (const [ay, ax] of adj) {
        if (this.world.grid[ay][ax].owner === null) {
          this.world.grid[ay][ax].owner = playerId;
          return;
        }
      }
      return;
    }
  }

  private getEmptyDesks(): [number, number][] {
    const result: [number, number][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.world.grid[y][x].type === 'desk' && this.world.grid[y][x].owner === null) {
          result.push([y, x]);
        }
      }
    }
    return result;
  }

  getAdjacentDesks(y: number, x: number): [number, number][] {
    return ([[y-1,x],[y+1,x],[y,x-1],[y,x+1]] as [number,number][])
      .filter(([ny,nx]) => ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE)
      .filter(([ny,nx]) => this.world.grid[ny][nx].type === 'desk');
  }

  isAdjacentToOwned(y: number, x: number, playerId: string): boolean {
    return ([[y-1,x],[y+1,x],[y,x-1],[y,x+1]] as [number,number][])
      .filter(([ny,nx]) => ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE)
      .some(([ny,nx]) => this.world.grid[ny][nx].owner === playerId);
  }

  countCells(playerId: string): number {
    let c = 0;
    for (const row of this.world.grid) {
      for (const cell of row) {
        if (cell.owner === playerId) c++;
      }
    }
    return c;
  }

  addLog(text: string) {
    this.world.log.push({ text, time: Date.now() });
    if (this.world.log.length > 50) this.world.log.shift();
  }

  getGridSize() { return GRID_SIZE; }
  getCycleSeconds() { return CYCLE_SECONDS; }
}
