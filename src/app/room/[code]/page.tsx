'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ToastContainer, { showToast } from '@/components/Toast';
import type { GameType } from '@/lib/types';

const GAMES: { id: GameType; name: string; emoji: string; minPlayers: number }[] = [
  { id: 'draw', name: '你画我猜', emoji: '🎨', minPlayers: 2 },
  { id: 'music', name: '听歌识曲', emoji: '🎵', minPlayers: 2 },
  { id: 'emoji', name: 'Emoji 猜词', emoji: '😜', minPlayers: 2 },
  { id: 'spy', name: '谁是卧底', emoji: '🕵️', minPlayers: 4 },
  { id: 'quiz', name: '抢答题', emoji: '❓', minPlayers: 2 },
  { id: 'rank', name: '排名猜猜猜', emoji: '📊', minPlayers: 2 },
  { id: 'story', name: '故事接龙', emoji: '📖', minPlayers: 2 },
  { id: 'office', name: '办公室争霸', emoji: '🏢', minPlayers: 2 },
];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { room, playerId, startGame, kickPlayer, updateSettings, leaveRoom, socket } = useSocket();

  const code = params.code as string;
  const isHost = room?.hostId === playerId;
  const playerCount = room?.players.length ?? 0;

  useEffect(() => {
    if (!socket) return;
    const handler = (data: { player: any }) => {
      showToast(`${data.player.nickname} 加入了房间`);
    };
    socket.on('room:player-joined', handler);
    return () => { socket.off('room:player-joined', handler); };
  }, [socket]);

  useEffect(() => {
    if (room?.status === 'playing' && room.currentGame) {
      router.push(`/room/${code}/${room.currentGame}`);
    }
    if (room?.status === 'result') {
      router.push(`/room/${code}/result`);
    }
  }, [room?.status, room?.currentGame, code, router]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">正在连接房间...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} />

      <div className="card">
        <h2 className="font-bold text-lg mb-3">玩家 ({playerCount}/6)</h2>
        <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />
      </div>

      {isHost && (
        <div className="card">
          <h2 className="font-bold text-lg mb-3">设置</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="text-white/60">回合数</label>
            <select
              value={room.settings.rounds}
              onChange={(e) => updateSettings({ rounds: Number(e.target.value) })}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5"
            >
              {[2, 3, 5, 7].map((n) => (
                <option key={n} value={n} className="bg-gray-800">{n} 回合</option>
              ))}
            </select>
            <label className="text-white/60">时间</label>
            <select
              value={room.settings.timeLimit}
              onChange={(e) => updateSettings({ timeLimit: Number(e.target.value) })}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5"
            >
              {[30, 45, 60, 90].map((n) => (
                <option key={n} value={n} className="bg-gray-800">{n} 秒</option>
              ))}
            </select>
            <label className="text-white/60">曲库</label>
            <select
              value={room.settings.musicGenre}
              onChange={(e) => updateSettings({ musicGenre: e.target.value })}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5"
            >
              <option value="chinese-pop" className="bg-gray-800">华语流行</option>
              <option value="western-pop" className="bg-gray-800">欧美流行</option>
              <option value="kpop" className="bg-gray-800">韩语流行</option>
              <option value="jpop" className="bg-gray-800">日语流行</option>
              <option value="classic-chinese" className="bg-gray-800">经典老歌</option>
            </select>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-bold text-lg mb-3">选择游戏</h2>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game) => {
            const disabled = !isHost || playerCount < game.minPlayers;
            return (
              <button
                key={game.id}
                onClick={() => startGame(game.id)}
                disabled={disabled}
                className="glass rounded-xl p-4 text-center transition-all hover:scale-105 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="text-3xl mb-1">{game.emoji}</div>
                <div className="text-sm font-semibold">{game.name}</div>
                {playerCount < game.minPlayers && (
                  <div className="text-xs text-white/40 mt-1">至少 {game.minPlayers} 人</div>
                )}
              </button>
            );
          })}
        </div>
        {!isHost && <p className="text-center text-white/40 text-sm mt-3">等待房主选择游戏...</p>}
      </div>

      <button
        onClick={() => { leaveRoom(); router.push('/'); }}
        className="w-full btn-secondary text-red-300 hover:text-red-200"
      >
        退出房间
      </button>
    </div>
  );
}
