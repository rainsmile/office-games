'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import StatusBar from '@/components/StatusBar';
import PlayerList from '@/components/PlayerList';
import ChatBox from '@/components/ChatBox';
import Timer from '@/components/Timer';
import ToastContainer, { showToast } from '@/components/Toast';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

export default function EmojiPage() {
  const params = useParams();
  const code = params.code as string;
  const { room, playerId, socket, sendAction } = useSocket();
  const [gameState, setGameState] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [emojiInput, setEmojiInput] = useState('');

  useEffect(() => {
    if (!socket) return;
    const handleState = (state: any) => setGameState(state);
    const handleEvent = (event: any) => {
      if (event.type === 'correct-guess') {
        const player = room?.players.find((p) => p.id === event.playerId);
        showToast(`${player?.nickname ?? '???'} 答对了! +${event.score}分`);
        setMessages((prev) => [...prev, {
          playerId: event.playerId, nickname: player?.nickname ?? '???', text: '答对了!', isCorrect: true,
        }]);
      }
      if (event.type === 'chat') {
        const player = room?.players.find((p) => p.id === event.playerId);
        setMessages((prev) => [...prev, {
          playerId: event.playerId as string, nickname: player?.nickname ?? '???', text: event.text as string,
        }]);
      }
      if (event.type === 'new-round') {
        setMessages([]);
        setEmojiInput('');
      }
      if (event.type === 'time-up') showToast(`时间到! 答案是: ${event.word}`);
    };
    socket.on('game:state', handleState);
    socket.on('game:event', handleEvent);
    return () => { socket.off('game:state', handleState); socket.off('game:event', handleEvent); };
  }, [socket, room?.players]);

  const handleSendEmojis = () => {
    sendAction({ type: 'set-emojis', emojis: emojiInput });
  };

  const handleGuess = useCallback((text: string) => {
    sendAction({ type: 'guess', text });
  }, [sendAction]);

  if (!room || !gameState) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  const isPresenter = playerId === gameState.presenterId;
  const hasGuessed = gameState.guessedPlayerIds?.includes(playerId);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-3">
      <ToastContainer />
      <StatusBar roomCode={code} gameName="😜 Emoji 猜词" timeLeft={gameState.timeLeft} />
      <Timer seconds={gameState.timeLeft} total={room.settings.timeLimit} />
      <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId ?? undefined} highlightId={gameState.presenterId} />

      <div className="text-center text-lg font-semibold">
        第 {gameState.round} / {gameState.totalRounds} 轮
        {isPresenter ? (
          <span className="ml-2">你的词: <span className="text-yellow-400">{gameState.word}</span></span>
        ) : (
          <span className="ml-2">提示: <span className="tracking-widest">{gameState.hints}</span></span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <div className="card min-h-[200px] flex items-center justify-center">
            <div className="text-6xl tracking-wider">{gameState.emojis || '...'}</div>
          </div>
          {isPresenter && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={emojiInput}
                onChange={(e) => setEmojiInput(e.target.value)}
                placeholder="输入 emoji 组合..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center"
              />
              <button onClick={handleSendEmojis} className="btn-primary">发送</button>
            </div>
          )}
        </div>
        <div>
          <ChatBox
            messages={messages}
            onSend={handleGuess}
            placeholder={isPresenter ? '你是出题者' : hasGuessed ? '你已答对!' : '输入答案...'}
            disabled={isPresenter || hasGuessed}
          />
        </div>
      </div>
    </div>
  );
}
