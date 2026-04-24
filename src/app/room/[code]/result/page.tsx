'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerHistory } from '@/hooks/usePlayerHistory';
import StatusBar from '@/components/StatusBar';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, sendAction } = useSocket();
  const { addRecord } = usePlayerHistory();
  const recordedRef = useRef(false);

  const sortedPlayers = room
    ? [...room.players].sort((a, b) => b.score - a.score)
    : [];

  const myRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

  useEffect(() => {
    if (!room || !playerId || recordedRef.current) return;
    const me = room.players.find((p) => p.id === playerId);
    if (!me || !room.currentGame) return;

    const gameNames: Record<string, string> = {
      draw: '你画我猜', music: '听歌识曲', emoji: 'Emoji猜词',
      spy: '谁是卧底', quiz: '抢答题', rank: '排名猜猜猜', story: '故事接龙',
    };

    addRecord({
      game: gameNames[room.currentGame] || room.currentGame,
      score: me.score,
      rank: myRank,
      totalPlayers: room.players.length,
      date: new Date().toISOString(),
    });
    recordedRef.current = true;
  }, [room, playerId, myRank, addRecord]);

  useEffect(() => {
    if (room?.status === 'waiting') {
      router.push(`/room/${code}`);
    }
  }, [room?.status, code, router]);

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isHost = room.hostId === playerId;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <StatusBar roomCode={code} gameName="游戏结束" />

      <div className="text-center py-4">
        <div className="text-5xl mb-2">{medals[myRank - 1] || '🎮'}</div>
        <h2 className="text-2xl font-bold">
          {myRank === 1 ? '你赢了!' : `第 ${myRank} 名`}
        </h2>
      </div>

      <div className="card">
        <h3 className="font-bold text-lg mb-3">排行榜</h3>
        <div className="space-y-2">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 glass rounded-xl px-4 py-3 ${
                p.id === playerId ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <span className="text-2xl w-10 text-center">{medals[i] || `${i + 1}`}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: p.color }}
              >
                {p.nickname[0]}
              </div>
              <span className="flex-1 font-semibold">{p.nickname}</span>
              <span className="text-xl font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="flex gap-3">
          <button
            onClick={() => sendAction({ type: 'back-to-room' })}
            className="flex-1 btn-primary"
          >
            换个游戏
          </button>
        </div>
      )}
      {!isHost && <p className="text-center text-white/40 text-sm">等待房主操作...</p>}
    </div>
  );
}
