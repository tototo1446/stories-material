/**
 * プロンプトエンジニアリング: Instagramストーリーズ用の文字入れ専用背景画像生成プロンプトを構築
 */

export interface PromptOptions {
  theme: string;
  goal: string;
  atmosphere: string;
  brandColor?: string;
  slideNumber?: number;
  script?: string;
}

/**
 * 目的別の構図パターンを定義
 */
const compositionPatterns: Record<string, string> = {
  '共感': 'centered composition with emotional focal point, warm and inviting atmosphere',
  '教育': 'clean layout with clear visual hierarchy, educational content area in center',
  '販売': 'dynamic composition with product showcase area, call-to-action space',
  'ライフスタイル': 'lifestyle-oriented composition, natural and authentic feel',
  '共感 (Empathy)': 'centered composition with emotional focal point, warm and inviting atmosphere',
  '教育 (Education)': 'clean layout with clear visual hierarchy, educational content area in center',
  '販売 (Sales)': 'dynamic composition with product showcase area, call-to-action space',
  'ライフスタイル (Lifestyle)': 'lifestyle-oriented composition, natural and authentic feel',
};

/**
 * 雰囲気の英語表現マッピング
 */
const atmosphereMap: Record<string, string> = {
  'ミニマル': 'minimalist, clean, simple',
  'エレガント': 'elegant, sophisticated, refined',
  'ポップ': 'vibrant, colorful, playful',
  'ナチュラル': 'natural, organic, earthy',
  'ラグジュアリー': 'luxurious, premium, high-end',
  'フューチャリスティック': 'modern, futuristic, sleek',
};

/**
 * Instagram UI要素を避けたネガティブスペースの説明
 */
const NEGATIVE_SPACE_DESCRIPTION = `
with large negative space in center area for text placement:
- Avoid top 12% area (for Instagram profile picture and username)
- Avoid bottom 15% area (for Instagram reply bar and interaction buttons)
- Keep center 60-70% area clear and text-ready
- Visual elements should be positioned in upper or lower thirds, not center
`;

/**
 * プロンプトを構築する
 */
export function buildPrompt(options: PromptOptions): string {
  const {
    theme,
    goal,
    atmosphere,
    brandColor,
    slideNumber,
    script,
  } = options;

  // 基本プロンプトの構築
  let prompt = 'Instagram story background image, ';
  
  // アスペクト比と解像度
  prompt += '9:16 aspect ratio (1080x1920px), ';
  
  // テーマの説明
  if (script && slideNumber) {
    prompt += `theme: "${theme}", content for slide ${slideNumber}: "${script}", `;
  } else {
    prompt += `theme: "${theme}", `;
  }
  
  // 雰囲気
  const atmosphereDesc = atmosphereMap[atmosphere] || 'professional';
  prompt += `${atmosphereDesc} style, `;
  
  // 目的別構図
  const composition = compositionPatterns[goal] || compositionPatterns['共感'];
  prompt += `${composition}, `;
  
  // ネガティブスペースの説明
  prompt += NEGATIVE_SPACE_DESCRIPTION;
  
  // ブランドカラー
  if (brandColor) {
    prompt += `brand color palette: ${brandColor}, `;
  }
  
  // 品質と用途の指定
  prompt += 'high quality, professional, text-ready background, no text overlay, suitable for adding text later';
  
  return prompt.trim();
}

/**
 * 複数のスライド用プロンプトを一括生成
 */
export function buildPromptsForSlides(
  script: string | undefined,
  theme: string,
  goal: string,
  atmosphere: string,
  brandColor?: string,
  count: number = 1
): string[] {
  const prompts: string[] = [];
  
  // スクリプトを改行で分割（各スライドの内容として扱う）
  const scriptLines = script ? script.split('\n').filter(line => line.trim()) : [];
  
  for (let i = 0; i < count; i++) {
    const slideNumber = i + 1;
    const slideScript = scriptLines[i] || theme;
    
    const prompt = buildPrompt({
      theme,
      goal,
      atmosphere,
      brandColor,
      slideNumber,
      script: slideScript,
    });
    
    prompts.push(prompt);
  }
  
  return prompts;
}