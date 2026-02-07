/**
 * 画像をダウンロードする
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    // CORS対応のため、プロキシ経由またはfetchで取得
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`画像の取得に失敗しました: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // ダウンロードリンクを作成してクリック
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // メモリリークを防ぐため、少し遅延してからURLを解放
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('画像ダウンロードエラー:', error);
    throw error;
  }
}

/**
 * 複数の画像を順次ダウンロードする
 */
export async function downloadAllImages(
  images: Array<{ url: string; slideNumber?: number; id?: string }>,
  baseFilename: string = 'story-background'
): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const slideNum = image.slideNumber ?? i + 1;
    const extension = getImageExtension(image.url) || 'jpg';
    const filename = `${baseFilename}-slide-${slideNum}.${extension}`;

    try {
      await downloadImage(image.url, filename);
      // ダウンロード間隔を開ける（ブラウザの制限対策）
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`スライド${slideNum}のダウンロードに失敗しました:`, error);
      // エラーが発生しても続行
    }
  }
}

/**
 * URLから画像の拡張子を取得する（base64 data URLにも対応）
 */
function getImageExtension(url: string): string | null {
  // base64 data URL の場合、MIMEタイプから拡張子を判定
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:image\/(png|jpeg|jpg|gif|webp)/i);
    if (mimeMatch) {
      return mimeMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : mimeMatch[1].toLowerCase();
    }
    return 'png'; // デフォルト
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)/i);
    return match ? match[1].toLowerCase() : null;
  }
}

/**
 * 画像をBase64データURLに変換する（必要に応じて）
 */
export async function imageToDataURL(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`画像の取得に失敗しました: ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('画像のBase64変換エラー:', error);
    throw error;
  }
}
