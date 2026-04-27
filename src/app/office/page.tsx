'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import OfficeCell from '@/components/office/OfficeCell';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

interface CellData {
  type: string;
  owner: string | null;
  level: number;
}

interface PlayerData {
  id: string;
  nickname: string;
  color: string;
  coins: number;
  energy: number;
  kpi: number;
  online: boolean;
}

interface WorldState {
  grid: CellData[][];
  players: Record<string, PlayerData>;
  tick: number;
  log: { text: string; time: number }[];
  gridSize: number;
  cycleSeconds: number;
}

export default function OfficePage() {
  const socketRef = useRef<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [expandTarget, setExpandTarget] = useState<{ x: number; y: number } | null>(null);
  const [actionAck, setActionAck] = useState<string | null>(null);
  const [cycleCountdown, setCycleCountdown] = useState(5);

  // Countdown timer
  useEffect(() => {
    if (!world) return;
    const interval = setInterval(() => {
      setCycleCountdown(prev => prev <= 1 ? world.cycleSeconds : prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [world?.cycleSeconds]);

  useEffect(() => {
    const socket = io(`${SERVER_URL}/office`, { autoConnect: true });
    socketRef.current = socket;

    socket.on('office:joined', ({ playerId: pid }) => {
      setPlayerId(pid);
      setJoined(true);
      sessionStorage.setItem('office-pid', pid);
    });

    socket.on('office:state', (state: WorldState) => {
      setWorld(state);
    });

    socket.on('office:event', (event: any) => {
      if (event.type === 'cycle-resolved') {
        setSelectedAction(null);
        setExpandTarget(null);
        setActionAck(null);
        setCycleCountdown(5);
      }
    });

    socket.on('office:action-ack', ({ action }) => {
      setActionAck(action);
    });

    // Auto-rejoin
    const savedPid = sessionStorage.getItem('office-pid');
    const savedNick = sessionStorage.getItem('office-nick');
    if (savedPid && savedNick) {
      socket.emit('office:join', { nickname: savedNick, existingId: savedPid });
      setNickname(savedNick);
    }

    return () => { socket.disconnect(); };
  }, []);

  const handleJoin = useCallback(() => {
    if (!nickname.trim() || !socketRef.current) return;
    const savedPid = sessionStorage.getItem('office-pid');
    sessionStorage.setItem('office-nick', nickname.trim());
    socketRef.current.emit('office:join', { nickname: nickname.trim(), existingId: savedPid || undefined });
  }, [nickname]);

  const sendAction = useCallback((action: any) => {
    socketRef.current?.emit('office:action', action);
  }, []);

  const handleWork = () => {
    setSelectedAction('work');
    setExpandTarget(null);
    sendAction({ type: 'work' });
  };

  const handleSabotage = () => {
    setSelectedAction('sabotage');
    setExpandTarget(null);
    sendAction({ type: 'sabotage' });
  };

  const handleCellClick = (x: number, y: number) => {
    setSelectedAction('expand');
    setExpandTarget({ x, y });
    sendAction({ type: 'expand', x, y });
  };

  // ============ ENTRY SCREEN ============
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-2 border-orange-200">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🏢</div>
            <h1 className="text-3xl font-extrabold text-gray-800">摸鱼公司</h1>
            <p className="text-orange-500 font-semibold mt-1">办公室争霸</p>
            <p className="text-gray-400 text-sm mt-2">占工位 · 搞同事 · 当老板</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="输入你的花名..."
              maxLength={8}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-center focus:outline-none focus:border-orange-400 transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={!nickname.trim()}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl text-lg hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              进入办公室 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ GAME SCREEN ============
  if (!world) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-gray-400">连接中...</p>
      </div>
    );
  }

  const me = playerId ? world.players[playerId] : null;
  const myCellCount = world.grid.flat().filter(c => c.owner === playerId).length;

  // Build expandable set
  const expandable = new Set<string>();
  if (playerId) {
    for (let y = 0; y < world.gridSize; y++) {
      for (let x = 0; x < world.gridSize; x++) {
        if (world.grid[y][x].owner === playerId || world.grid[y][x].type !== 'desk') continue;
        const adj = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]];
        if (adj.some(([ny,nx]) => ny >= 0 && ny < world.gridSize && nx >= 0 && nx < world.gridSize && world.grid[ny][nx].owner === playerId)) {
          expandable.add(`${y},${x}`);
        }
      }
    }
  }

  // Leaderboard
  const leaderboard = Object.values(world.players)
    .map(p => ({
      ...p,
      cells: world.grid.flat().filter(c => c.owner === p.id).length,
      score: p.coins + p.kpi * 2 + world.grid.flat().filter(c => c.owner === p.id).length * 10,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur border-b border-orange-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏢</span>
          <span className="font-extrabold text-gray-800">摸鱼公司</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
            🟢 {Object.values(world.players).filter(p => p.online).length} 在线
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className={`px-3 py-1 rounded-full font-bold ${cycleCountdown <= 2 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
            ⏱ {cycleCountdown}s
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Map + Actions */}
        <div className="lg:col-span-3 space-y-3">
          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 font-semibold mr-1">行动:</span>
            <button
              onClick={handleWork}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                selectedAction === 'work'
                  ? 'bg-green-100 border-green-400 text-green-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              💻 工作
            </button>
            <button
              onClick={() => { setSelectedAction('expand'); setExpandTarget(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                selectedAction === 'expand'
                  ? 'bg-blue-100 border-blue-400 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              🏗 扩张 <span className="text-xs opacity-60">(点工位)</span>
            </button>
            <button
              onClick={handleSabotage}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                selectedAction === 'sabotage'
                  ? 'bg-red-100 border-red-400 text-red-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              🧨 搞人
            </button>
            {actionAck && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                ✅ 已提交: {actionAck === 'work' ? '工作' : actionAck === 'expand' ? '扩张' : '搞人'}
                {expandTarget && ` → [${expandTarget.y+1},${expandTarget.x+1}]`}
              </span>
            )}
          </div>

          {/* Map */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 overflow-x-auto">
            <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${world.gridSize}, minmax(50px, 70px))`, width: 'fit-content' }}>
              {world.grid.map((row, y) =>
                row.map((cell, x) => {
                  const isMe = cell.owner === playerId;
                  const isExp = expandable.has(`${y},${x}`);
                  const isTgt = expandTarget?.x === x && expandTarget?.y === y;
                  const ownerData = cell.owner ? world.players[cell.owner] : null;
                  return (
                    <OfficeCell
                      key={`${y}-${x}`}
                      type={cell.type}
                      owner={cell.owner}
                      ownerName={ownerData?.nickname}
                      ownerColor={ownerData?.color}
                      isMe={isMe}
                      isExpandable={isExp}
                      isTarget={isTgt}
                      onClick={() => handleCellClick(x, y)}
                    />
                  );
                })
              )}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-gray-400 justify-center flex-wrap">
              <span>🖥️ 工位</span>
              <span>📋 会议室</span>
              <span>☕ 茶水间</span>
              <span>🌿 绿植</span>
              <span>🪑 空位</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-3">
          {/* My Stats */}
          {me && (
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: me.color }}>
                  {me.nickname[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{me.nickname}</div>
                  <div className="text-xs text-gray-400">工号 {playerId?.slice(-6)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-yellow-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-extrabold text-yellow-600">{me.coins}</div>
                  <div className="text-xs text-yellow-500">💰 金币</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-extrabold text-blue-600">{me.energy}/10</div>
                  <div className="text-xs text-blue-500">⚡ 精力</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-extrabold text-green-600">{me.kpi}</div>
                  <div className="text-xs text-green-500">📊 KPI</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-extrabold text-purple-600">{myCellCount}</div>
                  <div className="text-xs text-purple-500">🏢 工位</div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">🏆 排行榜</h3>
            <div className="space-y-1.5">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${p.id === playerId ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
                  <span className="w-5 text-center font-bold text-gray-400">{['🥇','🥈','🥉'][i] ?? `${i+1}`}</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.color }}>
                    {p.nickname[0]}
                  </div>
                  <span className="flex-1 truncate font-medium">{p.nickname}</span>
                  <span className={`text-xs font-medium ${p.online ? 'text-green-500' : 'text-gray-300'}`}>
                    {p.online ? '●' : '○'}
                  </span>
                  <span className="text-xs text-gray-400 font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">📝 办公室动态</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {world.log.length === 0 && <p className="text-gray-300 text-xs">安静的办公室...</p>}
              {[...world.log].reverse().map((entry, i) => (
                <div key={i} className="text-xs text-gray-500 py-1 border-b border-gray-50">
                  {entry.text}
                </div>
              ))}
            </div>
          </div>

          <a href="/" className="block text-center text-sm text-gray-400 hover:text-orange-500 transition-colors">
            ← 返回游戏大厅
          </a>
        </div>
      </div>
    </div>
  );
}
