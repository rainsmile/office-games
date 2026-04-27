'use client';

interface OfficeCellProps {
  type: string;
  owner: string | null;
  ownerName?: string;
  ownerColor?: string;
  isMe: boolean;
  isExpandable: boolean;
  isTarget: boolean;
  onClick?: () => void;
}

const CELL_ICONS: Record<string, string> = {
  desk: '🖥️',
  meeting: '📋',
  break: '☕',
  plant: '🌿',
  'server-room': '🖧',
  empty: '',
};

const CELL_BG: Record<string, string> = {
  desk: '#f8f4ee',
  meeting: '#e8f0fe',
  break: '#fef3e8',
  plant: '#e8f8ee',
  'server-room': '#eee8f8',
  empty: '#f0ece4',
};

export default function OfficeCell({ type, owner, ownerName, ownerColor, isMe, isExpandable, isTarget, onClick }: OfficeCellProps) {
  const bg = owner ? `${ownerColor}18` : CELL_BG[type] || '#f5f5f5';
  const canClick = isExpandable && !isMe && type === 'desk';

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`
        relative w-full aspect-square rounded-lg transition-all duration-200
        ${canClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
        ${isMe ? 'ring-2 ring-yellow-400 shadow-md' : ''}
        ${isTarget ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''}
      `}
      style={{
        backgroundColor: bg,
        border: owner ? `2.5px solid ${ownerColor}` : '2px solid #e0dcd4',
      }}
    >
      {/* Cell content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {type === 'desk' && owner && (
          <>
            {/* Desk illustration */}
            <div
              className="w-8 h-6 rounded-sm flex items-center justify-center text-xs shadow-sm mb-0.5"
              style={{ backgroundColor: ownerColor, color: 'white' }}
            >
              🖥️
            </div>
            <div className="text-[9px] font-bold truncate max-w-full px-1" style={{ color: ownerColor }}>
              {ownerName}
            </div>
          </>
        )}

        {type === 'desk' && !owner && !isExpandable && (
          <div className="text-lg opacity-30">🪑</div>
        )}

        {type === 'desk' && !owner && isExpandable && (
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center text-blue-400 text-sm font-bold animate-pulse">
              +
            </div>
          </div>
        )}

        {type === 'meeting' && (
          <div className="text-xl">📋</div>
        )}

        {type === 'break' && (
          <div className="text-xl">☕</div>
        )}

        {type === 'plant' && (
          <div className="text-xl">🌿</div>
        )}

        {type === 'server-room' && (
          <div className="text-xl">🖥️</div>
        )}

        {type === 'empty' && (
          <div className="w-full h-full rounded-md" style={{ backgroundColor: '#e8e4dc' }} />
        )}
      </div>
    </div>
  );
}
