import React, { useState, useRef } from 'react';
import { KnowledgeMaterial } from '../types';
import {
  saveKnowledgeFromText,
  saveKnowledgeFromFile,
  deleteKnowledge,
} from '../utils/knowledgeStorage';

interface KnowledgeManagerProps {
  knowledgeItems: KnowledgeMaterial[];
  onKnowledgeChange: React.Dispatch<React.SetStateAction<KnowledgeMaterial[]>>;
  onToast: (message: string, type: 'success' | 'error', duration?: number) => void;
}

export function KnowledgeManager({
  knowledgeItems,
  onKnowledgeChange,
  onToast,
}: KnowledgeManagerProps) {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [titleInput, setTitleInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitText = async () => {
    if (!titleInput.trim() || !textInput.trim()) {
      onToast('タイトルとナレッジ内容を入力してください。', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const saved = await saveKnowledgeFromText(titleInput.trim(), textInput.trim());
      onKnowledgeChange((prev) => [saved, ...prev]);
      setTitleInput('');
      setTextInput('');
      onToast('ナレッジを登録しました。', 'success');
    } catch (err) {
      console.error(err);
      onToast('ナレッジの登録に失敗しました。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFile = async () => {
    if (!titleInput.trim() || !selectedFile) {
      onToast('タイトルを入力し、ファイルを選択してください。', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const saved = await saveKnowledgeFromFile(selectedFile, titleInput.trim());
      onKnowledgeChange((prev) => [saved, ...prev]);
      setTitleInput('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onToast('ナレッジを登録しました。', 'success');
    } catch (err) {
      console.error(err);
      onToast('ナレッジの登録に失敗しました。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKnowledge(id);
      onKnowledgeChange((prev) => prev.filter((k) => k.id !== id));
      onToast('ナレッジを削除しました。', 'success');
    } catch {
      onToast('削除に失敗しました。', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            ナレッジ学習
          </h3>
          {knowledgeItems.length > 0 && (
            <span className="text-[10px] bg-indigo-600/50 text-indigo-200 px-2 py-0.5 rounded-full">
              {knowledgeItems.length}件
            </span>
          )}
        </div>
        {knowledgeItems.length > 0 && (
          <button
            onClick={() => setShowManage(!showManage)}
            className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showManage ? '閉じる' : '管理'}
          </button>
        )}
      </div>

      {/* 登録済みナレッジが反映される旨 */}
      {knowledgeItems.length > 0 && !showManage && (
        <p className="text-[10px] text-slate-500">
          登録済みナレッジが画像生成時に自動で反映されます
        </p>
      )}

      {/* 管理パネル */}
      {showManage && knowledgeItems.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {knowledgeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs flex-shrink-0">
                  {item.sourceType === 'file' ? '📄' : '✏️'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {item.contentText.length.toLocaleString()}文字
                    {item.fileName && ` / ${item.fileName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-[10px] text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 入力モード切替 */}
      <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
        <button
          onClick={() => setInputMode('text')}
          className={`flex-1 text-[10px] py-1.5 rounded-lg transition-colors ${
            inputMode === 'text'
              ? 'bg-slate-700 text-slate-200'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          テキスト入力
        </button>
        <button
          onClick={() => setInputMode('file')}
          className={`flex-1 text-[10px] py-1.5 rounded-lg transition-colors ${
            inputMode === 'file'
              ? 'bg-slate-700 text-slate-200'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          ファイル(.txt)
        </button>
      </div>

      {/* タイトル入力（共通） */}
      <input
        type="text"
        value={titleInput}
        onChange={(e) => setTitleInput(e.target.value)}
        placeholder="タイトル（例：ストーリーズ運用ノウハウ）"
        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
      />

      {/* テキスト入力モード */}
      {inputMode === 'text' && (
        <>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="ナレッジ内容を入力...&#10;&#10;例：&#10;・ストーリーズは最初の1枚で注意を引くことが最重要&#10;・背景は暗めにして文字を白で大きく表示すると視認性が高い&#10;・CTAは必ず最後のスライドに配置する"
            rows={4}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
          />
          <button
            onClick={handleSubmitText}
            disabled={isSubmitting || !titleInput.trim() || !textInput.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs py-2 rounded-xl transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録'}
          </button>
        </>
      )}

      {/* ファイルアップロードモード */}
      {inputMode === 'file' && (
        <>
          <label className="block w-full cursor-pointer">
            <div className="w-full border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-slate-500 transition-colors">
              <p className="text-xs text-slate-400">
                {selectedFile
                  ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)}KB)`
                  : '.txt ファイルをクリックして選択'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
          </label>
          <button
            onClick={handleSubmitFile}
            disabled={isSubmitting || !titleInput.trim() || !selectedFile}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs py-2 rounded-xl transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録'}
          </button>
        </>
      )}
    </div>
  );
}
