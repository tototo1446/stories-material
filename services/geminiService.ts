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
  logoPalette?: string[],
  backgroundOnly?: boolean,
  situation?: string
): Promise<PromptVariation[]> {
  const ai = getGeminiClient();

  const paletteSection = logoPalette && logoPalette.length > 0
    ? `\n## ブランドカラーパレット（ロゴから抽出）\n${logoPalette.join(', ')}\nこれらの色をデザインのアクセントやグラデーションに積極的に活用してください。ブランドの世界観を反映した配色にしてください。`
    : '';

  const backgroundOnlyConstraint = backgroundOnly
    ? `\n\n## 重要な制約（背景のみモード）
- 人物、人間のシルエット、体の一部を絶対に含めないでください
- 風景、ワークスペース、抽象デザイン、テクスチャなど「シーン背景」のみで構成してください
- ネガティブプロンプトに必ず「no people, no human figures, no silhouettes, no body parts, no hands, no faces」を追加してください`
    : '';

  const situationSection = situation
    ? `\n## シチュエーション（場面・場所）\n${situation}\nこのシチュエーションを背景のシーン設定として反映してください。場所の雰囲気、光の質感、周囲の要素を具体的にプロンプトに盛り込んでください。`
    : '';

  const userPrompt = `## ユーザーのメッセージ（画像上に重ねるテキスト）
${userMessage}
${situationSection}
## 雰囲気の注釈
${atmosphereNote || '指定なし（バランスの良いデザイン）'}

## ブランドカラー
${brandColor}${paletteSection}

上記の情報から、背景画像生成用の英語プロンプトを3パターン作成してください。
メッセージの内容に合った雰囲気の背景を設計してください。`;

  const systemPrompt = PROMPT_VARIATION_SYSTEM + backgroundOnlyConstraint;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
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

// --- Step 1: 参考ストーリーズの構造を分析（テキストモデル） ---

interface ReferenceStructure {
  person_position: string;
  person_frame_percentage: number;
  person_body_visible: string;
  person_pose: string;
  person_gaze_direction: string;
  camera_angle: string;
  text_position: string;
  text_zone_percentage: number;
  text_container_shape: string;
  text_container_color: string;
  text_color: string;
  text_weight: string;
  text_lines_count: number;
  background_fills_screen: boolean;
  background_description: string;
  decorative_elements: string;
  overall_mood: string;
}

async function analyzeReferenceStructure(
  referenceBase64: string,
  referenceMimeType: string
): Promise<ReferenceStructure> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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
          {
            text: `Analyze this Instagram Story image's structural layout in detail. Return a JSON object with these fields:

- person_position: Where is the person? ("center", "left", "right", "center-left", "center-right", "none")
- person_frame_percentage: What % of the frame does the person occupy? (0-100)
- person_body_visible: What parts are visible? ("face_closeup", "head_and_shoulders", "upper_body", "full_body", "none")
- person_pose: Describe the pose precisely (e.g., "pointing finger at camera", "arms crossed", "holding phone", "selfie with peace sign")
- person_gaze_direction: Where is the person looking? ("directly at camera", "looking up", "looking left", "looking down", etc.)
- camera_angle: Camera perspective ("front-facing selfie", "slightly above", "eye level", "low angle", "side angle")
- text_position: Where is the text? ("bottom_30%", "top_30%", "center", "bottom_20%", "top_20%")
- text_zone_percentage: What % of screen height does the text zone occupy? (0-100)
- text_container_shape: Shape of text containers ("rounded_rectangle", "pill", "rectangle", "none")
- text_container_color: Color of text containers ("white", "black", "red", "transparent", etc.)
- text_color: Color of the text itself ("black", "white", "red", etc.)
- text_weight: Text weight ("extra_bold", "bold", "medium", "regular")
- text_lines_count: How many separate text lines/blocks are there?
- background_fills_screen: Does the photo/background fill the entire screen? (true/false)
- background_description: Brief description of the background ("indoor room", "outdoor", "solid color", "gradient", etc.)
- decorative_elements: Any emoji, stickers, icons? Describe them and their position ("warning emoji after text", "star sticker top-right", "none")
- overall_mood: The mood/feel ("urgent/attention-grabbing", "calm/professional", "fun/playful", "serious", etc.)

Return ONLY valid JSON, no markdown.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          person_position: { type: Type.STRING },
          person_frame_percentage: { type: Type.NUMBER },
          person_body_visible: { type: Type.STRING },
          person_pose: { type: Type.STRING },
          person_gaze_direction: { type: Type.STRING },
          camera_angle: { type: Type.STRING },
          text_position: { type: Type.STRING },
          text_zone_percentage: { type: Type.NUMBER },
          text_container_shape: { type: Type.STRING },
          text_container_color: { type: Type.STRING },
          text_color: { type: Type.STRING },
          text_weight: { type: Type.STRING },
          text_lines_count: { type: Type.NUMBER },
          background_fills_screen: { type: Type.BOOLEAN },
          background_description: { type: Type.STRING },
          decorative_elements: { type: Type.STRING },
          overall_mood: { type: Type.STRING },
        },
        required: [
          'person_position', 'person_frame_percentage', 'person_body_visible',
          'person_pose', 'person_gaze_direction', 'camera_angle',
          'text_position', 'text_zone_percentage',
          'text_container_shape', 'text_container_color',
          'text_color', 'text_weight', 'text_lines_count',
          'background_fills_screen', 'background_description',
          'decorative_elements', 'overall_mood',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new GeminiServiceError('参考画像の構造分析に失敗しました。');

  return JSON.parse(text) as ReferenceStructure;
}

function buildStructureDescription(s: ReferenceStructure): string {
  return `## EXACT LAYOUT SPECIFICATION (you MUST follow this precisely)

### PERSON/SUBJECT
- Position: ${s.person_position} of the frame
- Frame coverage: ${s.person_frame_percentage}% of the image
- Body visible: ${s.person_body_visible}
- Pose: ${s.person_pose}
- Gaze direction: ${s.person_gaze_direction}
- Camera angle: ${s.camera_angle}

### TEXT
- Position: ${s.text_position} of the screen
- Text zone height: ${s.text_zone_percentage}% of screen
- Container shape: ${s.text_container_shape}
- Container color: ${s.text_container_color}
- Text color: ${s.text_color}
- Text weight: ${s.text_weight}
- Number of text blocks: ${s.text_lines_count}

### BACKGROUND
- Photo fills entire screen: ${s.background_fills_screen}
- Background: ${s.background_description}

### DECORATIVE ELEMENTS
- ${s.decorative_elements}

### MOOD
- ${s.overall_mood}`;
}

// --- 参考ストーリーズ付き生成（構造分析結果を使用） ---

async function generateImageFromReference(
  referenceBase64: string,
  referenceMimeType: string,
  textMessage: string,
  atmosphereNote: string,
  patternIndex: number,
  logoPalette?: string[],
  backgroundOnly?: boolean,
  structureOverride?: ReferenceStructure
): Promise<string> {
  const ai = getGeminiClient();

  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const structure = structureOverride || await analyzeReferenceStructure(referenceBase64, referenceMimeType);
  const structureDesc = buildStructureDescription(structure);

  const systemPrompt = `You are an expert Instagram Story designer. You will receive a REFERENCE image and a detailed structural specification. Your job is to create a NEW image (9:16 vertical, 1080x1920px) that EXACTLY matches the structural specification.

You MUST follow EVERY detail in the specification:
- Person position and frame coverage EXACTLY as specified
- Person pose and gaze direction EXACTLY as specified
- Camera angle EXACTLY as specified
- Text containers (shape, color, position) EXACTLY as specified
- Text styling (color, weight) EXACTLY as specified
- Background treatment EXACTLY as specified
- Decorative elements in the same positions

Output only the generated image.`;

  const variationNotes = [
    'Follow the specification exactly. This should be indistinguishable from the same series.',
    'Follow the specification exactly but use a very slightly different camera angle (5-10 degrees shift only). Everything else identical.',
    'Follow the specification exactly but try a minor variation in the text container (e.g., slightly different corner radius or opacity). Person and layout identical.',
  ];

  const subjectInstruction = backgroundOnly
    ? `SUBJECT: Instead of a person, use a scenic/atmospheric background that fills the person area.
${atmosphereNote ? `Scene description: ${atmosphereNote}` : 'Use a professional atmospheric scene.'}`
    : `SUBJECT: Generate a person matching this pose description exactly.
${atmosphereNote ? `Additional style: ${atmosphereNote}` : ''}`;

  const userPrompt = `Here is the reference image for visual style reference.

${structureDesc}

${subjectInstruction}

TEXT CONTENT to render: "${textMessage}"

VARIATION: ${variationNotes[patternIndex] || variationNotes[0]}

${logoPalette && logoPalette.length > 0 ? `Brand colors: ${logoPalette.join(', ')}` : ''}

CRITICAL REMINDERS:
- The person/subject MUST occupy exactly ${structure.person_frame_percentage}% of the frame
- The person MUST be in a "${structure.person_pose}" pose, looking "${structure.person_gaze_direction}"
- Text MUST be in ${structure.text_container_color} ${structure.text_container_shape} containers at the ${structure.text_position}
- Text MUST be ${structure.text_weight} ${structure.text_color}

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
        systemInstruction: systemPrompt,
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

// --- 素材画像 + 参考ストーリーズ 両方を使った生成 ---

async function generateImageFromCombined(
  templateBase64: string,
  templateMimeType: string,
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

  // まず参考画像を構造分析
  const structure = await analyzeReferenceStructure(referenceBase64, referenceMimeType);
  const structureDesc = buildStructureDescription(structure);

  const systemPrompt = `You are an expert Instagram Story designer. You will receive TWO images and a detailed structural specification:
1. IMAGE 1 (FIRST): A TEMPLATE photo — use this person/product as the SUBJECT
2. IMAGE 2 (SECOND): A REFERENCE Instagram Story — visual style reference

You MUST create a NEW image (9:16 vertical, 1080x1920px) where:
- The PERSON from Image 1 appears in the generated image
- The LAYOUT follows the structural specification EXACTLY (person position, pose, text containers, colors)
- The person from Image 1 should be placed in the pose and position described in the specification

Output only the generated image.`;

  const variationNotes = [
    'Follow the specification exactly. Place the person from Image 1 into this exact layout.',
    'Follow the specification but adjust the person\'s angle slightly (5-10 degrees). Layout otherwise identical.',
    'Follow the specification exactly but try a minor text container variation. Person placement identical.',
  ];

  const subjectInstruction = backgroundOnly
    ? `SUBJECT: Ignore the person in Image 1. Use only Image 1's color palette and mood. Fill the person area with a scenic background.
${atmosphereNote ? `Scene: ${atmosphereNote}` : ''}`
    : `SUBJECT: Use the PERSON from Image 1. Place them in the exact pose and position described below.
${atmosphereNote ? `Additional style: ${atmosphereNote}` : ''}`;

  const userPrompt = `Image 1 is the person/product to feature.
Image 2 is the design reference.

${structureDesc}

${subjectInstruction}

TEXT CONTENT: "${textMessage}"

VARIATION: ${variationNotes[patternIndex] || variationNotes[0]}

${logoPalette && logoPalette.length > 0 ? `Brand colors: ${logoPalette.join(', ')}` : ''}

CRITICAL:
- Person from Image 1 MUST appear (unless background-only mode)
- Person MUST occupy ${structure.person_frame_percentage}% of frame, positioned ${structure.person_position}
- Person MUST be in "${structure.person_pose}" pose, looking "${structure.person_gaze_direction}"
- Text in ${structure.text_container_color} ${structure.text_container_shape} at ${structure.text_position}
- Text: ${structure.text_weight} ${structure.text_color}

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
        systemInstruction: systemPrompt,
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
      console.warn('素材+参考ストーリーズ結合生成失敗、参考ストーリーズのみにフォールバック');
      return generateImageFromReference(
        referenceBase64,
        referenceMimeType,
        textMessage,
        atmosphereNote,
        patternIndex,
        logoPalette,
        backgroundOnly
      );
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
  backgroundOnly?: boolean,
  situation?: string
): Promise<GeneratedImage[]> => {
  if (!message) {
    throw new Error('描きたいメッセージを入力してください。');
  }

  const TOTAL_PATTERNS = 3;

  try {
    // 素材画像 + 参考ストーリーズ 両方がある場合: 結合生成
    if (templateImageUrl && referenceStoryUrl) {
      callbacks?.onProgress?.('素材画像と参考ストーリーズを読み込み中...');
      const template = await fetchImageAsBase64(templateImageUrl);
      const reference = await fetchImageAsBase64(referenceStoryUrl);

      const generatedImages: GeneratedImage[] = [];

      for (let i = 0; i < TOTAL_PATTERNS; i++) {
        callbacks?.onSlideGenerated?.(i, TOTAL_PATTERNS);
        callbacks?.onProgress?.(
          `パターン ${i + 1}/${TOTAL_PATTERNS} を生成中...`
        );

        try {
          console.log(`素材+参考 パターン ${i + 1} 生成`);
          const imageDataUrl = await generateImageFromCombined(
            template.base64,
            template.mimeType,
            reference.base64,
            reference.mimeType,
            message,
            atmosphereNote,
            i,
            logoPalette,
            backgroundOnly
          );

          generatedImages.push({
            id: `combined-pattern-${i + 1}-${Date.now()}`,
            url: imageDataUrl,
            prompt: `素材+参考 + "${message}" パターン${i + 1}`,
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
          console.log(`素材+参考 パターン ${i + 1} 生成完了`);
        } catch (err) {
          console.error(`素材+参考 パターン ${i + 1} 失敗:`, err);
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

    // 参考ストーリーズのみの場合: デザインDNA再現生成
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
      logoPalette,
      backgroundOnly,
      situation
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
