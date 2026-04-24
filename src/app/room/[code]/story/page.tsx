'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function StoryPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'sentence-added') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 写好了!`);
      }
      if (event.type === 'vote-winner') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`最搞笑: ${player?.nickname}! 获得 ${event.votes} 票`);
      }
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendAction({ type: 'write', text: input.trim() });
    setInput('');
  };

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="📖 故事接龙" timeLeft={gameState.timeLeft} />
      {gameState.phase === 'writing' && <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />}
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      {gameState.phase === 'writing' && (
        <div className="card">
          <div className="text-center text-sm text-white/60 mb-2">第 {gameState.sentenceCount + 1} / {gameState.totalSentences} 句</div>
          {gameState.isMyTurn ? (
            <div className="space-y-3">
              <div className="glass rounded-xl p-4">
                <div className="text-sm text-white/60 mb-1">上一句:</div>
                <div className="text-lg">{gameState.lastSentence}</div>
              </div>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="续写一句话..." maxLength={100}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none h-24" />
              <button onClick={handleSubmit} disabled={!input.trim()} className="w-full btn-primary disabled:opacity-50">提交</button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✍️</div>
              <p className="text-white/60">等待其他玩家写作中...</p>
            </div>
          )}
        </div>
      )}

      {gameState.phase === 'reveal' && (
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-center">完整故事</h3>
          <div className="space-y-2">
            {gameState.sentences.map((s: any, i: number) => {
              const player = room.players.find((p) => p.id === s.playerId);
              return (
                <div key={i} className="glass rounded-xl p-3">
                  <span className="text-white/40 text-xs">{player?.nickname}</span>
                  <div>{s.text}</div>
                </div>
              );
            })}
          </div>
          {room.hostId === playerId && (
            <button onClick={() => sendAction({ type: 'ready-to-vote' })} className="w-full btn-primary mt-4">开始投票: 最搞笑的一句</button>
          )}
        </div>
      )}

      {gameState.phase === 'voting' && (
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-center">投票: 最搞笑的一句</h3>
          <div className="space-y-2">
            {gameState.sentences.filter((s: any) => s.playerId !== playerId).map((s: any, i: number) => {
              const player = room.players.find((p) => p.id === s.playerId);
              return (
                <button key={i} onClick={() => sendAction({ type: 'vote', sentencePlayerId: s.playerId })}
                  disabled={gameState.votedFor !== null}
                  className={`w-full glass rounded-xl p-3 text-left hover:bg-white/20 disabled:opacity-60 ${gameState.votedFor === s.playerId ? 'ring-2 ring-yellow-400' : ''}`}>
                  <span className="text-white/40 text-xs">{player?.nickname}</span>
                  <div>{s.text}</div>
                </button>
              );
            })}
          </div>
          <p className="text-center text-white/40 text-sm mt-3">{gameState.votedCount}/{gameState.totalPlayers} 已投票</p>
        </div>
      )}
    </div>
  );
}
