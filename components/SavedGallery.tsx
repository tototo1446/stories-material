import React, { useState } from 'react';
import { SavedImage } from '../types';
import { downloadImage } from '../utils/imageDownload';
import { deleteSavedImage } from '../utils/generatedImageStorage';

interface SavedGalleryProps {
  images: SavedImage[];
  onImagesChange: React.Dispatch<React.SetStateAction<SavedImage[]>>;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SavedGallery: React.FC<SavedGalleryProps> = ({ images, onImagesChange, onToast }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = async (image: SavedImage) => {
    try {
      const ext = image.imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'png';
      const filename = `saved-story-${image.slideNumber || 1}.${ext}`;
      await downloadImage(image.imageUrl, filename);
      onToast('画像をダウンロードしました。', 'success');
    } catch {
      onToast('ダウンロードに失敗しました。', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteSavedImage(id);
      onImagesChange(prev => prev.filter(img => img.id !== id));
      onToast('画像を削除しました。', 'success');
    } catch {
      onToast('削除に失敗しました。', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-[40px] p-24 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-white mb-2">保存済み画像はありません</h4>
          <p className="text-slate-400">画像を生成すると、自動的にここに保存されます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map(image => (
        <div key={image.id} className="group relative">
          <div className="instagram-aspect rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-slate-600 transition-all">
            <img
              src={image.thumbnailUrl}
              alt={image.prompt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => handleDownload(image)}
                className="w-10 h-10 bg-white/90 hover:bg-white rounded-xl flex items-center justify-center text-slate-900 transition-colors"
                title="ダウンロード"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(image.id)}
                disabled={deletingId === image.id}
                className="w-10 h-10 bg-red-500/90 hover:bg-red-500 disabled:opacity-50 rounded-xl flex items-center justify-center text-white transition-colors"
                title="削除"
              >
                {deletingId === image.id ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-slate-500 truncate">{image.originalMessage || image.prompt}</p>
            <p className="text-[10px] text-slate-600">{new Date(image.createdAt).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
