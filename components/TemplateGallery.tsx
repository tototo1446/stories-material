import React, { useRef, useState } from 'react';
import { TemplateImage } from '../types';
import { saveTemplate, deleteTemplate } from '../utils/templateStorage';

interface TemplateGalleryProps {
  templates: TemplateImage[];
  selectedTemplateId: string | null;
  onSelect: (id: string | null) => void;
  onTemplatesChange: (templates: TemplateImage[]) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
  onTemplatesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newTemplates: TemplateImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const name = file.name.replace(/\.[^.]+$/, '');
        const template = await saveTemplate(file, name);
        newTemplates.push(template);
      } catch (err) {
        console.error('テンプレートのアップロードに失敗:', err);
      }
    }

    if (newTemplates.length > 0) {
      onTemplatesChange([...newTemplates, ...templates]);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      onTemplatesChange(templates.filter(t => t.id !== id));
      if (selectedTemplateId === id) onSelect(null);
    } catch (err) {
      console.error('テンプレートの削除に失敗:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          素材画像を選択
        </h3>
        {templates.length > 0 && (
          <button
            onClick={() => setShowManage(!showManage)}
            className="text-xs text-slate-400 hover:text-pink-400 transition-colors"
          >
            {showManage ? '閉じる' : '管理'}
          </button>
        )}
      </div>

      {/* 横スクロールギャラリー */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {/* 追加ボタン */}
        <label className="flex-shrink-0 w-20 h-[142px] rounded-2xl border-2 border-dashed border-slate-600 hover:border-pink-400 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-800/50 group">
          {isUploading ? (
            <svg className="animate-spin w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <svg className="w-6 h-6 text-slate-500 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] text-slate-500 group-hover:text-pink-400 mt-1 transition-colors">追加</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        {/* テンプレートサムネイル */}
        {templates.map(tmpl => (
          <div key={tmpl.id} className="flex-shrink-0 relative group">
            <button
              onClick={() => onSelect(selectedTemplateId === tmpl.id ? null : tmpl.id)}
              className={`w-20 h-[142px] rounded-2xl overflow-hidden transition-all ${
                selectedTemplateId === tmpl.id
                  ? 'ring-[3px] ring-pink-500 border-2 border-pink-500 shadow-lg shadow-pink-500/20'
                  : 'border-2 border-slate-700 hover:border-slate-500'
              }`}
            >
              <img
                src={tmpl.thumbnailUrl}
                alt={tmpl.name}
                className="w-full h-full object-cover"
              />
            </button>
            {/* ホバー時の削除ボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full items-center justify-center text-white text-[10px] transition-all opacity-0 group-hover:opacity-100 hidden group-hover:flex"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 選択中の表示 */}
      {selectedTemplateId && (
        <div className="flex items-center gap-2 text-xs text-pink-400 bg-pink-500/10 px-3 py-2 rounded-xl border border-pink-500/20">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          素材画像を背景として使用します（AI生成をスキップ）
        </div>
      )}

      {/* 管理パネル */}
      {showManage && templates.length > 0 && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">登録済み素材</p>
          {templates.map(tmpl => (
            <div key={tmpl.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
              <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-8 h-14 object-cover rounded-lg flex-shrink-0" />
              <span className="text-sm text-slate-300 flex-1 truncate">{tmpl.name}</span>
              <span className="text-[10px] text-slate-500">
                {new Date(tmpl.createdAt).toLocaleDateString('ja-JP')}
              </span>
              <button
                onClick={() => handleDelete(tmpl.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
