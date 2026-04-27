'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ChatBox from '@/components/ChatBox';
import Timer from '@/components/Timer';
import Canvas from '@/components/Canvas';
import ToastContainer, { showToast } from '@/components/Toast';
import type { Stroke } from '@/lib/types';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

export default function DrawPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { room, playerId, socket, sendAction, sendStroke } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStrokes, setRemoteStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-guess') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname ?? '???'} 答对了! +${event.score}分`);
        setMessages((prev) => [...prev, {
          playerId: event.playerId,
          nickname: player?.nickname ?? '???',
          text: '答对了!',
          isCorrect: true,
        }]);
      }
      if (event.type === 'chat') {
        const player = room?.players.find((p) => p.id === event.playerId);
        setMessages((prev) => [...prev, {
          playerId: event.playerId as string,
          nickname: player?.nickname ?? '???',
          text: event.text as string,
        }]);
      }
      if (event.type === 'new-round') {
        setMessages([]);
        setRemoteStrokes([]);
      }
      if (event.type === 'time-up') {
        showToast(`时间到! 答案是: ${event.word}`);
      }
    };
    const handleStroke = (stroke: Stroke) => {
      setRemoteStrokes((prev) => [...prev, stroke]);
    };

    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    socket.on('draw:stroke', handleStroke);
    return () => {
      socket.off('game:state', handleState);
      socket.off('game:event', handleEvent);
      socket.off('draw:stroke', handleStroke);
    };
  }, [socket, room?.players]);

  useEffect(() => {
    if (room?.status === 'result') router.push(`/room/${code}/result`);
  }, [room?.status, code, router]);

  const handleGuess = useCallback((text: string) => {
    sendAction({ type: 'guess', text });
  }, [sendAction]);

  const handleStroke = useCallback((stroke: Stroke) => {
    sendStroke(stroke);
  }, [sendStroke]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isDrawer = playerId === gameState.drawerId;
  const hasGuessed = gameState.guessedPlayerIds?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-3">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="🎨 你画我猜" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList
        players={room.players}
        hostId={room.hostId}
        currentPlayerId={playerId ?? undefined}
        highlightId={gameState.drawerId}
      />

      <div className="text-center text-lg font-semibold">
        第 {gameState.round} / {gameState.totalRounds} 轮
        {isDrawer ? (
          <span className="ml-2">你来画: <span className="text-yellow-400">{gameState.word}</span></span>
        ) : (
          <span className="ml-2">提示: <span className="tracking-widest">{gameState.hints}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Canvas
            key={gameState.round}
            disabled={!isDrawer}
            onStroke={isDrawer ? handleStroke : undefined}
            remoteStrokes={!isDrawer ? remoteStrokes : undefined}
          />
        </div>
        <div>
          <ChatBox
            messages={messages}
            onSend={handleGuess}
            placeholder={isDrawer ? '你是画手，不能猜哦' : hasGuessed ? '你已答对!' : '输入答案...'}
            disabled={isDrawer || hasGuessed}
          />
        </div>
      </div>
    </div>
  );
}
