import fs from 'fs';
import path from 'path';
import { getFloorPlan, GRID_ROWS, GRID_COLS, ZONES } from './floor-plan';
import type { FloorCell } from './floor-plan';

const SAVE_PATH = path.join(__dirname, '../../data/office-world.json');
const CYCLE_SECONDS = 5;

export interface OfficeCell {
  type: string;
  zone: string;
  zoneColor: string;
  zoneName: string;
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

const PLAYER_COLORS = [
  '#e74c3c','#3498db','#2ecc71','#f39c12',
  '#9b59b6','#1abc9c','#e67e22','#e91e63',
  '#00bcd4','#8bc34a','#ff5722','#673ab7',
];

function createWorld(): OfficeWorld {
  const floorPlan = getFloorPlan();
  const grid: OfficeCell[][] = floorPlan.map(row =>
    row.map(fc => ({ ...fc, owner: null, level: 1 }))
  );
  return { grid, players: {}, tick: 0, log: [] };
}

function isValidSave(data: any): boolean {
  return data?.grid?.length === GRID_ROWS && data.grid[0]?.length === GRID_COLS;
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
        if (isValidSave(data)) return data as OfficeWorld;
      }
    } catch {}
    return createWorld();
  }

  save() {
    if (!this.dirty) return;
    try {
      fs.writeFileSync(SAVE_PATH, JSON.stringify(this.world));
      this.dirty = false;
    } catch {}
  }

  markDirty() { this.dirty = true; }

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
      id, nickname,
      color: PLAYER_COLORS[colorIdx % PLAYER_COLORS.length],
      coins: 20, energy: 5, kpi: 0,
      online: true, lastSeen: Date.now(), joinedAt: Date.now(),
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
    const earned = Math.floor(offlineCycles * cellCount * 0.3);
    if (earned > 0) {
      player.coins += earned;
      this.addLog(`${player.nickname} 回来了，离线赚了 ${earned} 💰`);
    }
  }

  private assignStartingCells(playerId: string) {
    // Pick a random zone that has available desks
    const zoneIds = Object.keys(ZONES);
    const shuffledZones = zoneIds.sort(() => Math.random() - 0.5);

    for (const zoneId of shuffledZones) {
      const desks = this.getEmptyDesksInZone(zoneId);
      if (desks.length >= 2) {
        // Find two adjacent desks in this zone
        for (const [y, x] of desks) {
          if (this.world.grid[y][x].owner !== null) continue;
          this.world.grid[y][x].owner = playerId;
          const adj = this.getAdjacentDesks(y, x);
          for (const [ay, ax] of adj) {
            if (this.world.grid[ay][ax].owner === null && this.world.grid[ay][ax].zone === zoneId) {
              this.world.grid[ay][ax].owner = playerId;
              return;
            }
          }
          // If no adjacent in same zone, just take one desk
          return;
        }
      }
    }

    // Fallback: any two empty desks
    const allDesks = this.getAllEmptyDesks();
    for (const [y, x] of allDesks.slice(0, 2)) {
      this.world.grid[y][x].owner = playerId;
    }
  }

  private getEmptyDesksInZone(zoneId: string): [number, number][] {
    const result: [number, number][] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const c = this.world.grid[y][x];
        if (c.type === 'desk' && c.zone === zoneId && c.owner === null) {
          result.push([y, x]);
        }
      }
    }
    return result.sort(() => Math.random() - 0.5);
  }

  private getAllEmptyDesks(): [number, number][] {
    const result: [number, number][] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const c = this.world.grid[y][x];
        if (c.type === 'desk' && c.owner === null) result.push([y, x]);
      }
    }
    return result.sort(() => Math.random() - 0.5);
  }

  getAdjacentDesks(y: number, x: number): [number, number][] {
    return ([[y-1,x],[y+1,x],[y,x-1],[y,x+1]] as [number,number][])
      .filter(([ny,nx]) => ny >= 0 && ny < GRID_ROWS && nx >= 0 && nx < GRID_COLS)
      .filter(([ny,nx]) => this.world.grid[ny][nx].type === 'desk');
  }

  isAdjacentToOwned(y: number, x: number, playerId: string): boolean {
    return ([[y-1,x],[y+1,x],[y,x-1],[y,x+1]] as [number,number][])
      .filter(([ny,nx]) => ny >= 0 && ny < GRID_ROWS && nx >= 0 && nx < GRID_COLS)
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

  getGridRows() { return GRID_ROWS; }
  getGridCols() { return GRID_COLS; }
  getCycleSeconds() { return CYCLE_SECONDS; }
}
