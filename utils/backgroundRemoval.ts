import { GoogleGenAI } from '@google/genai';

export interface RemovalProgress {
  message: string;
  progress: number; // 0-1
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。');
  }
  return new GoogleGenAI({ apiKey });
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'image/png' });
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/**
 * Gemini (Nano Banana) を使って画像の背景を透過処理し、PNG形式のFileとして返す。
 * 失敗時は例外をスローする（呼び出し側でフォールバック処理を行う）。
 */
export async function removeBackground(
  file: File,
  onProgress?: (p: RemovalProgress) => void,
): Promise<File> {
  onProgress?.({ message: '画像を読み込み中...', progress: 0.1 });

  const { base64, mimeType } = await fileToBase64(file);

  onProgress?.({ message: 'AIで背景を透過中...', progress: 0.3 });

  const ai = getGeminiClient();
  const imageModel =
    import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'nano-banana-pro-preview';

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: 'Remove the background from this image completely. Keep ONLY the main subject (person, product, or object) with a fully transparent background. Output the result as a PNG image with transparency. Do not add any new background, decorations, or effects. Preserve the original quality and details of the subject.',
          },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  onProgress?.({ message: '透過画像を処理中...', progress: 0.8 });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageBase64 = part.inlineData.data;
        const binaryStr = atob(imageBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        const name = file.name.replace(/\.[^.]+$/, '.png');

        onProgress?.({ message: '背景透過完了！', progress: 1.0 });
        return new File([blob], name, { type: 'image/png' });
      }
    }
  }

  throw new Error('Geminiから背景透過画像を取得できませんでした。');
}
