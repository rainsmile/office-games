'use client';

interface OfficeCellProps {
  type: string;
  zone: string;
  zoneColor: string;
  zoneName: string;
  owner: string | null;
  ownerName?: string;
  ownerColor?: string;
  isMe: boolean;
  isExpandable: boolean;
  isTarget: boolean;
  onClick?: () => void;
}

export default function OfficeCell({
  type, zone, zoneColor, zoneName,
  owner, ownerName, ownerColor,
  isMe, isExpandable, isTarget, onClick,
}: OfficeCellProps) {
  if (type === 'corridor') {
    return <div className="w-full aspect-[5/4] rounded" style={{ backgroundColor: '#e8e4dc' }} />;
  }

  if (type === 'wall') {
    return <div className="w-full aspect-[5/4] rounded bg-gray-300" />;
  }

  if (type === 'plant') {
    return (
      <div className="w-full aspect-[5/4] rounded flex items-center justify-center" style={{ backgroundColor: '#e0f2e0' }}>
        <span className="text-lg">🌿</span>
      </div>
    );
  }

  if (type === 'break') {
    return (
      <div className="w-full aspect-[5/4] rounded flex items-center justify-center" style={{ backgroundColor: '#fff3e0' }}>
        <span className="text-lg">☕</span>
      </div>
    );
  }

  if (type === 'meeting') {
    return (
      <div className="w-full aspect-[5/4] rounded flex items-center justify-center" style={{ backgroundColor: `${zoneColor}15`, border: `1.5px solid ${zoneColor}40` }}>
        <span className="text-lg">📋</span>
      </div>
    );
  }

  // Desk cell
  const canClick = isExpandable && !isMe && type === 'desk';
  const baseBg = owner ? `${ownerColor}20` : `${zoneColor}12`;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`
        relative w-full aspect-[5/4] rounded-lg transition-all duration-200 overflow-hidden
        ${canClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
        ${isMe ? 'ring-2 ring-yellow-400 shadow-md' : ''}
        ${isTarget ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''}
      `}
      style={{
        backgroundColor: baseBg,
        border: owner ? `2px solid ${ownerColor}` : `1.5px solid ${zoneColor}50`,
      }}
    >
      {/* Zone color stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: zoneColor }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        {owner ? (
          <>
            <div
              className="w-7 h-5 rounded-sm flex items-center justify-center text-[10px] shadow-sm mb-0.5"
              style={{ backgroundColor: ownerColor, color: 'white' }}
            >
              🖥️
            </div>
            <div className="text-[8px] font-bold truncate max-w-full px-0.5" style={{ color: ownerColor }}>
              {ownerName}
            </div>
          </>
        ) : isExpandable ? (
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center text-blue-400 text-xs font-bold animate-pulse">
            +
          </div>
        ) : (
          <div className="text-sm opacity-30">🪑</div>
        )}
      </div>
    </div>
  );
}
