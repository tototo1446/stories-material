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
    const x = ((e.clientX - rect.left - dragOffset.current.offsetX) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.current.offsetY) / rect.height) * 100;
    onSettingsChange({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const logoWidth = `${Math.max(8, settings.scale * 30)}%`;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: `${settings.x}%`,
        top: `${settings.y}%`,
        transform: 'translate(-50%, -50%)',
        width: logoWidth,
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
