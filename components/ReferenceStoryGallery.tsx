import React, { useRef, useState, useCallback } from 'react';
import { ReferenceStory } from '../types';
import { saveReferenceStory, deleteReferenceStory } from '../utils/referenceStoryStorage';

interface ReferenceStoryGalleryProps {
  referenceStories: ReferenceStory[];
  selectedReferenceId: string | null;
  onSelect: (id: string | null) => void;
  onReferenceStoriesChange: (stories: ReferenceStory[]) => void;
}

export const ReferenceStoryGallery: React.FC<ReferenceStoryGalleryProps> = ({
  referenceStories,
  selectedReferenceId,
  onSelect,
  onReferenceStoriesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const processFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setIsUploading(true);
    const total = fileList.length;
    const newStories: ReferenceStory[] = [];

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      try {
        setUploadStatus({ current: i + 1, total });
        const name = file.name.replace(/\.[^.]+$/, '');
        const story = await saveReferenceStory(file, name);
        newStories.push(story);
      } catch (err) {
        console.error('参考ストーリーズのアップロードに失敗:', err);
      }
    }

    setUploadStatus(null);
    if (newStories.length > 0) {
      onReferenceStoriesChange([...newStories, ...referenceStories]);
    }
    setIsUploading(false);
  }, [referenceStories, onReferenceStoriesChange]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (isUploading) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  }, [isUploading, processFiles]);

  const handleDelete = async (id: string) => {
    try {
      await deleteReferenceStory(id);
      onReferenceStoriesChange(referenceStories.filter(s => s.id !== id));
      if (selectedReferenceId === id) onSelect(null);
    } catch (err) {
      console.error('参考ストーリーズの削除に失敗:', err);
    }
  };

  return (
    <div className="space-y-3 outline-none" tabIndex={0} onPaste={handlePaste}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          参考ストーリーズを選択
          <span className="text-[10px] text-slate-500 font-normal ml-1">Ctrl+Vで貼り付け</span>
        </h3>
        {referenceStories.length > 0 && (
          <button
            onClick={() => setShowManage(!showManage)}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            {showManage ? '閉じる' : '管理'}
          </button>
        )}
      </div>

      {/* アップロード進捗バナー */}
      {uploadStatus && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span>アップロード中...</span>
            <span>{uploadStatus.current}/{uploadStatus.total}枚</span>
          </div>
          <div className="w-full h-1.5 bg-amber-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((uploadStatus.current / uploadStatus.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 横スクロールギャラリー */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {/* 追加ボタン */}
        <label className="flex-shrink-0 w-20 h-[142px] rounded-2xl border-2 border-dashed border-slate-600 hover:border-amber-400 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-800/50 group">
          {isUploading ? (
            <svg className="animate-spin w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <svg className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] text-slate-500 group-hover:text-amber-400 mt-1 transition-colors">追加</span>
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

        {/* 参考ストーリーズサムネイル */}
        {referenceStories.map(story => (
          <div key={story.id} className="flex-shrink-0 relative group">
            <button
              onClick={() => onSelect(selectedReferenceId === story.id ? null : story.id)}
              className={`w-20 h-[142px] rounded-2xl overflow-hidden transition-all ${
                selectedReferenceId === story.id
                  ? 'ring-[3px] ring-amber-500 border-2 border-amber-500 shadow-lg shadow-amber-500/20'
                  : 'border-2 border-slate-700 hover:border-slate-500'
              }`}
            >
              <img
                src={story.thumbnailUrl}
                alt={story.name}
                className="w-full h-full object-cover"
              />
            </button>
            {/* ホバー時の削除ボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(story.id); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full items-center justify-center text-white text-[10px] transition-all opacity-0 group-hover:opacity-100 hidden group-hover:flex"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 選択中の表示 */}
      {selectedReferenceId && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          この参考ストーリーズのデザインを再現して生成します
        </div>
      )}

      {/* 管理パネル */}
      {showManage && referenceStories.length > 0 && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">登録済み参考ストーリーズ</p>
          {referenceStories.map(story => (
            <div key={story.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
              <img src={story.thumbnailUrl} alt={story.name} className="w-8 h-14 object-cover rounded-lg flex-shrink-0" />
              <span className="text-sm text-slate-300 flex-1 truncate">{story.name}</span>
              <span className="text-[10px] text-slate-500">
                {new Date(story.createdAt).toLocaleDateString('ja-JP')}
              </span>
              <button
                onClick={() => handleDelete(story.id)}
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
