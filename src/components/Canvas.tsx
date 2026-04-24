'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Stroke } from '@/lib/types';

interface CanvasProps {
  disabled?: boolean;
  onStroke?: (stroke: Stroke) => void;
  remoteStrokes?: Stroke[];
}

const COLORS = ['#000000', '#ff0000', '#0066ff', '#00cc44', '#ff9900', '#9933ff', '#ffffff'];
const WIDTHS = [2, 5, 10];

export default function Canvas({ disabled, onStroke, remoteStrokes }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#000000');
  const [width, setWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) => {
    if (stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!remoteStrokes?.length) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const last = remoteStrokes[remoteStrokes.length - 1];
    drawStroke(ctx, last, canvas.width, canvas.height);
  }, [remoteStrokes, drawStroke]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStrokeRef.current.push(pos);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const points = currentStrokeRef.current;
    if (points.length >= 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[points.length - 2].x * canvas.width, points[points.length - 2].y * canvas.height);
      ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
      ctx.stroke();
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 1) {
      const stroke: Stroke = { points: currentStrokeRef.current, color, width };
      onStroke?.(stroke);
    }
    currentStrokeRef.current = [];
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full aspect-[4/3] rounded-xl cursor-crosshair touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {!disabled && (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-yellow-400 scale-110' : 'border-white/30'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`w-8 h-8 rounded-lg glass flex items-center justify-center ${width === w ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="bg-white rounded-full" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>
          <button onClick={handleClear} className="ml-auto text-sm btn-secondary py-1.5 px-4">
            清空
          </button>
        </div>
      )}
    </div>
  );
}
