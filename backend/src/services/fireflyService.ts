import axios, { AxiosError } from 'axios';
import qs from 'qs';

const FIREFLY_API_URL = 'https://firefly-api.adobe.io/v3/images/generate';
const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒
const TOKEN_CACHE_TTL = 23 * 60 * 60 * 1000; // 23時間（24時間有効の前に更新）

export class FireflyServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FireflyServiceError';
  }
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

// アクセストークンのキャッシュ（メモリ内）
let tokenCache: AccessTokenCache | null = null;

interface FireflyGenerateRequest {
  prompt: string;
  size?: {
    width: number;
    height: number;
  };
  numVariations?: number;
  style?: {
    presets?: string[];
  };
  promptBiasingLocaleCode?: string;
}

interface FireflyGenerateResponse {
  outputs: Array<{
    seed: number;
    image: {
      id: string;
      presignedUrl: string;
    };
  }>;
}

/**
 * Adobe IMSからアクセストークンを取得する
 */
async function retrieveAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  // キャッシュされたトークンが有効な場合はそれを使用
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const data = qs.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis',
  });

  try {
    const response = await axios.post(
      IMS_TOKEN_URL,
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      }
    );

    const { access_token } = response.data;
    
    if (!access_token) {
      throw new FireflyServiceError('アクセストークンが取得できませんでした');
    }

    // トークンをキャッシュ（23時間後に期限切れとして扱う）
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + TOKEN_CACHE_TTL,
    };

    return access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      if (axiosError.response) {
        const errorData = axiosError.response.data;
        throw new FireflyServiceError(
          `アクセストークンの取得に失敗しました: ${errorData?.error_description || errorData?.error || axiosError.message}`,
          axiosError.response.status,
          error
        );
      }
    }
    throw new FireflyServiceError(
      'アクセストークンの取得に失敗しました',
      undefined,
      error
    );
  }
}

/**
 * Adobe Firefly APIで画像を生成する
 */
export async function generateImage(
  clientId: string,
  clientSecret: string,
  prompt: string,
  numImages: number = 1
): Promise<string[]> {
  if (!clientId || !clientSecret) {
    throw new FireflyServiceError('Adobe Firefly APIの認証情報が設定されていません。');
  }

  // アクセストークンを取得
  const accessToken = await retrieveAccessToken(clientId, clientSecret);

  const imageUrls: string[] = [];
  
  // 複数枚生成する場合は、1枚ずつリクエストを送信
  for (let i = 0; i < numImages; i++) {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        const requestData: FireflyGenerateRequest = {
          prompt,
          size: {
            width: 1080,  // Instagramストーリーズ用 9:16
            height: 1920,
          },
          numVariations: 1, // 1枚ずつ生成
        };

        const response = await axios.post<FireflyGenerateResponse>(
          FIREFLY_API_URL,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-api-key': clientId,
              'Authorization': `Bearer ${accessToken}`,
            },
            timeout: 120000, // 120秒タイムアウト
          }
        );

        // レスポンスから画像URLを抽出
        if (response.data.outputs && response.data.outputs.length > 0) {
          const imageUrl = response.data.outputs[0].image.presignedUrl;
          imageUrls.push(imageUrl);
          console.log(`画像URLを取得: ${imageUrl.substring(0, 100)}...`);
          break; // 成功したら次の画像へ
        } else {
          throw new FireflyServiceError('画像データがレスポンスに含まれていません');
        }
      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          
          if (axiosError.response) {
            const statusCode = axiosError.response.status;
            const errorData = axiosError.response.data;
            
            console.error(`Firefly APIエラー: ${statusCode}`, JSON.stringify(errorData, null, 2));
            
            // 401エラーの場合はトークンを再取得してリトライ
            if (statusCode === 401) {
              console.log('トークンが無効のため再取得します...');
              tokenCache = null; // キャッシュをクリア
              const newToken = await retrieveAccessToken(clientId, clientSecret);
              // 新しいトークンで再試行
              retries++;
              if (retries < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                continue;
              }
            }
            
            // 4xxエラーはリトライしない
            if (statusCode >= 400 && statusCode < 500 && statusCode !== 401) {
              const errorMessage = errorData?.message || errorData?.error || `APIエラー: ${statusCode}`;
              throw new FireflyServiceError(
                `Firefly APIエラー (${statusCode}): ${errorMessage}`,
                statusCode,
                error
              );
            }
          } else if (axiosError.request) {
            console.error('Firefly APIリクエストエラー: レスポンスがありません', axiosError.message);
          }
        }

        retries++;
        if (retries < MAX_RETRIES) {
          // 指数バックオフでリトライ
          const delay = RETRY_DELAY * Math.pow(2, retries - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (retries >= MAX_RETRIES && lastError) {
      throw new FireflyServiceError(
        `画像生成に失敗しました（リトライ上限に達しました）: ${lastError.message}`,
        undefined,
        lastError
      );
    }

    // レート制限対策: リクエスト間に少し待機
    if (i < numImages - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return imageUrls;
}

/**
 * 複数のプロンプトで画像を一括生成
 */
export async function generateImagesBatch(
  clientId: string,
  clientSecret: string,
  prompts: string[]
): Promise<string[]> {
  const allUrls: string[] = [];

  for (const prompt of prompts) {
    try {
      const urls = await generateImage(clientId, clientSecret, prompt, 1);
      allUrls.push(...urls);
    } catch (error) {
      console.error(`プロンプト "${prompt.substring(0, 50)}..." の画像生成に失敗:`, error);
      // エラーが発生しても続行（空のURLを追加しない）
    }
  }

  return allUrls;
}
