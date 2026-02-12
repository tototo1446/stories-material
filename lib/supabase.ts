import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    '⚠️ Supabase環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
  );
}

/**
 * Supabase クライアントを取得。未設定の場合はエラーをスロー。
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase が初期化されていません。環境変数を確認してください。');
  }
  return _supabase;
}

/** 後方互換: 既存コードが import { supabase } している場合のフォールバック */
export const supabase = _supabase as unknown as SupabaseClient;
