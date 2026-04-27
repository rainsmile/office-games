import type { WorldManager, OfficePlayer } from './world';

const WORK_COINS_PER_CELL = 3;
const WORK_KPI = 1;
const EXPAND_COST_ENEMY = 8;
const EXPAND_SUCCESS_RATE = 0.55;
const SABOTAGE_STEAL = 5;
const SABOTAGE_ENERGY_COST = 2;
const SLACK_ENERGY_GAIN = 3;
const SLACK_CAUGHT_RATE = 0.25;
const SLACK_CAUGHT_PENALTY = 500;

export interface PendingAction {
  playerId: string;
  type: 'work' | 'expand' | 'sabotage' | 'slack';
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

  // Energy regen every 120 ticks (10 minutes)
  if (w.tick % 120 === 0) {
    for (const player of Object.values(w.players)) {
      if (!player.online) continue;
      player.energy = Math.min(player.energy + 1, 10);
    }
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
      case 'slack':
        resolveSlack(wm, player, events);
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
  if (player.energy < 1) {
    wm.addLog(`${player.username} 精力耗尽，摸鱼中...`);
    events.push({ type: 'work', playerId: player.id, bonus: 0, kpi: 0, failed: true });
    return;
  }
  player.energy -= 1;
  const cells = wm.countCells(player.id);
  const multiplier = wm.getEfficiencyMultiplier(player.id);
  const bonus = Math.floor(cells * WORK_COINS_PER_CELL * multiplier);
  player.coins += bonus;
  player.kpi += WORK_KPI;
  wm.addLog(`${player.username} 认真工作 +${bonus}💰 +${WORK_KPI}📊`);
  events.push({ type: 'work', playerId: player.id, bonus, kpi: WORK_KPI });
}

function resolveExpand(wm: WorldManager, player: OfficePlayer, action: PendingAction, events: ActionEvent[]) {
  const { x, y } = action;
  if (x === undefined || y === undefined) return;
  if (y < 0 || y >= wm.getGridRows() || x < 0 || x >= wm.getGridCols()) return;

  const cell = wm.world.grid[y][x];
  if (cell.type !== 'desk') return;
  if (cell.owner === player.id) return;
  if (!wm.isAdjacentToOwned(y, x, player.id)) return;

  if (cell.owner === null) {
    cell.owner = player.id;
    wm.addLog(`${player.username} 占了空工位 [${y+1},${x+1}]`);
    events.push({ type: 'expand', playerId: player.id, success: true, x, y });
  } else {
    if (player.coins < EXPAND_COST_ENEMY) {
      wm.addLog(`${player.username} 钱不够，抢不了工位`);
      events.push({ type: 'expand', playerId: player.id, success: false, reason: 'no-funds' });
      return;
    }
    player.coins -= EXPAND_COST_ENEMY;
    const defender = wm.world.players[cell.owner];
    if (Math.random() < EXPAND_SUCCESS_RATE) {
      cell.owner = player.id;
      const defName = defender?.username ?? '???';
      wm.addLog(`${player.username} 抢了 ${defName} 的工位！`);
      events.push({ type: 'expand', playerId: player.id, success: true, x, y, from: defender?.id });
    } else {
      wm.addLog(`${player.username} 进攻失败，亏了 ${EXPAND_COST_ENEMY}💰`);
      events.push({ type: 'expand', playerId: player.id, success: false, reason: 'failed' });
    }
  }
}

function resolveSabotage(wm: WorldManager, player: OfficePlayer, events: ActionEvent[]) {
  if (player.energy < SABOTAGE_ENERGY_COST) {
    wm.addLog(`${player.username} 精力不够，无法偷袭`);
    events.push({ type: 'sabotage', playerId: player.id, success: false });
    return;
  }

  const allOthers = Object.values(wm.world.players).filter(p => p.id !== player.id);
  if (allOthers.length === 0) {
    wm.addLog(`${player.username} 没找到目标`);
    return;
  }
  const onlineTargets = allOthers.filter(p => p.online);
  const targets = onlineTargets.length > 0 ? onlineTargets : allOthers;

  player.energy -= SABOTAGE_ENERGY_COST;
  const target = targets[Math.floor(Math.random() * targets.length)];
  const stolen = Math.min(SABOTAGE_STEAL, target.coins);
  target.coins -= stolen;
  player.coins += stolen;

  wm.addLog(`${player.username} 偷了 ${target.username} ${stolen}💰`);
  events.push({ type: 'sabotage', playerId: player.id, success: true, targetId: target.id, stolen });
}

function resolveSlack(wm: WorldManager, player: OfficePlayer, events: ActionEvent[]) {
  if (player.energy >= 10) {
    wm.addLog(`${player.username} 精力充沛，不需要摸鱼`);
    events.push({ type: 'slack', playerId: player.id, caught: false, energyGain: 0 });
    return;
  }

  if (Math.random() < SLACK_CAUGHT_RATE) {
    const penalty = Math.min(SLACK_CAUGHT_PENALTY, player.coins);
    player.coins -= penalty;
    wm.addLog(`🚨 ${player.username} 摸鱼被老板逮到了！罚款 ${penalty}💰`);
    events.push({ type: 'slack', playerId: player.id, caught: true, penalty });
    return;
  }

  player.energy = Math.min(player.energy + SLACK_ENERGY_GAIN, 10);
  wm.addLog(`${player.username} 偷偷摸鱼，恢复了 ${SLACK_ENERGY_GAIN}⚡`);
  events.push({ type: 'slack', playerId: player.id, caught: false, energyGain: SLACK_ENERGY_GAIN });
}
