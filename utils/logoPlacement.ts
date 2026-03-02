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
