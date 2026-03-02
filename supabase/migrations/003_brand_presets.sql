-- ============================================
-- ブランドプリセット テーブル
-- BrandConfig を JSONB で格納
-- ============================================

create table brand_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb not null default '{}',    -- BrandConfig をそのまま格納
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス: 作成日時の昇順ソート用
create index idx_brand_presets_created_at
  on brand_presets(created_at asc);

-- updated_at 自動更新トリガー（既存の関数を再利用）
create trigger trigger_brand_presets_updated_at
  before update on brand_presets
  for each row
  execute function update_updated_at_column();

-- ============================================
-- RLS: anon キーからの全操作を許可
-- （認証不要の構成）
-- ============================================

alter table brand_presets enable row level security;

create policy "Allow all operations for anon"
  on brand_presets for all
  using (true)
  with check (true);
