
import React from 'react';

export const FONT_MAP: Record<string, { family: string; weight: number }> = {
  'Noto Sans JP Bold': { family: "'Noto Sans JP', sans-serif", weight: 700 },
  'Inter Extra Bold': { family: "'Inter', sans-serif", weight: 800 },
  'M PLUS Rounded 1c': { family: "'M PLUS Rounded 1c', sans-serif", weight: 700 },
  'Shippori Mincho': { family: "'Shippori Mincho', serif", weight: 400 },
};

export const DEFAULT_FONT = { family: "'Noto Sans JP', sans-serif", weight: 700 };

export const IG_SAFE_AREA_CONFIG = {
  topMargin: '12%', // For profile pic and handle
  bottomMargin: '15%', // For reply bar
  sideMargin: '8%',
};

export const SAMPLE_SCRIPTS = [
  {
    id: '1',
    message: '年内ラストAI講座\n締切まで後3日！',
    atmosphereNote: '背景白、文字は黒の太文字で、可視性を重視。',
  },
  {
    id: '2',
    message: 'ついに公開！新しいAIツールの全貌\nデザインの時間を1/10に短縮\n先行予約はプロフィールのリンクから',
    atmosphereNote: '高級感、ダーク背景にゴールドのアクセント',
  },
];
