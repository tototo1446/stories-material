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
 * 全レイヤー（背景・ブランドオーバーレイ・テキスト・ロゴ）を1枚に合成してダウンロード用data URLを生成
 */
export async function flattenImageForDownload(
  image: import('../types').GeneratedImage,
  brand: import('../types').BrandConfig,
  fontMap: Record<string, { family: string; weight: number }>,
  defaultFont: { family: string; weight: number },
  targetWidth: number = 1080,
  targetHeight: number = 1920
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  // 1. 背景画像（blur・brightness適用）
  const bgImg = await loadImageElement(image.url);
  ctx.filter = `blur(${image.settings.blur}px) brightness(${image.settings.brightness}%)`;
  ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
  ctx.filter = 'none';

  // 2. ブランドカラーオーバーレイ
  if (image.settings.brandOverlay) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = brand.primaryColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 3. テキストオーバーレイ
  const to = image.settings.textOverlay;
  if (to.textVisible && to.textContent) {
    const font = fontMap[brand.fontPreference] || defaultFont;
    const scaledFontSize = to.fontSize * (targetWidth / 360);
    ctx.font = `${font.weight} ${scaledFontSize}px ${font.family}`;
    ctx.fillStyle = to.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;

    const layoutPositions: Record<string, { yRatio: number }> = {
      center_focus: { yRatio: 0.5 },
      top_heavy: { yRatio: 0.65 },
      bottom_heavy: { yRatio: 0.3 },
      split_horizontal: { yRatio: 0.5 },
      frame_style: { yRatio: 0.5 },
      gradient_fade: { yRatio: 0.5 },
    };

    const pos = layoutPositions[to.layout] || layoutPositions.center_focus;
    const lines = to.textContent.split('\n');
    const lineHeight = scaledFontSize * 1.5;
    const totalHeight = lines.length * lineHeight;
    const startY = pos.yRatio * targetHeight - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, targetWidth / 2, startY + i * lineHeight, targetWidth * 0.8);
    });

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // 4. ロゴオーバーレイ
  if (image.settings.logoOverlay?.visible && brand.logoUrl) {
    const logoImg = await loadImageElement(brand.logoUrl);
    const maxLogoWidth = targetWidth * 0.4;
    const scale = image.settings.logoOverlay.scale;
    let logoW = logoImg.naturalWidth * scale;
    let logoH = logoImg.naturalHeight * scale;
    if (logoW > maxLogoWidth) {
      const ratio = maxLogoWidth / logoW;
      logoW *= ratio;
      logoH *= ratio;
    }
    const x = (image.settings.logoOverlay.x / 100) * targetWidth - logoW / 2;
    const y = (image.settings.logoOverlay.y / 100) * targetHeight - logoH / 2;
    ctx.drawImage(logoImg, x, y, logoW, logoH);
  }

  return canvas.toDataURL('image/png');
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = src;
  });
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
