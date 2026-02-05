import { BrandConfig } from '../types';

const STORAGE_KEY_BRAND_CONFIG = 'story-background-generator-brand-config';

/**
 * ブランド設定をローカルストレージに保存する
 */
export function saveBrandConfig(config: BrandConfig): void {
  try {
    const serialized = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEY_BRAND_CONFIG, serialized);
  } catch (error) {
    console.error('ブランド設定の保存に失敗しました:', error);
    // ストレージが使用できない場合（プライベートモードなど）はエラーを無視
  }
}

/**
 * ローカルストレージからブランド設定を読み込む
 */
export function loadBrandConfig(): BrandConfig | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_BRAND_CONFIG);
    if (!serialized) {
      return null;
    }

    const config = JSON.parse(serialized) as BrandConfig;
    
    // 型チェック（基本的な検証）
    if (
      typeof config === 'object' &&
      typeof config.primaryColor === 'string' &&
      typeof config.fontPreference === 'string' &&
      typeof config.logoUrl === 'string'
    ) {
      return config;
    }

    console.warn('保存されたブランド設定の形式が不正です。');
    return null;
  } catch (error) {
    console.error('ブランド設定の読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * ブランド設定を削除する
 */
export function clearBrandConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_BRAND_CONFIG);
  } catch (error) {
    console.error('ブランド設定の削除に失敗しました:', error);
  }
}
