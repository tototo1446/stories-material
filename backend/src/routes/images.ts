import { Router, Request, Response } from 'express';
import { GenerateImageRequest, GenerateImageResponse } from '../types';
import { buildPromptsForSlides } from '../services/promptBuilder';
import { generateImagesBatch } from '../services/fireflyService';

const router = Router();

/**
 * POST /api/images/generate
 * ストーリーズ背景画像を生成する
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      script,
      theme,
      goal,
      atmosphere,
      brandColor,
      subColor,
      count = 1,
    } = req.body as GenerateImageRequest;

    // バリデーション
    if (!theme && !script) {
      return res.status(400).json({
        error: 'themeまたはscriptのいずれかが必要です',
      });
    }

    if (!goal || !atmosphere) {
      return res.status(400).json({
        error: 'goalとatmosphereが必要です',
      });
    }

    // Adobe Firefly API認証情報の取得
    const clientId = process.env.ADOBE_FIREFLY_CLIENT_ID;
    const clientSecret = process.env.ADOBE_FIREFLY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Adobe Firefly APIの認証情報が設定されていません。ADOBE_FIREFLY_CLIENT_IDとADOBE_FIREFLY_CLIENT_SECRETを設定してください。',
      });
    }

    // プロンプトの生成
    const prompts = buildPromptsForSlides(
      script,
      theme || 'abstract background',
      goal,
      atmosphere,
      brandColor,
      count
    );

    // 画像生成
    console.log(`画像生成を開始: ${prompts.length}枚のプロンプト`);
    console.log(`使用するClient ID: ${clientId ? clientId.substring(0, 10) + '...' : '未設定'}`);
    
    let imageUrls: string[] = [];
    try {
      imageUrls = await generateImagesBatch(clientId, clientSecret, prompts);
    } catch (error: any) {
      console.error('画像生成バッチ処理エラー:', error);
      const errorMessage = error.message || '画像生成中にエラーが発生しました';
      const statusCode = error.statusCode || 500;
      
      return res.status(statusCode).json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }

    if (imageUrls.length === 0) {
      console.error('画像URLが空です。生成されたURL数: 0');
      return res.status(500).json({
        error: '画像の生成に失敗しました。画像URLが取得できませんでした。',
      });
    }
    
    console.log(`画像生成成功: ${imageUrls.length}枚の画像を取得`);

    // レスポンスの構築
    const response: GenerateImageResponse = {
      images: imageUrls.map((url, index) => ({
        id: `slide-${index + 1}-${Date.now()}`,
        url,
        prompt: prompts[index] || '',
        slideNumber: index + 1,
        resolution: '1080x1920',
      })),
    };

    res.json(response);
  } catch (error: any) {
    console.error('画像生成エラー:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || '画像生成中にエラーが発生しました';

    res.status(statusCode).json({
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;