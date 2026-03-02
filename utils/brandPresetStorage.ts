import { BrandConfig, BrandPreset } from '../types';
import { getSupabase } from '../lib/supabase';
import { loadBrandPresets as loadBrandPresetsFromLocalStorage } from './storage';

// ----------------------------------------------------------------
// ブランドプリセット CRUD（Supabase DB）
// ----------------------------------------------------------------

/**
 * 全ブランドプリセットを読み込み（created_at 昇順）
 */
export async function loadBrandPresetsFromDB(): Promise<BrandPreset[]> {
  const { data, error } = await getSupabase()
    .from('brand_presets')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`ブランドプリセットの読み込みに失敗: ${error.message}`);
  if (!data || data.length === 0) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name,
    config: row.config as BrandConfig,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

/**
 * 新規ブランドプリセットを作成
 */
export async function saveBrandPresetToDB(
  name: string,
  config: BrandConfig,
): Promise<BrandPreset> {
  const { data, error } = await getSupabase()
    .from('brand_presets')
    .insert({ name, config })
    .select()
    .single();

  if (error) throw new Error(`ブランドプリセットの保存に失敗: ${error.message}`);

  return {
    id: data.id,
    name: data.name,
    config: data.config as BrandConfig,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
  };
}

/**
 * 既存ブランドプリセットを更新
 */
export async function updateBrandPresetInDB(
  id: string,
  name: string,
  config: BrandConfig,
): Promise<void> {
  const { error } = await getSupabase()
    .from('brand_presets')
    .update({ name, config })
    .eq('id', id);

  if (error) throw new Error(`ブランドプリセットの更新に失敗: ${error.message}`);
}

/**
 * ブランドプリセットを削除
 */
export async function deleteBrandPresetFromDB(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('brand_presets')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`ブランドプリセットの削除に失敗: ${error.message}`);
}

// ----------------------------------------------------------------
// localStorage → Supabase マイグレーション
// ----------------------------------------------------------------

const STORAGE_KEY_BRAND_PRESETS = 'story-background-generator-brand-presets';

/**
 * localStorage に残っているプリセットを Supabase に移行し、localStorage から削除する。
 * 既に Supabase にデータがある場合はスキップ。
 */
export async function migrateBrandPresetsToSupabase(): Promise<BrandPreset[]> {
  const localPresets = loadBrandPresetsFromLocalStorage();
  if (localPresets.length === 0) return [];

  // 一括 INSERT
  const rows = localPresets.map(p => ({
    name: p.name,
    config: p.config,
  }));

  const { data, error } = await getSupabase()
    .from('brand_presets')
    .insert(rows)
    .select();

  if (error) {
    console.error('ブランドプリセットの Supabase 移行に失敗:', error.message);
    return [];
  }

  // 移行成功 → localStorage から削除
  try {
    localStorage.removeItem(STORAGE_KEY_BRAND_PRESETS);
  } catch {
    // localStorage アクセスエラーは無視
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    config: row.config as BrandConfig,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}
