'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerHistory } from '@/hooks/usePlayerHistory';

export default function LobbyPage() {
  const router = useRouter();
  const { connected, room, playerId, error, createRoom, joinRoom } = useSocket();
  const { history, setNickname: saveNickname } = usePlayerHistory();
  const [nickname, setNickname] = useState(history.nickname);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');

  useEffect(() => {
    if (room && room.code) {
      saveNickname(nickname);
      router.push(`/room/${room.code}`);
    }
  }, [room, nickname, router, saveNickname]);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    createRoom(nickname.trim());
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    joinRoom(nickname.trim(), roomCode.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-2">🎮 Game Zone</h1>
          <p className="text-white/70 text-lg">和同事来一局吧！</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">你的昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称..."
              maxLength={12}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50"
            />
          </div>

          {error && (
            <div className="bg-red-500/30 border border-red-400/50 rounded-xl px-4 py-2 text-sm">
              {error}
            </div>
          )}

          {mode === 'home' ? (
            <div className="space-y-3">
              <button
                onClick={handleCreate}
                disabled={!connected || !nickname.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建房间
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full btn-secondary"
              >
                加入房间
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/60 mb-1">房间码</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入6位房间码..."
                  maxLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 tracking-widest text-center text-xl"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={!connected || !nickname.trim() || roomCode.length !== 6}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                加入
              </button>
              <button onClick={() => setMode('home')} className="w-full btn-secondary">
                返回
              </button>
            </div>
          )}

          {!connected && (
            <p className="text-center text-yellow-300/70 text-sm">正在连接服务器...</p>
          )}
        </div>

        {history.totalGames > 0 && (
          <div className="card mt-4">
            <h3 className="font-semibold mb-2">📊 战绩</h3>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold">{history.totalGames}</div>
                <div className="text-sm text-white/60">总场次</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{history.totalWins}</div>
                <div className="text-sm text-white/60">获胜</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.totalGames > 0
                    ? Math.round((history.totalWins / history.totalGames) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-white/60">胜率</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
