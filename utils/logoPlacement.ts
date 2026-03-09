import { LayoutType, LogoOverlaySettings } from '../types';

type LogoPosition = Pick<LogoOverlaySettings, 'x' | 'y' | 'scale'>;

const LAYOUT_LOGO_POSITIONS: Record<LayoutType, LogoPosition> = {
  center_focus:      { x: 50, y: 90, scale: 0.8 },
  top_heavy:         { x: 50, y: 10, scale: 0.8 },
  bottom_heavy:      { x: 50, y: 90, scale: 0.8 },
  split_horizontal:  { x: 85, y: 50, scale: 0.7 },
  frame_style:       { x: 50, y: 92, scale: 0.7 },
  gradient_fade:     { x: 50, y: 90, scale: 0.8 },
};

const DEFAULT_POSITION: LogoPosition = { x: 50, y: 85, scale: 1.0 };

export function getLogoPositionForLayout(layout: LayoutType): LogoPosition {
  return LAYOUT_LOGO_POSITIONS[layout] ?? DEFAULT_POSITION;
}

// テンプレート画像パターンごとのロゴ配置
// 人物/商品の位置を避けて配置する
const TEMPLATE_PATTERN_LOGO_POSITIONS: LogoPosition[] = [
  // Pattern 0: 人物/商品が左側(~40%) → ロゴは右上
  { x: 88, y: 8, scale: 0.7 },
  // Pattern 1: 人物/商品が下半分 → ロゴは左上
  { x: 12, y: 8, scale: 0.7 },
  // Pattern 2: 人物/商品が右側 → ロゴは左上
  { x: 12, y: 8, scale: 0.7 },
];

export function getLogoPositionForTemplatePattern(patternIndex: number): LogoPosition {
  return TEMPLATE_PATTERN_LOGO_POSITIONS[patternIndex] ?? DEFAULT_POSITION;
}
