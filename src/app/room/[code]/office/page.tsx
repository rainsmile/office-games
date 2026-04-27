'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import type { OfficeCell } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  work: '💻 工作',
  expand: '🏗 扩张',
  sabotage: '🗡 偷袭',
};

const CELL_COLORS: Record<string, string> = {};
function getPlayerColor(playerId: string, playerNames: Record<string, string>, players?: any[]): string {
  if (CELL_COLORS[playerId]) return CELL_COLORS[playerId];
  const colors = ['#4a90d9', '#d94a4a', '#4ad97a', '#d9a84a', '#9b59b6', '#1abc9c', '#e74c8c', '#3498db'];
  const idx = Object.keys(playerNames).indexOf(playerId);
  CELL_COLORS[playerId] = colors[idx % colors.length];
  return CELL_COLORS[playerId];
}

export default function OfficePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [expandTarget, setExpandTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'cycle-resolved') {
        setSelectedAction(null);
        setExpandTarget(null);
      }
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket]);

  useEffect(() => {
    if (room?.status === 'result') router.push(`/room/${code}/result`);
  }, [room?.status, code, router]);

  const handleWork = useCallback(() => {
    setSelectedAction('work');
    setExpandTarget(null);
    sendAction({ type: 'work' });
  }, [sendAction]);

  const handleSabotage = useCallback(() => {
    setSelectedAction('sabotage');
    setExpandTarget(null);
    sendAction({ type: 'sabotage' });
  }, [sendAction]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!gameState || !playerId) return;
    const cell: OfficeCell = gameState.grid[y][x];
    if (cell.owner === playerId) return;

    const adj = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
    const isAdj = adj.some(([ny, nx]) =>
      ny >= 0 && ny < 6 && nx >= 0 && nx < 6 && gameState.grid[ny][nx].owner === playerId
    );
    if (!isAdj) return;

    setSelectedAction('expand');
    setExpandTarget({ x, y });
    sendAction({ type: 'expand', x, y });
  }, [gameState, playerId, sendAction]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-500">加载中...</p></div>;
  }

  const myState = gameState.players[playerId!];
  const cycleLeft = gameState.cycleDuration - gameState.cycleProgress;
  const names: Record<string, string> = gameState.playerNames;

  const expandableCells = new Set<string>();
  if (selectedAction === 'expand' || !selectedAction) {
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (gameState.grid[y][x].owner === playerId) continue;
        const adj = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
        if (adj.some(([ny, nx]) => ny >= 0 && ny < 6 && nx >= 0 && nx < 6 && gameState.grid[ny][nx].owner === playerId)) {
          expandableCells.add(`${y},${x}`);
        }
      }
    }
  }

  const myCellCount = gameState.grid.flat().filter((c: OfficeCell) => c.owner === playerId).length;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans select-none">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-green-700">📊 Q4 KPI Dashboard</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">Room: {code}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">
            ⏱ {Math.floor(gameState.timeLeft / 60)}:{String(gameState.timeLeft % 60).padStart(2, '0')}
          </span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">
            下次结算: {cycleLeft}s
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Grid */}
        <div className="lg:col-span-3">
          {/* Action Bar */}
          <div className="bg-white border border-gray-300 rounded-t px-3 py-2 flex items-center gap-2 text-sm">
            <span className="text-gray-500 mr-2">操作:</span>
            <button
              onClick={handleWork}
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-all ${
                selectedAction === 'work' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
            >
              💻 工作
            </button>
            <button
              onClick={() => { setSelectedAction('expand'); setExpandTarget(null); }}
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-all ${
                selectedAction === 'expand' ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
            >
              🏗 扩张 <span className="text-xs text-gray-400">(点格子)</span>
            </button>
            <button
              onClick={handleSabotage}
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-all ${
                selectedAction === 'sabotage' ? 'bg-red-100 border-red-400 text-red-800' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
            >
              🗡 偷袭
            </button>
            {selectedAction && (
              <span className="ml-2 text-xs text-gray-400">
                已选择: {ACTION_LABELS[selectedAction]}
                {expandTarget && ` → [${expandTarget.y},${expandTarget.x}]`}
              </span>
            )}
          </div>

          {/* Grid = Spreadsheet */}
          <div className="bg-white border border-t-0 border-gray-300 rounded-b overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              <div className="bg-gray-100 border-r border-gray-200 p-1 text-center text-xs text-gray-400"></div>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-gray-100 border-r border-gray-200 p-1 text-center text-xs text-gray-500 font-medium">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            {/* Rows */}
            {gameState.grid.map((row: OfficeCell[], y: number) => (
              <div key={y} className="grid grid-cols-7 border-b border-gray-100">
                <div className="bg-gray-100 border-r border-gray-200 p-1 text-center text-xs text-gray-500 font-medium flex items-center justify-center">
                  {y + 1}
                </div>
                {row.map((cell: OfficeCell, x: number) => {
                  const isOwned = cell.owner === playerId;
                  const isExpandable = expandableCells.has(`${y},${x}`);
                  const isTarget = expandTarget?.x === x && expandTarget?.y === y;
                  const ownerColor = cell.owner ? getPlayerColor(cell.owner, names) : undefined;

                  return (
                    <div
                      key={x}
                      onClick={() => isExpandable && handleCellClick(x, y)}
                      className={`
                        border-r border-gray-100 aspect-square flex items-center justify-center text-xs font-medium relative
                        ${isOwned ? 'ring-2 ring-inset ring-yellow-400' : ''}
                        ${isExpandable ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}
                        ${isTarget ? 'ring-2 ring-blue-500' : ''}
                        transition-all
                      `}
                      style={{
                        backgroundColor: cell.owner ? `${ownerColor}22` : '#fafafa',
                      }}
                    >
                      {cell.owner && (
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: ownerColor }}
                        >
                          {names[cell.owner]?.[0] ?? '?'}
                        </div>
                      )}
                      {!cell.owner && isExpandable && (
                        <div className="w-6 h-6 rounded border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-300">+</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-3">
          {/* My stats */}
          <div className="bg-white border border-gray-300 rounded p-3">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">📋 我的数据</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">💰 金币</span>
                <span className="font-bold text-yellow-600">{myState?.coins ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">⚡ 精力</span>
                <span className="font-bold text-blue-600">{myState?.energy ?? 0}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">📊 KPI</span>
                <span className="font-bold text-green-600">{myState?.kpi ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">🏢 工位</span>
                <span className="font-bold">{myCellCount}</span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white border border-gray-300 rounded p-3">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">🏆 排行榜</h3>
            <div className="space-y-1">
              {Object.entries(gameState.players as Record<string, any>)
                .map(([pid, ps]) => ({
                  pid,
                  name: names[pid],
                  cells: gameState.grid.flat().filter((c: OfficeCell) => c.owner === pid).length,
                  coins: ps.coins,
                  kpi: ps.kpi,
                  score: ps.coins + ps.kpi * 2 + gameState.grid.flat().filter((c: OfficeCell) => c.owner === pid).length * 10,
                }))
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div key={p.pid} className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${p.pid === playerId ? 'bg-yellow-50' : ''}`}>
                    <span className="w-4 text-gray-400">{i + 1}</span>
                    <div className="w-5 h-5 rounded text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: getPlayerColor(p.pid, names) }}>
                      {p.name?.[0]}
                    </div>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.score}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white border border-gray-300 rounded p-3">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">📝 动态</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto text-xs text-gray-600">
              {gameState.log.length === 0 && <p className="text-gray-400">等待第一轮结算...</p>}
              {[...gameState.log].reverse().map((entry: any, i: number) => (
                <div key={i} className="py-0.5 border-b border-gray-50">{entry.text}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
