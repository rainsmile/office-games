'use client';

import type { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId?: string;
  highlightId?: string;
}

export default function PlayerList({ players, hostId, currentPlayerId, highlightId }: PlayerListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm ${
            p.id === highlightId ? 'ring-2 ring-yellow-400' : ''
          } ${!p.online ? 'opacity-40' : ''}`}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: p.color }}
          >
            {p.nickname[0]}
          </div>
          <span>{p.nickname}</span>
          {p.id === hostId && <span className="text-yellow-400 text-xs">👑</span>}
          {p.id === currentPlayerId && <span className="text-xs text-white/40">(你)</span>}
          {p.score > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{p.score}</span>
          )}
        </div>
      ))}
    </div>
  );
}
