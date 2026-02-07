import { GoogleGenAI, Type } from '@google/genai';
import { StoryGoal, Atmosphere, GeneratedImage, LayoutType } from '../types';

// --- Public Types ---

export interface WorkflowProgressCallback {
  onProgress?: (message: string) => void;
  onSlideGenerated?: (current: number, total: number) => void;
}

export class GeminiServiceError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

// --- Internal Types ---

interface SlideAnalysis {
  slide_number: number;
  intent: string;
  key_message: string;
  layout: LayoutType;
  text_content: string;
}

interface ScriptAnalysisResult {
  slides: SlideAnalysis[];
  total_slides: number;
}

interface PromptResult {
  prompt: string;
  negative_prompt: string;
}

interface EnrichedSlide extends SlideAnalysis {
  mood: string;
  brand_color: string;
  sub_color: string;
}

// --- Gemini Client ---

function getGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      'Gemini APIキーが設定されていません。VITE_GEMINI_API_KEYを環境変数に設定してください。'
    );
  }
  return new GoogleGenAI({ apiKey });
}

// --- Step 1: 台本分析 (Script Analysis) ---

const SCRIPT_ANALYSIS_SYSTEM_PROMPT = `あなたはInstagramストーリーズの専門家です。
ユーザーが入力した台本を分析し、各スライドの情報を構造化してください。

## 出力ルール
- 台本から各スライド（ストーリーズ1枚分）を識別
- 各スライドの「意図」「キーメッセージ」「推奨構図」を分析
- 必ず以下のJSON形式で出力

## 推奨構図パターン
- center_focus: 中央に大きな余白、上下に装飾（教育・説明向け）
- top_heavy: 上部に画像要素、下半分に余白（CTA・販売向け）
- bottom_heavy: 下部に画像要素、上半分に余白（挨拶・導入向け）
- split_horizontal: 上下で分割、中央に余白帯（比較・ビフォーアフター向け）
- frame_style: 四隅に装飾、中央に大きな余白（メッセージ重視向け）
- gradient_fade: グラデーションで一方向にフェード（感情訴求向け）`;

async function analyzeScript(
  script: string,
  theme: string,
  purpose: string
): Promise<ScriptAnalysisResult> {
  const ai = getGeminiClient();

  const userPrompt = `## 台本
${script}

## テーマ
${theme}

## 目的
${purpose}

上記の台本を分析し、各スライドの情報をJSON形式で出力してください。`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: SCRIPT_ANALYSIS_SYSTEM_PROMPT,
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          slides: {
            type: Type.ARRAY,
            description: '各スライドの分析結果',
            items: {
              type: Type.OBJECT,
              properties: {
                slide_number: {
                  type: Type.INTEGER,
                  description: 'スライド番号',
                },
                intent: {
                  type: Type.STRING,
                  description: 'このスライドの意図・目的',
                },
                key_message: {
                  type: Type.STRING,
                  description: 'キーメッセージ（文字として載せる内容の要約）',
                },
                layout: {
                  type: Type.STRING,
                  description: '推奨構図パターン',
                  enum: [
                    'center_focus',
                    'top_heavy',
                    'bottom_heavy',
                    'split_horizontal',
                    'frame_style',
                    'gradient_fade',
                  ],
                },
                text_content: {
                  type: Type.STRING,
                  description: 'スライドに表示するテキスト内容',
                },
              },
              required: [
                'slide_number',
                'intent',
                'key_message',
                'layout',
                'text_content',
              ],
            },
          },
          total_slides: {
            type: Type.INTEGER,
            description: '総スライド数',
          },
        },
        required: ['slides', 'total_slides'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new GeminiServiceError('台本分析の結果が空です。');
  }

  return JSON.parse(text) as ScriptAnalysisResult;
}

// --- Step 2: プロンプト生成 (Prompt Generation) ---

const PROMPT_GENERATION_SYSTEM_PROMPT = `あなたは画像生成AI用のプロンプトエンジニアです。
Instagramストーリーズ（9:16、1080x1920px）用の背景画像を生成するための英語プロンプトを作成してください。

## 重要：余白（ネガティブスペース）の確保
Instagramストーリーズでは以下のUI要素と重ならないよう余白を確保する必要があります：
- 上部120px: ユーザーアイコン、ユーザー名、閉じるボタン
- 下部200px: 返信入力欄、シェアボタン、いいねボタン
- 中央部分: ユーザーが文字を載せるメイン領域

## 構図パターン別の指示
- center_focus: 中央に大きな空白、上下端のみに抽象的な装飾要素
- top_heavy: 上部1/3に視覚要素、下部2/3は単色またはグラデーション
- bottom_heavy: 上部2/3は単色またはグラデーション、下部1/3に視覚要素
- split_horizontal: 上下に装飾帯、中央50%は余白
- frame_style: 四隅に小さな装飾、中央80%は余白
- gradient_fade: 一方向から他方向へのグラデーション、文字領域は薄い色

## プロンプト構成ルール
1. 「9:16 vertical format, Instagram story background」で開始
2. 構図パターンに基づく余白指示
3. 雰囲気・スタイルの指定
4. カラーパレット（HEXコードを色名に変換）
5. 「space for text overlay」「negative space for typography」等の余白強調
6. 「no text, no letters, no words」で文字なし指定`;

async function generateImagePrompt(
  slideInfo: string
): Promise<PromptResult> {
  const ai = getGeminiClient();

  const userPrompt = `## スライド情報
${slideInfo}

上記の情報から、画像生成用の英語プロンプトを作成してください。
プロンプトのみを出力し、説明は不要です。`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: PROMPT_GENERATION_SYSTEM_PROMPT,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: '画像生成用のメインプロンプト（英語）',
          },
          negative_prompt: {
            type: Type.STRING,
            description: '除外要素のネガティブプロンプト（英語）',
          },
        },
        required: ['prompt', 'negative_prompt'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new GeminiServiceError('プロンプト生成の結果が空です。');
  }

  return JSON.parse(text) as PromptResult;
}

// --- Step 3: 画像生成 (Image Generation) ---

const IMAGE_GENERATION_SYSTEM_PROMPT = `You are an image generation assistant. Generate a single Instagram Story background image based on the user's prompt.

Rules:
- 9:16 vertical portrait orientation
- The image must have clear negative space in the center area for text overlay
- DO NOT include any text, letters, words, numbers, or watermarks in the image
- Professional quality, clean composition
- Ensure the center 50-60% of the image has low visual complexity (solid color, soft gradient, or subtle texture) so text can be placed on top`;

async function generateImage(
  prompt: string,
  negativePrompt: string
): Promise<string> {
  const ai = getGeminiClient();

  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const userPrompt = `Generate an image based on the following prompt:

${prompt}

Negative prompt (avoid these elements): ${negativePrompt}

Generate the image now. Output only the image.`;

  try {
    // Try Gemini native image generation
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: userPrompt,
      config: {
        systemInstruction: IMAGE_GENERATION_SYSTEM_PROMPT,
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    // Extract image from response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const base64Data = part.inlineData.data;
          return `data:${mimeType};base64,${base64Data}`;
        }
      }
    }

    throw new GeminiServiceError(
      'レスポンスに画像データが含まれていません。'
    );
  } catch (error) {
    // If native image gen fails, try Imagen as fallback
    if (
      error instanceof GeminiServiceError ||
      (error instanceof Error &&
        (error.message.includes('not supported') ||
          error.message.includes('not found') ||
          error.message.includes('INVALID_ARGUMENT')))
    ) {
      console.warn(
        `Gemini画像生成(${imageModel})失敗、Imagen 4にフォールバック:`,
        error instanceof Error ? error.message : error
      );
      return generateImageWithImagen(prompt);
    }
    throw error;
  }
}

async function generateImageWithImagen(prompt: string): Promise<string> {
  const ai = getGeminiClient();

  const fullPrompt = `9:16 vertical Instagram story background, ${prompt}, no text, no letters, no words, no watermarks, professional quality, clean composition, large negative space in center for text overlay`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '9:16',
    },
  });

  const images = response.generatedImages;
  if (images && images.length > 0 && images[0].image?.imageBytes) {
    const base64Data = images[0].image.imageBytes;
    return `data:image/png;base64,${base64Data}`;
  }

  throw new GeminiServiceError(
    'Imagen APIからも画像を取得できませんでした。'
  );
}

// --- Orchestrator: Full Workflow ---

export const generateStoryBackgrounds = async (
  script: string,
  theme: string,
  goal: StoryGoal,
  atmosphere: Atmosphere,
  brandColor: string,
  subColor?: string,
  callbacks?: WorkflowProgressCallback
): Promise<GeneratedImage[]> => {
  if (!theme && !script) {
    throw new Error('台本またはテーマを入力してください。');
  }

  try {
    // Step 1: 台本分析
    callbacks?.onProgress?.('台本を分析中...');
    console.log('Step 1: 台本分析を開始');

    const analysis = await analyzeScript(
      script || theme,
      theme || '',
      goal
    );

    console.log('台本分析結果:', JSON.stringify(analysis, null, 2));

    if (!analysis.slides || analysis.slides.length === 0) {
      throw new GeminiServiceError(
        '台本の分析結果にスライドが含まれていません。'
      );
    }

    const totalSlides = analysis.slides.length;
    callbacks?.onProgress?.(
      `${totalSlides}枚のスライドを検出しました。画像を生成中...`
    );

    // Step 2: スライド配列化（各スライドに追加情報を付与）
    const enrichedSlides: EnrichedSlide[] = analysis.slides.map((slide) => ({
      ...slide,
      mood: atmosphere as string,
      brand_color: brandColor || '#FFFFFF',
      sub_color: subColor || '#000000',
    }));

    // Step 3 & 4: プロンプト生成 → 画像生成（イテレーション）
    const generatedImages: GeneratedImage[] = [];

    for (let i = 0; i < enrichedSlides.length; i++) {
      const slide = enrichedSlides[i];
      callbacks?.onSlideGenerated?.(i, totalSlides);
      callbacks?.onProgress?.(
        `スライド ${i + 1}/${totalSlides} のプロンプトを生成中...`
      );

      try {
        // Step 3: プロンプト生成
        console.log(`Step 3: スライド ${i + 1} のプロンプト生成`);
        const slideInfoStr = JSON.stringify(slide, null, 2);
        const promptResult = await generateImagePrompt(slideInfoStr);

        console.log(
          `スライド ${i + 1} プロンプト:`,
          promptResult.prompt.substring(0, 100) + '...'
        );

        // Step 4: 画像生成
        callbacks?.onProgress?.(
          `スライド ${i + 1}/${totalSlides} の画像を生成中...`
        );
        console.log(`Step 4: スライド ${i + 1} の画像生成`);

        const imageDataUrl = await generateImage(
          promptResult.prompt,
          promptResult.negative_prompt
        );

        generatedImages.push({
          id: `slide-${slide.slide_number}-${Date.now()}-${i}`,
          url: imageDataUrl,
          prompt: promptResult.prompt,
          slideNumber: slide.slide_number,
          resolution: '1080x1920',
          settings: {
            blur: 0,
            brightness: 100,
            brandOverlay: false,
            textOverlay: {
              textContent: slide.text_content,
              layout: slide.layout as LayoutType,
              fontSize: 24,
              textColor: '#FFFFFF',
              textVisible: true,
            },
          },
        });

        callbacks?.onSlideGenerated?.(i + 1, totalSlides);
        console.log(`スライド ${i + 1} 生成完了`);
      } catch (slideError) {
        console.error(`スライド ${i + 1} の生成に失敗:`, slideError);
        callbacks?.onProgress?.(
          `スライド ${i + 1} の生成に失敗しました。次のスライドに進みます...`
        );
      }
    }

    if (generatedImages.length === 0) {
      throw new GeminiServiceError(
        'すべての画像生成に失敗しました。APIキーの設定やモデルの利用可能性を確認してください。'
      );
    }

    callbacks?.onSlideGenerated?.(generatedImages.length, totalSlides);
    callbacks?.onProgress?.(
      `${generatedImages.length}/${totalSlides}枚の背景画像を生成しました！`
    );

    return generatedImages;
  } catch (error) {
    console.error('背景画像生成に失敗しました:', error);

    if (error instanceof GeminiServiceError) {
      callbacks?.onProgress?.(error.message);
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : '不明なエラー';
    callbacks?.onProgress?.(`画像生成に失敗しました: ${errorMessage}`);
    throw new GeminiServiceError(
      `画像生成に失敗しました: ${errorMessage}`,
      error
    );
  }
};
