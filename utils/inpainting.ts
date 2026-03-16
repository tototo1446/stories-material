import { GoogleGenAI } from '@google/genai';

function getGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。');
  }
  return new GoogleGenAI({ apiKey });
}

function dataUrlToBase64(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('無効なdata URLです');
  return { mimeType: match[1], base64: match[2] };
}

/**
 * Gemini を使って画像の一部をインペインティング（部分修正）する。
 * 元画像 + マスク画像（白=修正範囲） + テキスト指示を送り、修正後の画像URLを返す。
 */
export async function inpaintImage(
  imageDataUrl: string,
  maskDataUrl: string,
  instruction: string,
): Promise<string> {
  const image = dataUrlToBase64(imageDataUrl);
  const mask = dataUrlToBase64(maskDataUrl);

  const ai = getGeminiClient();
  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          { inlineData: { mimeType: mask.mimeType, data: mask.base64 } },
          {
            text: `Edit this image. The second image is a mask where white areas indicate the regions to modify. Keep all non-masked areas exactly unchanged. In the masked (white) areas, apply the following change: ${instruction}. Output the result as a single PNG image.`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error('Geminiからインペインティング結果を取得できませんでした。');
}
