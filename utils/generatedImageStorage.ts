import { GeneratedImage, SavedImage } from '../types';
import { getSupabase } from '../lib/supabase';

// ----------------------------------------------------------------
// ヘルパー
// ----------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function generateThumbnailFromDataUrl(dataUrl: string, maxWidth = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('サムネイル生成に失敗しました'));
        },
        'image/jpeg',
        0.7,
      );
    };
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = dataUrl;
  });
}

function uniqueFilename(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
}

async function uploadToBlob(blob: Blob, filename: string, folder: string): Promise<string> {
  const file = new File([blob], filename, { type: blob.type });
  const res = await fetch(`/api/template-upload?filename=${encodeURIComponent(filename)}&folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    body: file,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'アップロードに失敗しました');
  }

  const { url } = await res.json();
  return url;
}

async function deleteFromBlob(urls: string[]): Promise<void> {
  const res = await fetch('/api/template-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  if (!res.ok) {
    console.error('Blob deletion failed');
  }
}

// ----------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------

export async function saveGeneratedImage(
  image: GeneratedImage,
  metadata: { originalMessage?: string }
): Promise<SavedImage> {
  const filename = uniqueFilename('gen');
  const thumbFilename = uniqueFilename('gen_thumb');

  // 1. 元画像をアップロード
  const imageBlob = dataUrlToBlob(image.url);
  const imageUrl = await uploadToBlob(imageBlob, filename, 'generated');

  // 2. サムネイル生成 → アップロード
  const thumbBlob = await generateThumbnailFromDataUrl(image.url);
  const thumbnailUrl = await uploadToBlob(thumbBlob, thumbFilename, 'generated');

  // 3. DBにメタデータ保存
  const { data, error } = await getSupabase()
    .from('generated_images')
    .insert({
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      prompt: image.prompt,
      slide_number: image.slideNumber,
      original_message: metadata.originalMessage,
      settings: image.settings,
      file_size: imageBlob.size,
      mime_type: imageBlob.type,
    })
    .select()
    .single();

  if (error) {
    await deleteFromBlob([imageUrl, thumbnailUrl]);
    throw new Error(`生成画像の保存に失敗: ${error.message}`);
  }

  return {
    id: data.id,
    imageUrl: data.image_url,
    thumbnailUrl: data.thumbnail_url,
    prompt: data.prompt,
    slideNumber: data.slide_number,
    originalMessage: data.original_message,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function loadSavedImages(): Promise<SavedImage[]> {
  const { data, error } = await getSupabase()
    .from('generated_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`保存済み画像の読み込みに失敗: ${error.message}`);
  if (!data || data.length === 0) return [];

  return data.map(row => ({
    id: row.id,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    prompt: row.prompt,
    slideNumber: row.slide_number,
    originalMessage: row.original_message,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function deleteSavedImage(id: string): Promise<void> {
  const { data, error: fetchError } = await getSupabase()
    .from('generated_images')
    .select('image_url, thumbnail_url')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`画像の取得に失敗: ${fetchError.message}`);

  const urls = [data.image_url, data.thumbnail_url].filter(Boolean);
  if (urls.length > 0) {
    await deleteFromBlob(urls);
  }

  const { error: deleteError } = await getSupabase()
    .from('generated_images')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`画像の削除に失敗: ${deleteError.message}`);
}
