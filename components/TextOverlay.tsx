import React from 'react';
import { TextOverlaySettings, LayoutType } from '../types';
import { FONT_MAP, DEFAULT_FONT } from '../constants';

interface TextOverlayProps {
  textOverlay: TextOverlaySettings;
  fontPreference: string;
}

const LAYOUT_POSITIONS: Record<LayoutType, React.CSSProperties> = {
  center_focus: {
    top: '30%',
    bottom: '30%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top_heavy: {
    top: '55%',
    bottom: '20%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  bottom_heavy: {
    top: '15%',
    bottom: '55%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  split_horizontal: {
    top: '35%',
    bottom: '35%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame_style: {
    top: '20%',
    bottom: '20%',
    left: '15%',
    right: '15%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient_fade: {
    top: '25%',
    bottom: '25%',
    left: '10%',
    right: '10%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export const TextOverlay: React.FC<TextOverlayProps> = ({ textOverlay, fontPreference }) => {
  if (!textOverlay.textVisible || !textOverlay.textContent) {
    return null;
  }

  const font = FONT_MAP[fontPreference] || DEFAULT_FONT;
  const position = LAYOUT_POSITIONS[textOverlay.layout] || LAYOUT_POSITIONS.center_focus;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div
        style={{
          position: 'absolute',
          ...position,
          padding: '16px',
        }}
      >
        <p
          style={{
            fontFamily: font.family,
            fontWeight: font.weight,
            fontSize: `${textOverlay.fontSize}px`,
            color: textOverlay.textColor,
            textAlign: 'center',
            lineHeight: 1.5,
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {textOverlay.textContent}
        </p>
      </div>
    </div>
  );
};
