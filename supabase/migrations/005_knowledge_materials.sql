-- ============================================
-- ナレッジ素材テーブル
-- テキスト直接入力: content_text のみ使用
-- ファイルアップロード: Vercel Blob + content_text にテキスト抽出
-- ============================================

create table if not exists knowledge_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_text text not null,
  source_type text not null default 'text',
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_materials_created_at
  on knowledge_materials(created_at desc);

drop trigger if exists trigger_knowledge_materials_updated_at on knowledge_materials;
create trigger trigger_knowledge_materials_updated_at
  before update on knowledge_materials
  for each row
  execute function update_updated_at_column();

alter table knowledge_materials enable row level security;

drop policy if exists "Allow all operations for anon" on knowledge_materials;
create policy "Allow all operations for anon"
  on knowledge_materials for all
  using (true)
  with check (true);
