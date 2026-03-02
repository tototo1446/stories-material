import { BrandConfig, BrandPreset } from '../types';

const STORAGE_KEY_BRAND_CONFIG = 'story-background-generator-brand-config';
const STORAGE_KEY_BRAND_PRESETS = 'story-background-generator-brand-presets';
const STORAGE_KEY_ACTIVE_PRESET_ID = 'story-background-generator-active-preset-id';

// ── プリセット用ストレージ関数 ──

export function saveBrandPresets(presets: BrandPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BRAND_PRESETS, JSON.stringify(presets));
  } catch (error) {
    console.error('ブランドプリセットの保存に失敗しました:', error);
  }
}

export function loadBrandPresets(): BrandPreset[] {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_BRAND_PRESETS);
    if (!serialized) return [];
    const presets = JSON.parse(serialized);
    if (Array.isArray(presets)) return presets as BrandPreset[];
    return [];
  } catch (error) {
    console.error('ブランドプリセットの読み込みに失敗しました:', error);
    return [];
  }
}

export function saveActivePresetId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PRESET_ID);
    }
  } catch (error) {
    console.error('アクティブプリセットIDの保存に失敗しました:', error);
  }
}

export function loadActivePresetId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET_ID);
  } catch {
    return null;
  }
}

/**
 * 旧ブランド設定（単体）を新プリセット形式に自動マイグレーション
 * 成功時はプリセットを返し、旧キーを削除する
 */
export function migrateOldBrandConfig(): BrandPreset | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_BRAND_CONFIG);
    if (!serialized) return null;

    const config = JSON.parse(serialized) as BrandConfig;
    if (
      typeof config !== 'object' ||
      typeof config.primaryColor !== 'string' ||
      typeof config.fontPreference !== 'string' ||
      typeof config.logoUrl !== 'string'
    ) {
      return null;
    }

    const validatedConfig: BrandConfig = {
      ...config,
      useLogoColors: config.useLogoColors ?? false,
      useLogoOverlay: config.useLogoOverlay ?? false,
      extractedColors: config.extractedColors ?? undefined,
    };

    const now = Date.now();
    const preset: BrandPreset = {
      id: `preset-${now}`,
      name: 'マイブランド',
      config: validatedConfig,
      createdAt: now,
      updatedAt: now,
    };

    // 旧キーを削除
    localStorage.removeItem(STORAGE_KEY_BRAND_CONFIG);

    return preset;
  } catch (error) {
    console.error('ブランド設定のマイグレーションに失敗しました:', error);
    return null;
  }
}

// ── 旧関数（後方互換用・マイグレーション内部で使用） ──

export function saveBrandConfig(config: BrandConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_BRAND_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('ブランド設定の保存に失敗しました:', error);
  }
}

export function loadBrandConfig(): BrandConfig | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_BRAND_CONFIG);
    if (!serialized) return null;

    const config = JSON.parse(serialized) as BrandConfig;
    if (
      typeof config === 'object' &&
      typeof config.primaryColor === 'string' &&
      typeof config.fontPreference === 'string' &&
      typeof config.logoUrl === 'string'
    ) {
      return {
        ...config,
        useLogoColors: config.useLogoColors ?? false,
        useLogoOverlay: config.useLogoOverlay ?? false,
        extractedColors: config.extractedColors ?? undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearBrandConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_BRAND_CONFIG);
  } catch (error) {
    console.error('ブランド設定の削除に失敗しました:', error);
  }
}
