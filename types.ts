
export enum StoryGoal {
  EMPATHY = '共感',
  EDUCATION = '教育',
  SALES = '販売促進',
  BRAND_AWARENESS = 'ブランド認知',
  ENGAGEMENT = 'エンゲージメント'
}

export enum Atmosphere {
  MINIMAL = 'ミニマル・シンプル',
  NATURAL = 'ナチュラル・オーガニック',
  MODERN = 'モダン・洗練',
  POP = 'ポップ・カラフル',
  ELEGANT = '高級感・エレガント',
  CASUAL = 'カジュアル・親しみやすい'
}

export interface BrandConfig {
  logoUrl: string;
  primaryColor: string;
  fontPreference: string;
}

export type LayoutType =
  | 'center_focus'
  | 'top_heavy'
  | 'bottom_heavy'
  | 'split_horizontal'
  | 'frame_style'
  | 'gradient_fade';

export interface TextOverlaySettings {
  textContent: string;
  layout: LayoutType;
  fontSize: number;
  textColor: string;
  textVisible: boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  slideNumber?: number;
  resolution?: string;
  settings: {
    blur: number;
    brightness: number;
    brandOverlay: boolean;
    textOverlay: TextOverlaySettings;
  };
}
