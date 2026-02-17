
import React from 'react';
import { GeneratedImage, BrandConfig } from '../types';

interface EditPaletteProps {
  image: GeneratedImage;
  onUpdate: (updates: Partial<GeneratedImage['settings']>) => void;
  brand: BrandConfig;
}

export const EditPalette: React.FC<EditPaletteProps> = ({ image, onUpdate, brand }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        エディット・パレット
      </h3>

      <div className="space-y-8">
        {/* Brand Overlay Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">ブランドカラー適用</label>
          <button
            onClick={() => onUpdate({ brandOverlay: !image.settings.brandOverlay })}
            className={`w-12 h-6 rounded-full transition-colors relative ${image.settings.brandOverlay ? 'bg-indigo-600' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${image.settings.brandOverlay ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Logo Overlay Toggle */}
        {brand.logoUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-300">ロゴ画像挿入</label>
                <p className="text-[10px] text-slate-500">画像上にロゴを配置</p>
              </div>
              <button
                onClick={() => onUpdate({
                  logoOverlay: {
                    ...(image.settings.logoOverlay || { visible: false, x: 50, y: 85, scale: 1.0 }),
                    visible: !(image.settings.logoOverlay?.visible),
                  },
                })}
                className={`w-12 h-6 rounded-full transition-colors relative ${image.settings.logoOverlay?.visible ? 'bg-indigo-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${image.settings.logoOverlay?.visible ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {image.settings.logoOverlay?.visible && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-300">ロゴサイズ</label>
                  <span className="text-xs text-slate-400 font-mono">{Math.round((image.settings.logoOverlay?.scale || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={Math.round((image.settings.logoOverlay?.scale || 1.0) * 100)}
                  onChange={(e) => onUpdate({
                    logoOverlay: {
                      ...(image.settings.logoOverlay || { visible: true, x: 50, y: 10, scale: 0.3 }),
                      scale: parseInt(e.target.value) / 100,
                    },
                  })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Blur Slider */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-slate-300">ぼかし強度</label>
            <span className="text-xs text-slate-400 font-mono">{image.settings.blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={image.settings.blur}
            onChange={(e) => onUpdate({ blur: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Brightness Slider */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-slate-300">明度調整</label>
            <span className="text-xs text-slate-400 font-mono">{image.settings.brightness}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={image.settings.brightness}
            onChange={(e) => onUpdate({ brightness: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Text Overlay Controls */}
        <div className="pt-6 border-t border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">テキスト表示</label>
            <button
              onClick={() => onUpdate({
                textOverlay: {
                  ...image.settings.textOverlay,
                  textVisible: !image.settings.textOverlay.textVisible,
                },
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${image.settings.textOverlay.textVisible ? 'bg-indigo-600' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${image.settings.textOverlay.textVisible ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {image.settings.textOverlay.textVisible && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">テキスト内容</label>
                <textarea
                  value={image.settings.textOverlay.textContent}
                  onChange={(e) => onUpdate({
                    textOverlay: {
                      ...image.settings.textOverlay,
                      textContent: e.target.value,
                    },
                  })}
                  className="w-full h-20 bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="スライドに表示するテキスト..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-300">文字サイズ</label>
                  <span className="text-xs text-slate-400 font-mono">{image.settings.textOverlay.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="48"
                  step="1"
                  value={image.settings.textOverlay.fontSize}
                  onChange={(e) => onUpdate({
                    textOverlay: {
                      ...image.settings.textOverlay,
                      fontSize: parseInt(e.target.value),
                    },
                  })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">文字色</label>
                <div className="flex gap-2">
                  {['#FFFFFF', '#000000', '#F59E0B', '#EF4444', '#10B981'].map(c => (
                    <button
                      key={c}
                      onClick={() => onUpdate({
                        textOverlay: {
                          ...image.settings.textOverlay,
                          textColor: c,
                        },
                      })}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        image.settings.textOverlay.textColor === c
                          ? 'border-indigo-400 scale-110'
                          : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Brand Info Preview */}
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Current Brand</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: brand.primaryColor }} />
            <div>
              <p className="text-sm font-medium text-slate-200">{brand.primaryColor}</p>
              <p className="text-[10px] text-slate-500">{brand.fontPreference}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
