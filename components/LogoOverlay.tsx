import React, { useState, useRef, useEffect } from 'react';
import { LogoOverlaySettings } from '../types';

interface LogoOverlayProps {
  logoUrl: string;
  settings: LogoOverlaySettings;
  onSettingsChange: (updates: Partial<LogoOverlaySettings>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
}

// ダウンロードと同じ計算: naturalWidth * scale (上限 targetWidth * 0.4)
// プレビューでは targetWidth=1080 を基準にコンテナ幅との比率で % に変換
const TARGET_WIDTH = 1080;
const MAX_LOGO_RATIO = 0.4; // 40%

function calcLogoWidthPct(naturalWidth: number, scale: number): number {
  let logoW = naturalWidth * scale;
  const maxW = TARGET_WIDTH * MAX_LOGO_RATIO;
  if (logoW > maxW) logoW = maxW;
  return (logoW / TARGET_WIDTH) * 100;
}

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl,
  settings,
  onSettingsChange,
  containerRef,
  interactive,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const dragOffset = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
    };
    img.src = logoUrl;
  }, [logoUrl]);

  if (!settings.visible || naturalW === 0) return null;

  const logoWidthPct = calcLogoWidthPct(naturalW, settings.scale);
  const aspectRatio = naturalH / naturalW;
  const logoHeightPct = logoWidthPct * aspectRatio;
  const halfW = logoWidthPct / 2;
  const halfH = logoHeightPct / 2;

  const clampedX = Math.max(halfW, Math.min(100 - halfW, settings.x));
  const clampedY = Math.max(halfH, Math.min(100 - halfH, settings.y));

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
    onSettingsChange({
      x: Math.max(halfW, Math.min(100 - halfW, rawX)),
      y: Math.max(halfH, Math.min(100 - halfH, rawY)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

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
