-- ============================================
-- 参考ストーリーズ メタデータテーブル
-- 画像本体は Vercel Blob に保存
-- ============================================

-- テーブル作成（存在しない場合のみ）
create table if not exists reference_stories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  thumbnail_url text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス: 作成日時の降順ソート用
create index if not exists idx_reference_stories_created_at
  on reference_stories(created_at desc);

-- updated_at 自動更新関数（他テーブルと共有、既存でも安全に再定義）
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- updated_at 自動更新トリガー
drop trigger if exists trigger_reference_stories_updated_at on reference_stories;
create trigger trigger_reference_stories_updated_at
  before update on reference_stories
  for each row
  execute function update_updated_at_column();

-- ============================================
-- RLS: anon キーからの全操作を許可
-- ============================================

alter table reference_stories enable row level security;

drop policy if exists "Allow all operations for anon" on reference_stories;
create policy "Allow all operations for anon"
  on reference_stories for all
  using (true)
  with check (true);
