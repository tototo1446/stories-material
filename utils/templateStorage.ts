import { TemplateImage } from '../types';
import { getSupabase } from '../lib/supabase';

// ----------------------------------------------------------------
// サムネイル生成（クライアントサイド）
// ----------------------------------------------------------------

export function generateThumbnail(file: File, maxWidth = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('サムネイル生成に失敗しました'));
        },
        'image/jpeg',
        0.7,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };
    img.src = url;
  });
}

// ----------------------------------------------------------------
// Vercel Blob アップロード（API Route 経由）
// ----------------------------------------------------------------

async function uploadToBlob(file: File | Blob, filename: string): Promise<string> {
  const res = await fetch(`/api/template-upload?filename=${encodeURIComponent(filename)}`, {
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
// テンプレート CRUD（Vercel Blob + Supabase DB）
// ----------------------------------------------------------------

function uniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

/**
 * テンプレート画像を Vercel Blob にアップロードし、メタデータを Supabase DB に保存
 */
export async function saveTemplate(file: File, name: string): Promise<TemplateImage> {
  const filename = uniqueFilename(file.name);

  // 1. 元画像をアップロード
  const imageUrl = await uploadToBlob(file, filename);

  // 2. サムネイルを生成してアップロード
  const thumbBlob = await generateThumbnail(file);
  const thumbnailUrl = await uploadToBlob(
    new File([thumbBlob], `thumb_${filename}`, { type: 'image/jpeg' }),
    `thumb_${filename}`,
  );

  // 3. DB にメタデータを保存
  const { data, error } = await getSupabase()
    .from('template_images')
    .insert({
      name,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) {
    // ロールバック: Blob を削除
    await deleteFromBlob([imageUrl, thumbnailUrl]);
    throw new Error(`テンプレートの保存に失敗: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    dataUrl: data.image_url,
    thumbnailUrl: data.thumbnail_url,
    createdAt: new Date(data.created_at).getTime(),
  };
}

/**
 * 全テンプレートを読み込み
 */
export async function loadAllTemplates(): Promise<TemplateImage[]> {
  const { data, error } = await getSupabase()
    .from('template_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`テンプレートの読み込みに失敗: ${error.message}`);
  if (!data || data.length === 0) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name,
    dataUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

/**
 * テンプレートを削除（Vercel Blob + Supabase DB）
 */
export async function deleteTemplate(id: string): Promise<void> {
  // 1. DB からレコードを取得（URL を取得するため）
  const { data, error: fetchError } = await getSupabase()
    .from('template_images')
    .select('image_url, thumbnail_url')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`テンプレートの取得に失敗: ${fetchError.message}`);

  // 2. Vercel Blob からファイルを削除
  const urls = [data.image_url, data.thumbnail_url].filter(Boolean);
  if (urls.length > 0) {
    await deleteFromBlob(urls);
  }

  // 3. DB からレコードを削除
  const { error: deleteError } = await getSupabase()
    .from('template_images')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`テンプレートの削除に失敗: ${deleteError.message}`);
}
