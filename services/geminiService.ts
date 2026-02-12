import { GoogleGenAI, Type } from '@google/genai';
import { GeneratedImage, LayoutType } from '../types';

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

interface PromptVariation {
  prompt: string;
  negative_prompt: string;
  layout: LayoutType;
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

// --- Step 1: 3パターンのプロンプト生成 ---

const PROMPT_VARIATION_SYSTEM = `あなたは画像生成AI用のプロンプトエンジニアです。
Instagramストーリーズ（9:16、1080x1920px）用の背景画像を生成するための英語プロンプトを3パターン作成してください。

## 目的
ユーザーが入力したメッセージを画像の上に重ねて表示するため、背景画像は「文字が読みやすい余白」を確保する必要があります。

## 3パターンのバリエーション方針
- パターン1: シンプル・クリーンなデザイン（単色背景やソフトグラデーション）
- パターン2: 適度な装飾を加えたデザイン（抽象的なパターンやテクスチャ）
- パターン3: よりビジュアル豊かなデザイン（写真風やイラスト的要素あり）

## 構図パターン
各パターンに最適な構図を1つ選択:
- center_focus: 中央に大きな空白、上下端のみに装飾
- top_heavy: 上部1/3に視覚要素、下部2/3は余白
- bottom_heavy: 上部2/3は余白、下部1/3に視覚要素
- split_horizontal: 上下に装飾帯、中央50%は余白
- frame_style: 四隅に小さな装飾、中央80%は余白
- gradient_fade: グラデーションで一方向にフェード

## プロンプト構成ルール
1. 「9:16 vertical format, Instagram story background」で開始
2. 構図に基づく余白指示を含める
3. 雰囲気・スタイルの指定
4. カラーパレット
5. 「space for text overlay」「negative space for typography」等の余白強調
6. 「no text, no letters, no words, no watermarks」で文字なし指定`;

async function generatePromptVariations(
  userMessage: string,
  atmosphereNote: string,
  brandColor: string
): Promise<PromptVariation[]> {
  const ai = getGeminiClient();

  const userPrompt = `## ユーザーのメッセージ（画像上に重ねるテキスト）
${userMessage}

## 雰囲気の注釈
${atmosphereNote || '指定なし（バランスの良いデザイン）'}

## ブランドカラー
${brandColor}

上記の情報から、背景画像生成用の英語プロンプトを3パターン作成してください。
メッセージの内容に合った雰囲気の背景を設計してください。`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: PROMPT_VARIATION_SYSTEM,
      temperature: 0.8,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: {
            type: Type.ARRAY,
            description: '3パターンの画像生成プロンプト',
            items: {
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
              },
              required: ['prompt', 'negative_prompt', 'layout'],
            },
          },
        },
        required: ['variations'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new GeminiServiceError('プロンプト生成の結果が空です。');
  }

  const result = JSON.parse(text) as { variations: PromptVariation[] };
  return result.variations;
}

// --- Step 2: 画像生成 ---

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
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: userPrompt,
      config: {
        systemInstruction: IMAGE_GENERATION_SYSTEM_PROMPT,
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

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

// --- Orchestrator: メッセージ + 雰囲気 → 3パターン生成 ---

export const generateStoryBackgrounds = async (
  message: string,
  atmosphereNote: string,
  brandColor: string,
  callbacks?: WorkflowProgressCallback
): Promise<GeneratedImage[]> => {
  if (!message) {
    throw new Error('描きたいメッセージを入力してください。');
  }

  const TOTAL_PATTERNS = 3;

  try {
    // Step 1: 3パターンのプロンプト生成
    callbacks?.onProgress?.('背景デザインを3パターン考案中...');
    console.log('Step 1: 3パターンのプロンプト生成を開始');

    const variations = await generatePromptVariations(
      message,
      atmosphereNote,
      brandColor
    );

    console.log('プロンプト生成結果:', JSON.stringify(variations, null, 2));

    if (!variations || variations.length === 0) {
      throw new GeminiServiceError('プロンプトの生成結果が空です。');
    }

    // Step 2: 各パターンの画像を生成
    const generatedImages: GeneratedImage[] = [];

    for (let i = 0; i < Math.min(variations.length, TOTAL_PATTERNS); i++) {
      const variation = variations[i];
      callbacks?.onSlideGenerated?.(i, TOTAL_PATTERNS);
      callbacks?.onProgress?.(
        `パターン ${i + 1}/${TOTAL_PATTERNS} の背景画像を生成中...`
      );

      try {
        console.log(`Step 2: パターン ${i + 1} の画像生成`);

        const imageDataUrl = await generateImage(
          variation.prompt,
          variation.negative_prompt
        );

        generatedImages.push({
          id: `pattern-${i + 1}-${Date.now()}`,
          url: imageDataUrl,
          prompt: variation.prompt,
          slideNumber: i + 1,
          resolution: '1080x1920',
          settings: {
            blur: 0,
            brightness: 100,
            brandOverlay: false,
            textOverlay: {
              textContent: message.trim(),
              layout: variation.layout as LayoutType,
              fontSize: 24,
              textColor: '#FFFFFF',
              textVisible: true,
            },
          },
        });

        callbacks?.onSlideGenerated?.(i + 1, TOTAL_PATTERNS);
        console.log(`パターン ${i + 1} 生成完了`);
      } catch (slideError) {
        console.error(`パターン ${i + 1} の生成に失敗:`, slideError);
        callbacks?.onProgress?.(
          `パターン ${i + 1} の生成に失敗しました。次のパターンに進みます...`
        );
      }
    }

    if (generatedImages.length === 0) {
      throw new GeminiServiceError(
        'すべての画像生成に失敗しました。APIキーの設定やモデルの利用可能性を確認してください。'
      );
    }

    callbacks?.onSlideGenerated?.(generatedImages.length, TOTAL_PATTERNS);
    callbacks?.onProgress?.(
      `${generatedImages.length}パターンの背景画像を生成しました！`
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
