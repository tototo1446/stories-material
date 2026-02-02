
export enum StoryGoal {
  EMPATHY = '共感 (Empathy)',
  EDUCATION = '教育 (Education)',
  SALES = '販売 (Sales)',
  LIFESTYLE = 'ライフスタイル (Lifestyle)'
}

export enum Atmosphere {
  MINIMAL = 'ミニマル',
  ELEGANT = 'エレガント',
  POPPY = 'ポップ',
  NATURAL = 'ナチュラル',
  LUXURY = 'ラグジュアリー',
  FUTURISTIC = 'フューチャリスティック'
}

export interface BrandConfig {
  logoUrl: string;
  primaryColor: string;
  fontPreference: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  settings: {
    blur: number;
    brightness: number;
    brandOverlay: boolean;
  };
}

export interface StoryScript {
  id: string;
  title: string;
  pages: string[];
  goal: StoryGoal;
  atmosphere: Atmosphere;
}
