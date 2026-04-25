'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

export default function RankPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => {
      setGameState(state);
      if (state.items && order.length === 0) {
        setOrder(state.items.map((_: any, i: number) => i));
      }
    };
    const handleEvent = (event: any) => {
      if (event.type === 'round-result') showToast('本轮结束!');
      if (event.type === 'new-round') setOrder([]);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, order.length]);

  useEffect(() => {
    if (room?.status === 'result') router.push(`/room/${code}/result`);
  }, [room?.status, code, router]);

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, removed);
    setOrder(newOrder);
    setDragIndex(index);
  };

  const handleSubmit = useCallback(() => {
    sendAction({ type: 'submit', order });
  }, [sendAction, order]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const hasSubmitted = gameState.mySubmission !== null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto space-y-4">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="📊 排名猜猜猜" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} />
      <div className="text-center text-sm text-white/60">
        第 {gameState.round} / {gameState.totalRounds} 题 · {gameState.submittedCount}/{gameState.totalPlayers} 已提交
      </div>
      <div className="card">
        <h2 className="text-lg font-bold text-center mb-4">{gameState.topic}</h2>
        <div className="space-y-2">
          {order.map((itemIndex, position) => (
            <div
              key={itemIndex}
              draggable={!hasSubmitted}
              onDragStart={() => handleDragStart(position)}
              onDragOver={(e) => handleDragOver(e, position)}
              className={`glass rounded-xl px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing ${hasSubmitted ? 'opacity-60' : 'hover:bg-white/20'}`}
            >
              <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{position + 1}</span>
              <span>{gameState.items[itemIndex]}</span>
            </div>
          ))}
        </div>
        {!hasSubmitted && <button onClick={handleSubmit} className="w-full btn-primary mt-4">提交排名</button>}
        {hasSubmitted && <p className="text-center text-white/40 text-sm mt-3">等待其他玩家...</p>}
      </div>
    </div>
  );
}
