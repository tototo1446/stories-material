import React, { useRef, useEffect, useState, useCallback } from 'react';

interface InpaintingCanvasProps {
  imageUrl: string;
  onApply: (maskDataUrl: string, instruction: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const InpaintingCanvas: React.FC<InpaintingCanvasProps> = ({
  imageUrl,
  onApply,
  onCancel,
  disabled,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [hasMask, setHasMask] = useState(false);

  const MASK_W = 1080;
  const MASK_H = 1920;
  const BRUSH_SIZE = 30;

  // 表示キャンバスの初期化
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const container = containerRef.current;
    if (!displayCanvas || !container) return;

    const rect = container.getBoundingClientRect();
    displayCanvas.width = rect.width;
    displayCanvas.height = rect.height;

    const img = new Image();
    img.onload = () => {
      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, displayCanvas.width, displayCanvas.height);
    };
    img.src = imageUrl;

    // マスクキャンバス初期化（オフスクリーン）
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = MASK_W;
      maskCanvas.height = MASK_H;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, MASK_W, MASK_H);
      }
    }
  }, [imageUrl]);

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      displayX: clientX - rect.left,
      displayY: clientY - rect.top,
      maskX: ((clientX - rect.left) / rect.width) * MASK_W,
      maskY: ((clientY - rect.top) / rect.height) * MASK_H,
    };
  }, []);

  const drawBrush = useCallback((displayX: number, displayY: number, maskX: number, maskY: number) => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!displayCanvas || !maskCanvas) return;

    // 表示キャンバスに赤い半透明を描画
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      displayCtx.fillStyle = 'rgba(255, 0, 0, 0.35)';
      displayCtx.beginPath();
      const displayBrush = (BRUSH_SIZE / MASK_W) * displayCanvas.width;
      displayCtx.arc(displayX, displayY, displayBrush, 0, Math.PI * 2);
      displayCtx.fill();
    }

    // マスクキャンバスに白を描画
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = '#ffffff';
      maskCtx.beginPath();
      maskCtx.arc(maskX, maskY, BRUSH_SIZE, 0, Math.PI * 2);
      maskCtx.fill();
    }

    setHasMask(true);
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    if (pos) drawBrush(pos.displayX, pos.displayY, pos.maskX, pos.maskY);
  }, [getCanvasPos, drawBrush]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (pos) drawBrush(pos.displayX, pos.displayY, pos.maskX, pos.maskY);
  }, [isDrawing, getCanvasPos, drawBrush]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!displayCanvas || !maskCanvas) return;

    // 表示キャンバスをリセット（元画像を再描画）
    const displayCtx = displayCanvas.getContext('2d');
    if (displayCtx) {
      const img = new Image();
      img.onload = () => {
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(img, 0, 0, displayCanvas.width, displayCanvas.height);
      };
      img.src = imageUrl;
    }

    // マスクをリセット
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, MASK_W, MASK_H);
    }

    setHasMask(false);
  }, [imageUrl]);

  const handleApply = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !instruction.trim()) return;
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    onApply(maskDataUrl, instruction.trim());
  }, [instruction, onApply]);

  return (
    <div className="space-y-4">
      {/* キャンバス */}
      <div
        ref={containerRef}
        className="instagram-aspect rounded-[40px] overflow-hidden bg-slate-900 border-4 border-indigo-500 relative cursor-crosshair select-none touch-none"
      >
        <canvas
          ref={displayCanvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {/* オフスクリーンマスク */}
        <canvas ref={maskCanvasRef} className="hidden" />
      </div>

      {/* 操作パネル */}
      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-3">
        <p className="text-xs text-slate-400">修正したい範囲をブラシで塗ってください（赤い部分が修正対象）</p>

        <button
          onClick={handleClear}
          disabled={disabled || !hasMask}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm text-slate-300 rounded-xl transition-colors"
        >
          塗りをクリア
        </button>

        <div>
          <label className="text-sm font-semibold text-slate-300 block mb-1">修正内容</label>
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="例：青い空に変更、文字を消す、花を追加..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={disabled}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleApply}
            disabled={disabled || !hasMask || !instruction.trim()}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {disabled ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                修正中...
              </>
            ) : '適用'}
          </button>
          <button
            onClick={onCancel}
            disabled={disabled}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};
