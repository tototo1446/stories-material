
import React from 'react';

export const InstagramOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10">
      {/* Top Profile Area */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm" />
        <div className="h-4 w-24 bg-white/20 rounded border border-white/30 backdrop-blur-sm" />
      </div>
      
      {/* Top Close Icon Area */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/20 border border-white/30 backdrop-blur-sm">
        <span className="text-white text-xs">✕</span>
      </div>

      {/* Center Guide (Invisible but represents text area) */}
      <div className="absolute top-[15%] bottom-[20%] left-[10%] right-[10%] border border-dashed border-white/10 flex items-center justify-center">
        <span className="text-white/20 font-bold text-xs uppercase tracking-widest">Text Area</span>
      </div>

      {/* Bottom Interaction Bar */}
      <div className="absolute bottom-6 left-4 right-16 h-10 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center px-4">
        <span className="text-white/40 text-sm">メッセージを送信...</span>
      </div>
      <div className="absolute bottom-6 right-4 w-10 h-10 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center">
        <span className="text-white/60">♡</span>
      </div>
    </div>
  );
};
