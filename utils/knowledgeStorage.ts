import { KnowledgeMaterial } from '../types';
import { getSupabase } from '../lib/supabase';
import { uploadToBlob, deleteFromBlob, uniqueFilename } from './templateStorage';

// ----------------------------------------------------------------
// ナレッジ CRUD
// ----------------------------------------------------------------

export async function saveKnowledgeFromText(
  title: string,
  contentText: string
): Promise<KnowledgeMaterial> {
  const { data, error } = await getSupabase()
    .from('knowledge_materials')
    .insert({
      title,
      content_text: contentText,
      source_type: 'text',
    })
    .select()
    .single();

  if (error) throw new Error(`ナレッジの保存に失敗: ${error.message}`);
  return mapRow(data);
}

export async function saveKnowledgeFromFile(
  file: File,
  title: string
): Promise<KnowledgeMaterial> {
  const contentText = await file.text();
  const filename = uniqueFilename(file.name);
  const fileUrl = await uploadToBlob(file, `knowledge/${filename}`);

  const { data, error } = await getSupabase()
    .from('knowledge_materials')
    .insert({
      title,
      content_text: contentText,
      source_type: 'file',
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) {
    await deleteFromBlob([fileUrl]);
    throw new Error(`ナレッジの保存に失敗: ${error.message}`);
  }

  return mapRow(data);
}

export async function loadAllKnowledge(): Promise<KnowledgeMaterial[]> {
  const { data, error } = await getSupabase()
    .from('knowledge_materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`ナレッジの読み込みに失敗: ${error.message}`);
  return (data || []).map(mapRow);
}

export async function deleteKnowledge(id: string): Promise<void> {
  const { data, error: fetchError } = await getSupabase()
    .from('knowledge_materials')
    .select('file_url')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`ナレッジの取得に失敗: ${fetchError.message}`);

  if (data.file_url) {
    await deleteFromBlob([data.file_url]);
  }

  const { error: deleteError } = await getSupabase()
    .from('knowledge_materials')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`ナレッジの削除に失敗: ${deleteError.message}`);
}

// ----------------------------------------------------------------
// プロンプト注入用テキスト結合
// ----------------------------------------------------------------

const MAX_KNOWLEDGE_CHARS = 3000;

export function buildKnowledgeText(items: KnowledgeMaterial[]): string | undefined {
  if (items.length === 0) return undefined;
  const combined = items
    .map((k) => `【${k.title}】\n${k.contentText}`)
    .join('\n\n---\n\n');
  if (combined.length <= MAX_KNOWLEDGE_CHARS) return combined;
  return combined.slice(0, MAX_KNOWLEDGE_CHARS) + '\n\n（以降省略）';
}

// ----------------------------------------------------------------
// 内部ユーティリティ
// ----------------------------------------------------------------

function mapRow(row: any): KnowledgeMaterial {
  return {
    id: row.id,
    title: row.title,
    contentText: row.content_text,
    sourceType: row.source_type,
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}
