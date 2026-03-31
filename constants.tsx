
import React from 'react';
import { MoodPreset } from './types';

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'focus',
    label: '集中・作業',
    icon: '💻',
    promptHint: '集中感のあるワークスペース、PCデスク、モニターの光、プロダクティブな雰囲気',
  },
  {
    id: 'relax',
    label: 'リラックス',
    icon: '🌿',
    promptHint: '穏やか、自然光、ナチュラルで温かみのある色調、リラックスした雰囲気',
  },
  {
    id: 'urgent',
    label: '緊急・締切',
    icon: '🔥',
    promptHint: '大胆、注目を引く、高コントラスト、ダイナミック、赤やオレンジ系',
  },
  {
    id: 'luxury',
    label: '高級・プレミアム',
    icon: '✨',
    promptHint: '高級感、ダーク背景にゴールドのアクセント、エレガント',
  },
  {
    id: 'pop',
    label: 'ポップ・カジュアル',
    icon: '🎨',
    promptHint: 'ポップ、明るくカラフル、楽しい、エネルギッシュ、ビビッドカラー',
  },
  {
    id: 'natural',
    label: 'ナチュラル',
    icon: '🍃',
    promptHint: 'オーガニック、アースカラー、ミニマル、自然素材のテクスチャ',
  },
];

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
