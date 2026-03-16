import { ReferenceStory } from '../types';
import { getSupabase } from '../lib/supabase';
import { generateThumbnail, uploadToBlob, deleteFromBlob, uniqueFilename } from './templateStorage';

// ----------------------------------------------------------------
// 参考ストーリーズ CRUD（Vercel Blob + Supabase DB）
// ----------------------------------------------------------------

/**
 * 参考ストーリーズ画像を Vercel Blob にアップロードし、メタデータを Supabase DB に保存
 * （背景透過処理なし — アップロードされたまま保存）
 */
export async function saveReferenceStory(file: File, name: string): Promise<ReferenceStory> {
  const filename = uniqueFilename(file.name);

  // 1. 元画像をアップロード（references フォルダ）
  const imageUrl = await uploadToBlob(file, `references/${filename}`);

  // 2. サムネイルを生成してアップロード
  const isPng = file.type === 'image/png';
  const thumbBlob = await generateThumbnail(file);
  const thumbFilename = isPng
    ? `thumb_${filename.replace(/\.[^.]+$/, '.png')}`
    : `thumb_${filename}`;
  const thumbnailUrl = await uploadToBlob(
    new File([thumbBlob], thumbFilename, { type: isPng ? 'image/png' : 'image/jpeg' }),
    `references/${thumbFilename}`,
  );

  // 3. DB にメタデータを保存
  const { data, error } = await getSupabase()
    .from('reference_stories')
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
    throw new Error(`参考ストーリーズの保存に失敗: ${error.message}`);
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
 * 全参考ストーリーズを読み込み
 */
export async function loadAllReferenceStories(): Promise<ReferenceStory[]> {
  const { data, error } = await getSupabase()
    .from('reference_stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`参考ストーリーズの読み込みに失敗: ${error.message}`);
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
 * 参考ストーリーズを削除（Vercel Blob + Supabase DB）
 */
export async function deleteReferenceStory(id: string): Promise<void> {
  // 1. DB からレコードを取得（URL を取得するため）
  const { data, error: fetchError } = await getSupabase()
    .from('reference_stories')
    .select('image_url, thumbnail_url')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`参考ストーリーズの取得に失敗: ${fetchError.message}`);

  // 2. Vercel Blob からファイルを削除
  const urls = [data.image_url, data.thumbnail_url].filter(Boolean);
  if (urls.length > 0) {
    await deleteFromBlob(urls);
  }

  // 3. DB からレコードを削除
  const { error: deleteError } = await getSupabase()
    .from('reference_stories')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`参考ストーリーズの削除に失敗: ${deleteError.message}`);
}
