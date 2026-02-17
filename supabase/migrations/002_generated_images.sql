-- ============================================
-- 生成画像 メタデータテーブル
-- 画像本体は Vercel Blob に保存
-- ============================================

create table generated_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,            -- Vercel Blob の公開URL（フルサイズ）
  thumbnail_url text not null,        -- サムネイルの Vercel Blob URL
  prompt text not null,               -- 生成に使用したプロンプト
  slide_number integer,               -- スライド番号 (1, 2, 3)
  original_message text,              -- ユーザーの元メッセージ
  settings jsonb not null default '{}', -- 画像設定（blur, brightness等）
  file_size bigint,                   -- ファイルサイズ (bytes)
  mime_type text,                     -- 例: "image/png", "image/jpeg"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス: 作成日時の降順ソート用
create index idx_generated_images_created_at
  on generated_images(created_at desc);

-- updated_at 自動更新トリガー（既存の関数を再利用）
create trigger trigger_generated_images_updated_at
  before update on generated_images
  for each row
  execute function update_updated_at_column();

-- ============================================
-- RLS: anon キーからの全操作を許可
-- （認証不要の構成）
-- ============================================

alter table generated_images enable row level security;

create policy "Allow all operations for anon"
  on generated_images for all
  using (true)
  with check (true);
