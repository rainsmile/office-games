'use client';

interface TimerProps {
  seconds: number;
  total: number;
}

export default function Timer({ seconds, total }: TimerProps) {
  const pct = (seconds / total) * 100;
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-1000 ${
          pct > 30 ? 'bg-green-400' : pct > 10 ? 'bg-yellow-400' : 'bg-red-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
