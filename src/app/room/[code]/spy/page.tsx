'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ToastContainer, { showToast } from '@/components/Toast';

export default function SpyPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'player-eliminated') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 被投出! ${event.isSpy ? '是卧底!' : '不是卧底...'}`);
      }
      if (event.type === 'vote-tie') showToast('平票! 无人出局');
      if (event.type === 'game-over') {
        showToast(event.winner === 'spy' ? '卧底获胜!' : '平民获胜!');
      }
      if (event.type === 'new-round') {
        setDescription('');
        setVoteTarget(null);
      }
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  useEffect(() => {
    if (room?.status === 'result') router.push(`/room/${code}/result`);
  }, [room?.status, code, router]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isAlive = gameState.alivePlayers.includes(playerId);
  const hasDescribed = gameState.descriptions[playerId!];
  const hasVoted = gameState.votes?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="🕵️ 谁是卧底" timeLeft={gameState.timeLeft} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="card text-center">
        <div className="text-sm text-white/60 mb-1">你的词语</div>
        <div className="text-3xl font-bold">{gameState.myWord}</div>
        <div className={`text-xs mt-1 ${gameState.isSpy ? 'text-red-400' : 'text-green-400'}`}>
          {gameState.isSpy ? '你是卧底' : '你是平民'}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">第 {gameState.round} 轮 — {gameState.phase === 'describe' ? '描述阶段' : '投票阶段'}</h3>

        {gameState.phase === 'describe' && (
          <div>
            {Object.entries(gameState.descriptions).map(([pid, text]) => {
              const player = room.players.find((p) => p.id === pid);
              return (
                <div key={pid} className="py-2 border-b border-white/10">
                  <span className="text-white/60">{player?.nickname}:</span> {text as string}
                </div>
              );
            })}
            {isAlive && !hasDescribed && (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="用一句话描述你的词..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2"
                />
                <button
                  onClick={() => { sendAction({ type: 'describe', text: description }); }}
                  disabled={!description.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  提交
                </button>
              </div>
            )}
            {hasDescribed && <p className="text-white/40 text-sm mt-2">等待其他玩家描述...</p>}
          </div>
        )}

        {gameState.phase === 'vote' && isAlive && !hasVoted && (
          <div className="space-y-2">
            <p className="text-sm text-white/60">投票选出你认为的卧底:</p>
            {gameState.alivePlayers
              .filter((id: string) => id !== playerId)
              .map((id: string) => {
                const player = room.players.find((p) => p.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setVoteTarget(id);
                      sendAction({ type: 'vote', targetId: id });
                    }}
                    className={`w-full glass rounded-xl px-4 py-3 text-left hover:bg-white/20 ${
                      voteTarget === id ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    {player?.nickname}
                  </button>
                );
              })}
          </div>
        )}
        {gameState.phase === 'vote' && hasVoted && (
          <p className="text-white/40 text-sm">等待其他玩家投票...</p>
        )}
        {!isAlive && <p className="text-white/40 text-sm">你已出局，观战中...</p>}
      </div>
    </div>
  );
}
