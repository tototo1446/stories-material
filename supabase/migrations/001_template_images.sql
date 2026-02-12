-- ============================================
-- テンプレート素材画像 メタデータテーブル
-- 画像本体は Vercel Blob に保存
-- ============================================

-- 既存オブジェクトをクリーンアップ
drop trigger if exists trigger_template_images_updated_at on template_images;
drop policy if exists "Users can view own templates" on template_images;
drop policy if exists "Users can insert own templates" on template_images;
drop policy if exists "Users can update own templates" on template_images;
drop policy if exists "Users can delete own templates" on template_images;
drop policy if exists "Allow all operations for anon" on template_images;
drop table if exists template_images;

create table template_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,           -- Vercel Blob の公開URL
  thumbnail_url text not null,       -- サムネイルの Vercel Blob URL
  file_size bigint,                  -- ファイルサイズ (bytes)
  mime_type text,                    -- 例: "image/jpeg", "image/png"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス: 作成日時の降順ソート用
create index idx_template_images_created_at
  on template_images(created_at desc);

-- updated_at 自動更新トリガー
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_template_images_updated_at
  before update on template_images
  for each row
  execute function update_updated_at_column();

-- ============================================
-- RLS: anon キーからの全操作を許可
-- （認証不要の構成）
-- ============================================

alter table template_images enable row level security;

create policy "Allow all operations for anon"
  on template_images for all
  using (true)
  with check (true);
