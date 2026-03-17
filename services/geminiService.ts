import { GoogleGenAI, Type } from '@google/genai';
import { GeneratedImage, LayoutType } from '../types';
import { getLogoPositionForLayout, getLogoPositionForTemplatePattern } from '../utils/logoPlacement';

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
  brandColor: string,
  logoPalette?: string[]
): Promise<PromptVariation[]> {
  const ai = getGeminiClient();

  const paletteSection = logoPalette && logoPalette.length > 0
    ? `\n## ブランドカラーパレット（ロゴから抽出）\n${logoPalette.join(', ')}\nこれらの色をデザインのアクセントやグラデーションに積極的に活用してください。ブランドの世界観を反映した配色にしてください。`
    : '';

  const userPrompt = `## ユーザーのメッセージ（画像上に重ねるテキスト）
${userMessage}

## 雰囲気の注釈
${atmosphereNote || '指定なし（バランスの良いデザイン）'}

## ブランドカラー
${brandColor}${paletteSection}

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

// --- テンプレート画像付き生成 ---

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  // data URL の場合はそのまま分解
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }

  // 外部 URL の場合は fetch して変換
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(blob);
  });
}

const TEMPLATE_IMAGE_SYSTEM_PROMPT = `You are an expert Instagram Story designer. You will receive a reference photo of a person or product. Your job is to create a NEW professional Instagram Story image (9:16 vertical, 1080x1920px).

CRITICAL RULES:
1. GENERATE A NEW IMAGE of the same person/product — do NOT simply paste or crop the original photo
2. The person/product should appear in a DIFFERENT POSE, ANGLE, or FRAMING than the reference
3. Text and the person/product must NEVER overlap — they must occupy separate areas of the image
4. Place the text in a dedicated zone (top area, bottom area, or side) with a clean background behind it
5. The text must be large, bold, and immediately readable (high contrast)
6. The overall composition should look like a professional Instagram Story ad
7. Output only the generated image`;

async function generateImageFromTemplate(
  templateBase64: string,
  templateMimeType: string,
  textMessage: string,
  atmosphereNote: string,
  patternIndex: number,
  logoPalette?: string[],
  backgroundOnly?: boolean
): Promise<string> {
  const ai = getGeminiClient();

  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const styleVariations = [
    `LAYOUT: Person/product on the LEFT side (occupying ~40% width). Text on the RIGHT side on a clean solid or gradient background.
POSE: The person should face toward the text area, as if presenting or gesturing toward it. For products, show from a slightly different angle.
TEXT STYLE: Large bold black text on a white or light-colored background area. Clean, minimal typography.
OVERALL: Professional, clean, Instagram Story ad style.`,

    `LAYOUT: Person/product in the BOTTOM HALF of the image. Text in the TOP HALF on a clean background.
POSE: The person should be looking upward or have an expressive pose (pointing up, arms crossed confidently). For products, show at an angled dynamic view.
TEXT STYLE: Bold, impactful text with large font size. Use a contrasting color block or banner behind the text.
OVERALL: Dynamic, eye-catching composition with strong visual hierarchy.`,

    `LAYOUT: Person/product on the RIGHT side. Text on the LEFT side with a semi-transparent or solid color panel.
POSE: The person should be in a casual, approachable pose (hand on hip, slight lean, natural smile). For products, show in a lifestyle context.
TEXT STYLE: Modern typography, bold weight, with a subtle drop shadow or background panel for readability.
OVERALL: Stylish, magazine-quality Instagram Story design.`,
  ];

  const userPrompt = backgroundOnly
    ? `Study this reference photo to understand the visual style and color palette. Create a NEW Instagram Story image (9:16 vertical) using ONLY a scenic/atmospheric background — DO NOT include any person or product.

Text to render on the image: "${textMessage}"

${styleVariations[patternIndex] || styleVariations[0]}

${atmosphereNote ? `Background scene direction: ${atmosphereNote}` : 'Use a professional, atmospheric background scene.'}
${logoPalette && logoPalette.length > 0 ? `Brand color palette: ${logoPalette.join(', ')}. Incorporate these colors into the design.` : ''}

IMPORTANT REMINDERS:
- DO NOT include any person or product — background/scene only
- Text must be clearly readable with proper contrast
- Use the color palette and mood from the reference photo

Generate the image now.`
    : `Study this reference photo carefully. Create a NEW Instagram Story image (9:16 vertical) featuring the SAME person/product but in a COMPLETELY DIFFERENT composition.

Text to render on the image: "${textMessage}"

${styleVariations[patternIndex] || styleVariations[0]}

${atmosphereNote ? `Additional style direction: ${atmosphereNote}` : ''}
${logoPalette && logoPalette.length > 0 ? `Brand color palette: ${logoPalette.join(', ')}. Incorporate these colors into the design as accents, backgrounds, or gradient elements.` : ''}

IMPORTANT REMINDERS:
- Generate a NEW image with a different pose/angle — do NOT reuse the exact same photo
- Text and the person/product must be in SEPARATE AREAS — absolutely NO overlapping
- The text must be clearly readable

Generate the image now.`;

  try {
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: templateMimeType,
                data: templateBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      config: {
        systemInstruction: TEMPLATE_IMAGE_SYSTEM_PROMPT,
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

    throw new GeminiServiceError('レスポンスに画像データが含まれていません。');
  } catch (error) {
    if (
      error instanceof GeminiServiceError ||
      (error instanceof Error &&
        (error.message.includes('not supported') ||
          error.message.includes('not found') ||
          error.message.includes('INVALID_ARGUMENT')))
    ) {
      console.warn('テンプレート画像生成失敗、テキスト付き背景生成にフォールバック');
      // フォールバック: テンプレートなしで背景生成
      const fallbackPrompt = `9:16 vertical Instagram story background, professional design with space for text overlay about "${textMessage}", ${atmosphereNote || 'modern clean style'}, no text, no letters, no words`;
      return generateImageWithImagen(fallbackPrompt);
    }
    throw error;
  }
}

// --- 参考ストーリーズ付き生成 ---

const REFERENCE_STORY_SYSTEM_PROMPT = `You are an expert Instagram Story designer. You will receive a REFERENCE Instagram Story image. Your job is to create a NEW Instagram Story image (9:16 vertical, 1080x1920px) that reproduces the EXACT SAME structural layout and design pattern.

STEP 1 — STRUCTURAL ANALYSIS (do this internally before generating):
Analyze the reference image for these specific structural elements:
A. PERSON/SUBJECT PLACEMENT: What percentage of the frame does the person occupy? Where are they positioned (center, left, right)? How much of their body is visible (face only, upper body, full body)?
B. TEXT PLACEMENT: Where exactly is the text? (top, bottom, middle, overlay on person?) What percentage of the screen height does the text zone occupy?
C. TEXT CONTAINERS: Are there text boxes/banners? What shape (rounded rectangle, pill, none)? What color (white, colored, transparent)?
D. TEXT STYLE: What is the text color, weight (bold/regular), approximate size relative to the image?
E. BACKGROUND: Does the photo fill the entire screen? Is there a separate background area?
F. DECORATIVE ELEMENTS: Any emoji, icons, stickers, or graphic elements? Where are they placed?

STEP 2 — FAITHFUL REPRODUCTION:
Create a new image that matches ALL of the above structural elements as closely as possible. The viewer should feel this was made by the same creator in the same series.

CRITICAL RULES:
1. MATCH the exact same layout structure — if the person fills 70% of the frame in the reference, do the same
2. MATCH the text container style — if the reference uses white rounded rectangles at the bottom, do the same
3. MATCH the text style — same weight, similar size, same color scheme
4. MATCH the overall composition ratio between person area and text area
5. Use the user's new text content but render it in the SAME typographic approach
6. Output only the generated image`;

async function generateImageFromReference(
  referenceBase64: string,
  referenceMimeType: string,
  textMessage: string,
  atmosphereNote: string,
  patternIndex: number,
  logoPalette?: string[],
  backgroundOnly?: boolean
): Promise<string> {
  const ai = getGeminiClient();

  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const styleVariationsWithPerson = [
    `VARIATION TYPE: Faithful Reproduction
Reproduce the reference layout as closely as possible. Same person placement ratio, same text position, same text container style, same background treatment. Only change the text content. This should look like the NEXT post in the same series.`,

    `VARIATION TYPE: Slight Angle Variation
Keep the EXACT same layout structure (person position, text zone, text container style) but change the person's pose or camera angle slightly (e.g., if front-facing selfie, try a slight side angle). Keep text containers, colors, and positioning identical to the reference.`,

    `VARIATION TYPE: Text Style Variation
Keep the EXACT same person placement and overall composition. Keep text in the same position. But try a slightly different text container treatment — for example, if the reference uses white rounded boxes, try a colored or semi-transparent variant, or try a different arrangement of the text lines while keeping them in the same zone.`,
  ];

  const styleVariationsBackgroundOnly = [
    `VARIATION TYPE: Scene Background — Faithful Style
Replace the person with a scenic background or atmospheric photo (e.g., ocean, cityscape, cafe interior, nature, abstract). Keep the EXACT same text container style, text position, and overall layout structure from the reference. The background scene should fill the area where the person was.`,

    `VARIATION TYPE: Scene Background — Textured/Abstract
Replace the person with a textured or abstract background (gradients, patterns, bokeh, soft textures). Keep the EXACT same text container style, text position, and decorative elements from the reference. The result should look like the same design template but with an atmospheric background instead of a person.`,

    `VARIATION TYPE: Scene Background — Lifestyle/Environment
Replace the person with a lifestyle or environmental photo (workspace, food, travel scenery, product flat-lay). Keep the EXACT same text container style, text position, and color scheme from the reference. It should feel like the same series but photographed from a different perspective.`,
  ];

  const styleVariations = backgroundOnly ? styleVariationsBackgroundOnly : styleVariationsWithPerson;

  const analysisBlock = backgroundOnly
    ? `Look at this reference Instagram Story image very carefully.

ANALYZE its structure (IGNORE the person — focus on everything else):
- Where is the text placed? (top/bottom/middle/overlay?)
- Are there text containers (boxes, banners)? What shape and color?
- What is the text style (color, weight, size)?
- Are there any emoji, icons, or decorative elements?
- What is the overall color scheme and mood?

Now create a NEW Instagram Story image (9:16 vertical) that follows the SAME text/design pattern but with a SCENIC BACKGROUND instead of a person.
${atmosphereNote ? `Background scene direction: ${atmosphereNote}` : 'Use an atmospheric, professional background scene that complements the text.'}

The text content should be:
"${textMessage}"`
    : `Look at this reference Instagram Story image very carefully.

ANALYZE its structure:
- How much of the frame does the person/subject fill?
- Where exactly is the person positioned?
- Where is the text placed? (top/bottom/middle/overlay?)
- Are there text containers (boxes, banners)? What shape and color?
- Does the photo fill the entire screen or is there a separate background?
- Are there any emoji, icons, or decorative elements?

Now create a NEW Instagram Story image (9:16 vertical) that follows the EXACT SAME structural pattern, but with this text:
"${textMessage}"`;

  const userPrompt = `${analysisBlock}

${styleVariations[patternIndex] || styleVariations[0]}

${!backgroundOnly && atmosphereNote ? `Additional style direction: ${atmosphereNote}` : ''}
${logoPalette && logoPalette.length > 0 ? `Brand color palette to incorporate: ${logoPalette.join(', ')}` : ''}

CRITICAL: The text containers, text style, text position, and decorative elements MUST match the reference.${backgroundOnly ? ' Replace the person/subject area with the described background scene.' : ' The structural layout (person size, person position) MUST also match.'} A viewer scrolling through Instagram should feel this was made by the same person using the same template.

Generate the image now.`;

  try {
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: referenceMimeType,
                data: referenceBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      config: {
        systemInstruction: REFERENCE_STORY_SYSTEM_PROMPT,
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

    throw new GeminiServiceError('レスポンスに画像データが含まれていません。');
  } catch (error) {
    if (
      error instanceof GeminiServiceError ||
      (error instanceof Error &&
        (error.message.includes('not supported') ||
          error.message.includes('not found') ||
          error.message.includes('INVALID_ARGUMENT')))
    ) {
      console.warn('参考ストーリーズ生成失敗、テキスト付き背景生成にフォールバック');
      const fallbackPrompt = `9:16 vertical Instagram story background, professional design with space for text overlay about "${textMessage}", ${atmosphereNote || 'modern clean style'}, no text, no letters, no words`;
      return generateImageWithImagen(fallbackPrompt);
    }
    throw error;
  }
}

// --- Orchestrator: メッセージ + 雰囲気 → 3パターン生成 ---

export const generateStoryBackgrounds = async (
  message: string,
  atmosphereNote: string,
  brandColor: string,
  callbacks?: WorkflowProgressCallback,
  templateImageUrl?: string,
  logoPalette?: string[],
  referenceStoryUrl?: string,
  backgroundOnly?: boolean
): Promise<GeneratedImage[]> => {
  if (!message) {
    throw new Error('描きたいメッセージを入力してください。');
  }

  const TOTAL_PATTERNS = 3;

  try {
    // 参考ストーリーズがある場合: デザインDNA再現生成
    if (referenceStoryUrl) {
      callbacks?.onProgress?.('参考ストーリーズを分析中...');
      const { base64, mimeType } = await fetchImageAsBase64(referenceStoryUrl);

      const generatedImages: GeneratedImage[] = [];

      for (let i = 0; i < TOTAL_PATTERNS; i++) {
        callbacks?.onSlideGenerated?.(i, TOTAL_PATTERNS);
        callbacks?.onProgress?.(
          `パターン ${i + 1}/${TOTAL_PATTERNS} を生成中...`
        );

        try {
          console.log(`参考ストーリーズ パターン ${i + 1} 生成`);
          const imageDataUrl = await generateImageFromReference(
            base64,
            mimeType,
            message,
            atmosphereNote,
            i,
            logoPalette,
            backgroundOnly
          );

          generatedImages.push({
            id: `ref-pattern-${i + 1}-${Date.now()}`,
            url: imageDataUrl,
            prompt: `参考ストーリーズ + "${message}" パターン${i + 1}`,
            slideNumber: i + 1,
            resolution: '1080x1920',
            settings: {
              blur: 0,
              brightness: 100,
              brandOverlay: false,
              textOverlay: {
                textContent: '',
                layout: 'center_focus' as LayoutType,
                fontSize: 24,
                textColor: '#FFFFFF',
                textVisible: false,
              },
              logoOverlay: {
                visible: false,
                ...getLogoPositionForTemplatePattern(i),
              },
            },
          });

          callbacks?.onSlideGenerated?.(i + 1, TOTAL_PATTERNS);
          console.log(`参考ストーリーズ パターン ${i + 1} 生成完了`);
        } catch (err) {
          console.error(`参考ストーリーズ パターン ${i + 1} 失敗:`, err);
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
        `${generatedImages.length}パターンを生成しました！`
      );
      return generatedImages;
    }

    // テンプレート画像がある場合: マルチモーダル生成
    if (templateImageUrl) {
      callbacks?.onProgress?.('素材画像を読み込み中...');
      const { base64, mimeType } = await fetchImageAsBase64(templateImageUrl);

      const generatedImages: GeneratedImage[] = [];

      for (let i = 0; i < TOTAL_PATTERNS; i++) {
        callbacks?.onSlideGenerated?.(i, TOTAL_PATTERNS);
        callbacks?.onProgress?.(
          `パターン ${i + 1}/${TOTAL_PATTERNS} を生成中...`
        );

        try {
          console.log(`テンプレート パターン ${i + 1} 生成`);
          const imageDataUrl = await generateImageFromTemplate(
            base64,
            mimeType,
            message,
            atmosphereNote,
            i,
            logoPalette,
            backgroundOnly
          );

          generatedImages.push({
            id: `tmpl-pattern-${i + 1}-${Date.now()}`,
            url: imageDataUrl,
            prompt: `素材画像 + "${message}" パターン${i + 1}`,
            slideNumber: i + 1,
            resolution: '1080x1920',
            settings: {
              blur: 0,
              brightness: 100,
              brandOverlay: false,
              textOverlay: {
                textContent: '',
                layout: 'center_focus' as LayoutType,
                fontSize: 24,
                textColor: '#FFFFFF',
                textVisible: false,
              },
              logoOverlay: {
                visible: false,
                ...getLogoPositionForTemplatePattern(i),
              },
            },
          });

          callbacks?.onSlideGenerated?.(i + 1, TOTAL_PATTERNS);
          console.log(`テンプレート パターン ${i + 1} 生成完了`);
        } catch (err) {
          console.error(`テンプレート パターン ${i + 1} 失敗:`, err);
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
        `${generatedImages.length}パターンを生成しました！`
      );
      return generatedImages;
    }

    // テンプレートなし: プロンプト生成 → 背景画像生成
    callbacks?.onProgress?.('背景デザインを3パターン考案中...');
    console.log('Step 1: 3パターンのプロンプト生成を開始');

    const variations = await generatePromptVariations(
      message,
      atmosphereNote,
      brandColor,
      logoPalette
    );

    console.log('プロンプト生成結果:', JSON.stringify(variations, null, 2));

    if (!variations || variations.length === 0) {
      throw new GeminiServiceError('プロンプトの生成結果が空です。');
    }

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
            logoOverlay: {
              visible: false,
              ...getLogoPositionForLayout(variation.layout as LayoutType),
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
