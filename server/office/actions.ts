import type { WorldManager, OfficePlayer } from './world';

const WORK_COINS_PER_CELL = 3;
const WORK_KPI = 1;
const EXPAND_COST_ENEMY = 8;
const EXPAND_SUCCESS_RATE = 0.55;
const SABOTAGE_STEAL = 5;
const SABOTAGE_ENERGY_COST = 2;

export interface PendingAction {
  playerId: string;
  type: 'work' | 'expand' | 'sabotage';
  x?: number;
  y?: number;
}

export interface ActionEvent {
  type: string;
  [key: string]: unknown;
}

export function resolveCycle(
  wm: WorldManager,
  pendingActions: Map<string, PendingAction>
): ActionEvent[] {
  const events: ActionEvent[] = [];
  const w = wm.world;

  // Passive income for all online players
  for (const [pid, player] of Object.entries(w.players)) {
    if (!player.online) continue;
    const cells = wm.countCells(pid);
    player.coins += cells;
  }

  // Energy regen for all online
  for (const player of Object.values(w.players)) {
    if (!player.online) continue;
    player.energy = Math.min(player.energy + 1, 10);
  }

  // Resolve actions
  for (const [pid, action] of pendingActions) {
    const player = w.players[pid];
    if (!player || !player.online) continue;

    switch (action.type) {
      case 'work':
        resolveWork(wm, player, events);
        break;
      case 'expand':
        resolveExpand(wm, player, action, events);
        break;
      case 'sabotage':
        resolveSabotage(wm, player, events);
        break;
    }
  }

  pendingActions.clear();
  w.tick++;
  wm.markDirty();
  events.push({ type: 'cycle-resolved', tick: w.tick });
  return events;
}

function resolveWork(wm: WorldManager, player: OfficePlayer, events: ActionEvent[]) {
  const cells = wm.countCells(player.id);
  const bonus = cells * WORK_COINS_PER_CELL;
  player.coins += bonus;
  player.kpi += WORK_KPI;
  wm.addLog(`${player.nickname} 认真工作 +${bonus}💰 +${WORK_KPI}📊`);
  events.push({ type: 'work', playerId: player.id, bonus, kpi: WORK_KPI });
}

function resolveExpand(wm: WorldManager, player: OfficePlayer, action: PendingAction, events: ActionEvent[]) {
  const { x, y } = action;
  if (x === undefined || y === undefined) return;
  const gs = wm.getGridSize();
  if (y < 0 || y >= gs || x < 0 || x >= gs) return;

  const cell = wm.world.grid[y][x];
  if (cell.type !== 'desk') return;
  if (cell.owner === player.id) return;
  if (!wm.isAdjacentToOwned(y, x, player.id)) return;

  if (cell.owner === null) {
    cell.owner = player.id;
    wm.addLog(`${player.nickname} 占了空工位 [${y+1},${x+1}]`);
    events.push({ type: 'expand', playerId: player.id, success: true, x, y });
  } else {
    if (player.coins < EXPAND_COST_ENEMY) {
      wm.addLog(`${player.nickname} 钱不够，抢不了工位`);
      events.push({ type: 'expand', playerId: player.id, success: false, reason: 'no-funds' });
      return;
    }
    player.coins -= EXPAND_COST_ENEMY;
    const defender = wm.world.players[cell.owner];
    if (Math.random() < EXPAND_SUCCESS_RATE) {
      cell.owner = player.id;
      const defName = defender?.nickname ?? '???';
      wm.addLog(`${player.nickname} 抢了 ${defName} 的工位！`);
      events.push({ type: 'expand', playerId: player.id, success: true, x, y, from: defender?.id });
    } else {
      wm.addLog(`${player.nickname} 进攻失败，亏了 ${EXPAND_COST_ENEMY}💰`);
      events.push({ type: 'expand', playerId: player.id, success: false, reason: 'failed' });
    }
  }
}

function resolveSabotage(wm: WorldManager, player: OfficePlayer, events: ActionEvent[]) {
  if (player.energy < SABOTAGE_ENERGY_COST) {
    wm.addLog(`${player.nickname} 精力不够，搞不动人`);
    events.push({ type: 'sabotage', playerId: player.id, success: false });
    return;
  }

  const targets = Object.values(wm.world.players).filter(p => p.id !== player.id && p.online);
  if (targets.length === 0) {
    wm.addLog(`${player.nickname} 没找到目标`);
    return;
  }

  player.energy -= SABOTAGE_ENERGY_COST;
  const target = targets[Math.floor(Math.random() * targets.length)];
  const stolen = Math.min(SABOTAGE_STEAL, target.coins);
  target.coins -= stolen;
  player.coins += stolen;

  wm.addLog(`${player.nickname} 偷了 ${target.nickname} ${stolen}💰`);
  events.push({ type: 'sabotage', playerId: player.id, success: true, targetId: target.id, stolen });
}
