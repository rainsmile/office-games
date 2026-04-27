'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import OfficeCell from '@/components/office/OfficeCell';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

interface CellData {
  type: string;
  zone: string;
  zoneColor: string;
  zoneName: string;
  owner: string | null;
  level: number;
}

interface EquipmentTier {
  level: number;
  name: string;
  price: number;
  bonus: number;
}

interface EquipmentType {
  id: string;
  label: string;
  icon: string;
  tiers: EquipmentTier[];
}

interface PlayerData {
  id: string;
  username: string;
  color: string;
  coins: number;
  energy: number;
  kpi: number;
  online: boolean;
  equipment?: Record<string, number>;
}

interface WorldState {
  grid: CellData[][];
  players: Record<string, PlayerData>;
  tick: number;
  log: { text: string; time: number }[];
  gridRows: number;
  gridCols: number;
  cycleSeconds: number;
}

export default function OfficePage() {
  const socketRef = useRef<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [expandTarget, setExpandTarget] = useState<{ x: number; y: number } | null>(null);
  const [actionAck, setActionAck] = useState<string | null>(null);
  const [cycleCountdown, setCycleCountdown] = useState(5);
  const [showShop, setShowShop] = useState(false);
  const [shopData, setShopData] = useState<EquipmentType[]>([]);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [viewPlayer, setViewPlayer] = useState<string | null>(null);

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

    socket.on('office:joined', ({ playerId: pid, username: uname }) => {
      setPlayerId(pid);
      setJoined(true);
      setAuthError(null);
      sessionStorage.setItem('office-pid', pid);
      if (uname) sessionStorage.setItem('office-user', uname);
      socket.emit('office:get-shop');
    });

    socket.on('office:error', ({ message }) => {
      setAuthError(message);
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

    socket.on('office:shop-data', ({ types }: { types: EquipmentType[] }) => {
      setShopData(types);
    });

    socket.on('office:buy-result', (result: any) => {
      if (result.ok) {
        setShopMsg('购买成功！');
      } else {
        setShopMsg(result.error);
      }
      setTimeout(() => setShopMsg(null), 2000);
    });

    socket.on('office:action-ack', ({ action }) => {
      setActionAck(action);
    });

    // Auto-reconnect
    const savedPid = sessionStorage.getItem('office-pid');
    if (savedPid) {
      socket.emit('office:reconnect', { playerId: savedPid });
    }

    return () => { socket.disconnect(); };
  }, []);

  const handleAuth = useCallback(() => {
    if (!username.trim() || !password || !socketRef.current) return;
    setAuthError(null);
    const event = isRegister ? 'office:register' : 'office:login';
    socketRef.current.emit(event, { username: username.trim(), password });
  }, [username, password, isRegister]);

  const sendAction = useCallback((action: any) => {
    socketRef.current?.emit('office:action', action);
  }, []);

  const openShop = () => {
    socketRef.current?.emit('office:get-shop');
    setShowShop(true);
    setShopMsg(null);
  };

  const buyEquipment = (equipmentId: string) => {
    socketRef.current?.emit('office:buy-equipment', { equipmentId });
  };

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

  const handleSlack = () => {
    setSelectedAction('slack');
    setExpandTarget(null);
    sendAction({ type: 'slack' });
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
            <p className="text-gray-400 text-sm mt-2">占工位 · 偷袭 · 当老板</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名（2-8个字符）"
              maxLength={8}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-center text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="密码（至少4位）"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-center text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
            />
            {authError && (
              <p className="text-red-500 text-sm text-center font-medium">{authError}</p>
            )}
            <button
              onClick={handleAuth}
              disabled={!username.trim() || !password}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl text-lg hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {isRegister ? '注册并入职' : '登录上班'} →
            </button>
            <button
              onClick={() => { setIsRegister(!isRegister); setAuthError(null); }}
              className="w-full text-sm text-gray-400 hover:text-orange-500 transition-colors"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？注册一个'}
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
    for (let y = 0; y < world.gridRows; y++) {
      for (let x = 0; x < world.gridCols; x++) {
        if (world.grid[y][x].owner === playerId || world.grid[y][x].type !== 'desk') continue;
        const adj = [[y-1,x],[y+1,x],[y,x-1],[y,x+1]];
        if (adj.some(([ny,nx]) => ny >= 0 && ny < world.gridRows && nx >= 0 && nx < world.gridCols && world.grid[ny][nx].owner === playerId)) {
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
              🧨 偷袭
            </button>
            <button
              onClick={handleSlack}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                selectedAction === 'slack'
                  ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              🐟 摸鱼 <span className="text-xs opacity-60">(+⚡ 可能被抓)</span>
            </button>
            {actionAck && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                ✅ 已提交: {{ work: '工作', expand: '扩张', sabotage: '偷袭', slack: '摸鱼' }[actionAck] ?? actionAck}
                {expandTarget && ` → [${expandTarget.y+1},${expandTarget.x+1}]`}
              </span>
            )}
          </div>

          {/* Map */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 overflow-x-auto">
            <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${world.gridCols}, minmax(40px, 56px))`, width: 'fit-content' }}>
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
                      zone={cell.zone}
                      zoneColor={cell.zoneColor}
                      zoneName={cell.zoneName}
                      owner={cell.owner}
                      ownerName={ownerData?.username}
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
                  {(me.username ?? '?')[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{me.username}</div>
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
              <button
                onClick={openShop}
                className="w-full mt-3 bg-orange-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                🛒 商城
              </button>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">🏆 排行榜</h3>
            <div className="space-y-1.5">
              {leaderboard.map((p, i) => (
                <div key={p.id} onClick={() => { setViewPlayer(p.id); if (!shopData.length) socketRef.current?.emit('office:get-shop'); }} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 ${p.id === playerId ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
                  <span className="w-5 text-center font-bold text-gray-400">{['🥇','🥈','🥉'][i] ?? `${i+1}`}</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.color }}>
                    {(p.username ?? '?')[0]}
                  </div>
                  <span className="flex-1 truncate font-medium">{p.username}</span>
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

      {/* Shop Modal */}
      {showShop && me && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShop(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-gray-800">🛒 办公装备商城</h2>
              <button onClick={() => setShowShop(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-1">装备提升工作效率，赚更多金币</p>
            <p className="text-sm font-bold text-yellow-600 mb-4">💰 余额: {me.coins}</p>
            {shopMsg && <p className={`text-sm font-medium mb-3 ${shopMsg === '购买成功！' ? 'text-green-500' : 'text-red-500'}`}>{shopMsg}</p>}
            <div className="space-y-3">
              {shopData.length === 0 && <p className="text-gray-400 text-sm text-center py-4">加载中...</p>}
              {shopData.map(type => {
                const myLevel = me.equipment?.[type.id] ?? 0;
                const current = myLevel > 0 ? type.tiers[myLevel - 1] : null;
                const next = myLevel < type.tiers.length ? type.tiers[myLevel] : null;
                return (
                  <div key={type.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-bold text-gray-800">{type.label}</span>
                      {current && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Lv.{myLevel}</span>}
                    </div>
                    {current && (
                      <p className="text-sm text-gray-600 mb-1">当前: <span className="font-medium">{current.name}</span> <span className="text-green-500">(+{Math.round(current.bonus * 100)}%效率)</span></p>
                    )}
                    {next ? (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-sm text-gray-500">{myLevel === 0 ? '购买' : '升级'}: <span className="font-medium text-gray-800">{next.name}</span></p>
                          <p className="text-xs text-green-500">+{Math.round(next.bonus * 100)}% 效率</p>
                        </div>
                        <button
                          onClick={() => buyEquipment(type.id)}
                          disabled={me.coins < next.price}
                          className="bg-orange-500 text-white font-bold py-1.5 px-4 rounded-lg text-sm hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          💰 {next.price}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-green-600 font-bold mt-1">✅ 已满级</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player Equipment Modal */}
      {viewPlayer && world.players[viewPlayer] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewPlayer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            {(() => {
              const vp = world.players[viewPlayer];
              const eq = vp.equipment ?? {};
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: vp.color }}>
                      {(vp.username ?? '?')[0]}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{vp.username}</div>
                      <div className="text-xs text-gray-400">{vp.online ? '🟢 在线' : '⚪ 离线'}</div>
                    </div>
                    <button onClick={() => setViewPlayer(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>
                  <h3 className="font-bold text-gray-700 text-sm mb-3">办公装备</h3>
                  <div className="space-y-2">
                    {shopData.length > 0 ? shopData.map(type => {
                      const level = eq[type.id] ?? 0;
                      const tier = level > 0 ? type.tiers[level - 1] : null;
                      return (
                        <div key={type.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <span className="text-lg">{type.icon}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{type.label}</div>
                            <div className="text-xs text-gray-500">{tier ? tier.name : '未购买'}</div>
                          </div>
                          {tier && <span className="text-xs text-green-500 font-medium">+{Math.round(tier.bonus * 100)}%</span>}
                        </div>
                      );
                    }) : (
                      // Fallback if shop data not loaded
                      Object.entries(eq).map(([id, level]) => (
                        <div key={id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-800">{id}</div>
                          <span className="text-xs text-orange-500">Lv.{level as number}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
