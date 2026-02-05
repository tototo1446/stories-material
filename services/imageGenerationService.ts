import { StoryGoal, Atmosphere, GeneratedImage, GenerateImageRequest, GenerateImageResponse } from '../types';

export interface WorkflowProgressCallback {
  onProgress?: (message: string) => void;
  onSlideGenerated?: (current: number, total: number) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * ストーリーズ背景画像を生成する（バックエンドAPI経由）
 */
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

  callbacks?.onProgress?.('画像生成を開始しています...');

  try {
    // スクリプトの行数をカウントして生成枚数を決定
    const scriptLines = script ? script.split('\n').filter(line => line.trim()) : [];
    const count = scriptLines.length > 0 ? scriptLines.length : 1;

    const requestBody: GenerateImageRequest = {
      script: script || undefined,
      theme: theme || 'abstract background',
      goal: goal,
      atmosphere: atmosphere,
      brandColor: brandColor || undefined,
      subColor: subColor || undefined,
      count: count,
    };

    callbacks?.onProgress?.(`${count}枚の画像を生成中...`);

    const response = await fetch(`${API_BASE_URL}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTPエラー: ${response.status} ${response.statusText}`
      );
    }

    const data: GenerateImageResponse = await response.json();

    if (!data.images || data.images.length === 0) {
      throw new Error('画像が生成されませんでした。');
    }

    // 進捗通知
    callbacks?.onSlideGenerated?.(data.images.length, data.images.length);
    callbacks?.onProgress?.(`${data.images.length}枚の画像を生成しました！`);

    // GenerateImageResponseをGeneratedImage[]に変換
    const generatedImages: GeneratedImage[] = data.images.map((img) => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
      slideNumber: img.slideNumber,
      resolution: img.resolution,
      settings: {
        blur: 0,
        brightness: 100,
        brandOverlay: false,
      },
    }));

    return generatedImages;
  } catch (error) {
    console.error('背景画像生成に失敗しました:', error);
    
    let errorMessage = '画像生成に失敗しました。';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // ネットワークエラーの場合
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。';
      }
    }
    
    callbacks?.onProgress?.(errorMessage);
    throw error;
  }
};