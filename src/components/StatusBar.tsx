'use client';

interface StatusBarProps {
  roomCode: string;
  gameName?: string;
  timeLeft?: number;
}

export default function StatusBar({ roomCode, gameName, timeLeft }: StatusBarProps) {
  return (
    <div className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="bg-white/20 px-3 py-1 rounded-lg font-mono tracking-widest">
          {roomCode}
        </span>
        {gameName && <span className="text-white/70">{gameName}</span>}
      </div>
      {timeLeft !== undefined && (
        <div className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>
          {timeLeft}s
        </div>
      )}
    </div>
  );
}
