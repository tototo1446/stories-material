
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
