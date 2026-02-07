
import React from 'react';
import { StoryGoal, Atmosphere } from './types';

export const GOAL_OPTIONS = Object.values(StoryGoal);
export const ATMOSPHERE_OPTIONS = Object.values(Atmosphere);

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
    title: '新商品の告知',
    pages: [
      'ついに公開！新しいAIツールの全貌',
      'デザインの時間を1/10に短縮',
      '先行予約はプロフィールのリンクから',
    ],
    goal: StoryGoal.SALES,
    atmosphere: Atmosphere.ELEGANT
  },
  {
    id: '2',
    title: 'デザインのコツ',
    pages: [
      'ストーリーズで反応をもらう3つの秘訣',
      '1. 余白を意識する',
      '2. ブランドカラーを固定する',
      '3. 動きをつける',
    ],
    goal: StoryGoal.EDUCATION,
    atmosphere: Atmosphere.MINIMAL
  }
];
