'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function QuizPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-answer') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname} 答对了! +${event.bonus}分`);
      }
      if (event.type === 'round-result') {
        setCorrectAnswer(event.correctAnswer as number);
        setTimeout(() => setCorrectAnswer(null), 2000);
      }
      if (event.type === 'time-up') setCorrectAnswer(event.correctAnswer as number);
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
      <StatusBar roomCode={code} gameName="❓ 抢答题" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />

      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 题 · {gameState.answeredCount}/{gameState.totalPlayers} 已作答
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-center mb-6">{gameState.question}</h2>
        <div className="grid grid-cols-1 gap-3">
          {gameState.options.map((opt: string, i: number) => {
            let style = 'glass hover:bg-white/20';
            if (correctAnswer !== null) {
              if (i === correctAnswer) style = 'bg-green-500/40 border-green-400';
              else if (gameState.myAnswer === i) style = 'bg-red-500/40 border-red-400';
            } else if (gameState.myAnswer === i) {
              style = 'bg-blue-500/30 border-blue-400';
            }

            return (
              <button
                key={i}
                onClick={() => sendAction({ type: 'answer', answer: i })}
                disabled={hasAnswered}
                className={`${style} rounded-xl px-6 py-4 text-left text-lg transition-all border border-transparent disabled:cursor-default`}
              >
                <span className="font-bold mr-3 text-white/50">{'ABCD'[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
