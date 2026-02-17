
export interface ExtractedColors {
  dominant: string;
  palette: string[];
}

export interface BrandConfig {
  logoUrl: string;
  primaryColor: string;
  fontPreference: string;
  extractedColors?: ExtractedColors;
  useLogoColors: boolean;
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

export interface LogoOverlaySettings {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
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
    logoOverlay: LogoOverlaySettings;
  };
}

export interface SavedImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  prompt: string;
  slideNumber?: number;
  originalMessage?: string;
  createdAt: number;
}

export interface TemplateImage {
  id: string;
  name: string;
  dataUrl: string;
  thumbnailUrl: string;
  createdAt: number;
}
