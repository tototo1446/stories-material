import React, { useState, useRef } from 'react';
import { LogoOverlaySettings } from '../types';

interface LogoOverlayProps {
  logoUrl: string;
  settings: LogoOverlaySettings;
  onSettingsChange: (updates: Partial<LogoOverlaySettings>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
}

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl,
  settings,
  onSettingsChange,
  containerRef,
  interactive,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  if (!settings.visible) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (settings.x / 100) * rect.width;
    const currentY = (settings.y / 100) * rect.height;
    dragOffset.current = {
      offsetX: e.clientX - rect.left - currentX,
      offsetY: e.clientY - rect.top - currentY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left - dragOffset.current.offsetX) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top - dragOffset.current.offsetY) / rect.height) * 100;
    const wPct = Math.max(8, settings.scale * 30);
    const hW = wPct / 2;
    const hH = hW * 0.6;
    onSettingsChange({
      x: Math.max(hW, Math.min(100 - hW, rawX)),
      y: Math.max(hH, Math.min(100 - hH, rawY)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const logoWidthPct = Math.max(8, settings.scale * 30);
  const halfW = logoWidthPct / 2;
  // ロゴのアスペクト比が不明なので、高さ方向は幅の半分程度と見積もる
  const halfH = halfW * 0.6;
  const clampedX = Math.max(halfW, Math.min(100 - halfW, settings.x));
  const clampedY = Math.max(halfH, Math.min(100 - halfH, settings.y));

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: `${clampedX}%`,
        top: `${clampedY}%`,
        transform: 'translate(-50%, -50%)',
        width: `${logoWidthPct}%`,
        zIndex: 25,
        cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
      draggable={false}
    >
      <img
        src={logoUrl}
        alt="Logo"
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    </div>
  );
};
