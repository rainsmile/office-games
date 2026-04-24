'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function MusicPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => {
      setGameState(state);
      if (audioRef.current && state.previewUrl) {
        audioRef.current.src = state.previewUrl;
        audioRef.current.play().catch(() => {});
      }
    };
    const handleEvent = (event: any) => {
      if (event.type === 'correct-answer') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 答对了! +${event.bonus}分`);
      }
      if (event.type === 'round-result' || event.type === 'time-up') {
        setCorrectAnswer(event.correctAnswer as string);
        setTimeout(() => setCorrectAnswer(null), 2000);
      }
      if (event.type === 'new-round') setCorrectAnswer(null);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const hasAnswered = gameState.myAnswer !== null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <audio ref={audioRef} />
      <StatusBar roomCode={code} gameName="🎵 听歌识曲" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />
      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 首 · {gameState.answeredCount}/{gameState.totalPlayers} 已作答
      </div>
      <div className="card text-center py-8">
        <div className="text-6xl mb-4">🎶</div>
        <p className="text-white/60">仔细听...</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {gameState.options.map((opt: string, i: number) => {
          let style = 'glass hover:bg-white/20';
          if (correctAnswer !== null) {
            if (opt === correctAnswer) style = 'bg-green-500/40 border-green-400';
            else if (gameState.myAnswer === i) style = 'bg-red-500/40 border-red-400';
          } else if (gameState.myAnswer === i) {
            style = 'bg-blue-500/30 border-blue-400';
          }
          return (
            <button key={i} onClick={() => sendAction({ type: 'answer', answer: i })} disabled={hasAnswered}
              className={`${style} rounded-xl px-6 py-4 text-left text-lg border border-transparent transition-all disabled:cursor-default`}>
              <span className="font-bold mr-3 text-white/50">{'ABCD'[i]}</span>{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
