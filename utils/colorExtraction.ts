import { ExtractedColors } from '../types';

/**
 * 画像（base64 data URL）からドミナントカラーを抽出する
 * Canvas APIを使用したクライアントサイド処理
 */
export async function extractColorsFromImage(dataUrl: string): Promise<ExtractedColors> {
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  const sampleSize = 50;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = imageData.data;

  // RGB各チャンネルを32単位で量子化し、頻度をカウント
  const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) continue; // 透明ピクセルをスキップ

    const r = Math.round(pixels[i] / 32) * 32;
    const g = Math.round(pixels[i + 1] / 32) * 32;
    const b = Math.round(pixels[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;

    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { r, g, b, count: 1 });
    }
  }

  // 頻度順にソート
  const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

  // 白・黒に近い色をフィルタリング（他に十分な色がある場合）
  const filtered = sorted.filter(c => {
    const brightness = (c.r + c.g + c.b) / 3;
    return brightness > 30 && brightness < 230;
  });

  const candidates = filtered.length >= 3 ? filtered : sorted;

  // 上位5色をhexに変換
  const palette = candidates.slice(0, 5).map(c => rgbToHex(c.r, c.g, c.b));
  const dominant = palette[0] || '#6366f1';

  return { dominant, palette: palette.length > 0 ? palette : [dominant] };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = src;
  });
}
