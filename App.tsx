
import React, { useState, useEffect } from 'react';
import { StoryGoal, Atmosphere, BrandConfig, GeneratedImage } from './types';
import { GOAL_OPTIONS, ATMOSPHERE_OPTIONS, SAMPLE_SCRIPTS, FONT_MAP, DEFAULT_FONT } from './constants';
import { generateStoryBackgrounds } from './services/imageGenerationService';
import { EditPalette } from './components/EditPalette';
import { InstagramOverlay } from './components/InstagramOverlay';
import { TextOverlay } from './components/TextOverlay';
import { GeneratingOverlay } from './components/GeneratingOverlay';
import { ErrorToast, ToastMessage } from './components/ErrorToast';
import { downloadImage, downloadAllImages } from './utils/imageDownload';
import { saveBrandConfig, loadBrandConfig } from './utils/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'brand'>('dashboard');
  const [scriptInput, setScriptInput] = useState('');
  const [theme, setTheme] = useState('');
  const [goal, setGoal] = useState<StoryGoal>(StoryGoal.EMPATHY);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(Atmosphere.MINIMAL);
  const [brand, setBrand] = useState<BrandConfig>({
    logoUrl: '',
    primaryColor: '#6366f1',
    fontPreference: 'Noto Sans JP Bold'
  });
  
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [currentSlide, setCurrentSlide] = useState<{ current: number; total: number } | null>(null);

  // 開発環境での環境変数確認
  useEffect(() => {
    if (import.meta.env.DEV) {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

      console.log('環境変数の読み込み状況:', {
        geminiApiKey: geminiApiKey ? `${geminiApiKey.substring(0, 10)}...` : '未設定',
      });

      if (!geminiApiKey) {
        console.warn('⚠️  VITE_GEMINI_API_KEYが設定されていません。Gemini APIを使用できません。');
      }
    }
  }, []);

  // ブランド設定の読み込み
  useEffect(() => {
    const savedBrand = loadBrandConfig();
    if (savedBrand) {
      setBrand(savedBrand);
    }
  }, []);

  // ブランド設定の自動保存
  useEffect(() => {
    if (brand.primaryColor !== '#6366f1' || brand.fontPreference !== 'Noto Sans JP Bold' || brand.logoUrl !== '') {
      saveBrandConfig(brand);
    }
  }, [brand]);

  const handleGenerate = async () => {
    if (!scriptInput && !theme) {
      setToast({
        id: Date.now().toString(),
        message: '台本またはテーマを入力してください。',
        type: 'error',
      });
      return;
    }

    setIsGenerating(true);
    setProgressMessage('画像生成を開始しています...');
    setCurrentSlide(null);
    setToast(null);

    try {
      const newImages = await generateStoryBackgrounds(
        scriptInput,
        theme,
        goal,
        atmosphere,
        brand.primaryColor,
        undefined,
        {
          onProgress: (message) => {
            setProgressMessage(message);
          },
          onSlideGenerated: (current, total) => {
            setCurrentSlide({ current, total });
          },
        }
      );

      if (newImages.length === 0) {
        setToast({
          id: Date.now().toString(),
          message: '画像が生成されませんでした。もう一度お試しください。',
          type: 'error',
        });
      } else {
        setGeneratedImages(prev => [...newImages, ...prev]);
        setSelectedImageId(newImages[0].id);
        setToast({
          id: Date.now().toString(),
          message: `${newImages.length}枚の背景画像を生成しました！`,
          type: 'success',
        });
      }
    } catch (error) {
      console.error('画像生成エラー:', error);
      let errorMessage = '画像生成に失敗しました。';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // ネットワークエラーの場合は具体的な対処法を提示
        if (errorMessage.includes('接続できません') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Gemini APIに接続できません。\nネットワーク接続とAPIキーの設定を確認してください。';
        }
      }
      
      setToast({
        id: Date.now().toString(),
        message: errorMessage,
        type: 'error',
        duration: 10000,
      });
    } finally {
      setIsGenerating(false);
      setProgressMessage('');
      setCurrentSlide(null);
    }
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const slideNum = image.slideNumber || 1;
      const mimeMatch = image.url.match(/^data:image\/(png|jpeg|jpg|gif|webp)/i);
      const urlMatch = image.url.match(/\.(jpg|jpeg|png|gif|webp)/i);
      const extension = mimeMatch ? (mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]) : urlMatch?.[1] || 'png';
      const filename = `story-background-slide-${slideNum}.${extension}`;
      await downloadImage(image.url, filename);
      setToast({
        id: Date.now().toString(),
        message: '画像をダウンロードしました。',
        type: 'success',
      });
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      setToast({
        id: Date.now().toString(),
        message: '画像のダウンロードに失敗しました。',
        type: 'error',
      });
    }
  };

  const handleDownloadAll = async () => {
    if (generatedImages.length === 0) return;

    try {
      setToast({
        id: Date.now().toString(),
        message: 'すべての画像をダウンロードしています...',
        type: 'info',
      });
      await downloadAllImages(generatedImages);
      setToast({
        id: Date.now().toString(),
        message: `${generatedImages.length}枚の画像をダウンロードしました。`,
        type: 'success',
      });
    } catch (error) {
      console.error('一括ダウンロードエラー:', error);
      setToast({
        id: Date.now().toString(),
        message: '一部の画像のダウンロードに失敗しました。',
        type: 'error',
      });
    }
  };

  const updateImageSettings = (id: string, updates: Partial<GeneratedImage['settings']>) => {
    setGeneratedImages(prev => prev.map(img => 
      img.id === id ? { ...img, settings: { ...img.settings, ...updates } } : img
    ));
  };

  const selectedImage = generatedImages.find(img => img.id === selectedImageId);

  const handleLoadScript = (script: (typeof SAMPLE_SCRIPTS)[0]) => {
    setScriptInput(script.pages.join('\n'));
    setTheme(script.title);
    setGoal(script.goal);
    setAtmosphere(script.atmosphere);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f172a] text-slate-200">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-20 lg:w-64 bg-slate-900 border-r border-slate-800 p-4 md:p-6 flex flex-col gap-8 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden lg:block">
            StoryCanvas AI
          </h1>
        </div>

        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="hidden lg:block font-medium">生成ダッシュボード</span>
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'brand' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            <span className="hidden lg:block font-medium">ブランドプリセット</span>
          </button>
        </nav>

        <div className="mt-auto hidden lg:block p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">残り生成可能枚数</p>
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-indigo-500 rounded-full" />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Free Plan: 142 / 200</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar">
        {activeTab === 'dashboard' ? (
          <div className="p-4 md:p-8 lg:p-12 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Controls Column */}
              <div className="lg:col-span-4 space-y-8">
                <header>
                  <h2 className="text-3xl font-bold text-white mb-2">背景素材を生成</h2>
                  <p className="text-slate-400">文字を載せる余白をAIが自動計算します。</p>
                </header>

                <div className="space-y-6 bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-semibold text-slate-300">台本を入力</label>
                      <button 
                        onClick={() => handleLoadScript(SAMPLE_SCRIPTS[0])}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md text-slate-300 transition-colors"
                      >
                        サンプル読込
                      </button>
                    </div>
                    <textarea
                      value={scriptInput}
                      onChange={(e) => setScriptInput(e.target.value)}
                      placeholder="ストーリーズの各ページの内容を1行ずつ入力..."
                      className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">テーマ・キーワード</label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="例：モダンなオフィス, 朝のカフェ, 抽象的な波..."
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">ストーリーの目的</label>
                      <select
                        value={goal}
                        onChange={(e) => setGoal(e.target.value as StoryGoal)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none"
                      >
                        {GOAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">雰囲気</label>
                      <select
                        value={atmosphere}
                        onChange={(e) => setAtmosphere(e.target.value as Atmosphere)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none"
                      >
                        {ATMOSPHERE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!theme && !scriptInput)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 group"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {currentSlide ? `生成中... (${currentSlide.current}/${currentSlide.total})` : '生成中...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        「文字入れ専用」背景を生成
                      </>
                    )}
                  </button>
                </div>

                {selectedImage && (
                  <EditPalette 
                    image={selectedImage} 
                    onUpdate={(updates) => updateImageSettings(selectedImage.id, updates)}
                    brand={brand}
                  />
                )}
              </div>

              {/* Preview Column */}
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                    プレビュー & 調整
                  </h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showOverlay ? 'bg-slate-700 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Instagram UIガイド
                    </button>
                  </div>
                </div>

                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    {/* Active Preview */}
                    <div className="relative group">
                      <div className="instagram-aspect rounded-[40px] overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">
                        {/* Layer 1: Filtered background */}
                        <div
                          className="absolute inset-0"
                          style={{
                            filter: `blur(${selectedImage?.settings.blur || 0}px) brightness(${selectedImage?.settings.brightness || 100}%)`,
                          }}
                        >
                          {selectedImage ? (
                            <>
                              <img src={selectedImage.url} alt="Preview" className="w-full h-full object-cover" />
                              {selectedImage.settings.brandOverlay && (
                                <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30" style={{ backgroundColor: brand.primaryColor }} />
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-slate-500">
                              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <p className="text-sm">画像が生成されるとここに表示されます</p>
                            </div>
                          )}
                        </div>

                        {/* Layer 2: Text overlay (unfiltered) */}
                        {selectedImage?.settings.textOverlay && (
                          <TextOverlay
                            textOverlay={selectedImage.settings.textOverlay}
                            fontPreference={brand.fontPreference}
                          />
                        )}

                        {/* Layer 3: Instagram guide (unfiltered) */}
                        {showOverlay && <InstagramOverlay />}
                      </div>
                      
                      {selectedImage && (
                        <div className="mt-6 flex gap-4">
                          <button
                            onClick={() => handleDownloadImage(selectedImage)}
                            className="flex-1 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            背景を保存
                          </button>
                          {generatedImages.length > 1 && (
                            <button
                              onClick={handleDownloadAll}
                              className="px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              すべて保存
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* History Sidebar */}
                    <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest sticky top-0 bg-[#0f172a] py-2 z-10">履歴</p>
                      {generatedImages.map(img => (
                        <div 
                          key={img.id}
                          onClick={() => setSelectedImageId(img.id)}
                          className={`relative instagram-aspect w-32 md:w-full max-w-[240px] mx-auto rounded-3xl overflow-hidden cursor-pointer transition-all border-2 ${selectedImageId === img.id ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-[40px] p-24 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">生成を始めましょう</h4>
                      <p className="text-slate-400">台本を入力して、ブランドに合わせた最適な「文字入れ専用」背景を作成します。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 lg:p-12 max-w-4xl">
            <header className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-2">ブランドプリセット設定</h2>
              <p className="text-slate-400">一貫性のあるデザインを維持するための初期設定です。</p>
            </header>

            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                  <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    メインカラー (HEX)
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl shadow-xl shadow-black/20 shrink-0 border-2 border-slate-700" style={{ backgroundColor: brand.primaryColor }} />
                    <div className="flex-1 space-y-4">
                      <input 
                        type="text" 
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#000000', '#ffffff'].map(c => (
                          <button 
                            key={c}
                            onClick={() => setBrand({ ...brand, primaryColor: c })}
                            className="w-6 h-6 rounded-full border border-white/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                  <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    ロゴアップロード
                  </h4>
                  {brand.logoUrl ? (
                    <div className="relative border-2 border-slate-700 rounded-2xl h-32 flex items-center justify-center bg-slate-900/50">
                      <img src={brand.logoUrl} alt="Logo" className="max-h-24 max-w-full object-contain" />
                      <button
                        onClick={() => setBrand({ ...brand, logoUrl: '' })}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-700 rounded-2xl h-32 flex flex-col items-center justify-center hover:bg-slate-700/50 transition-colors cursor-pointer group">
                      <svg className="w-8 h-8 text-slate-500 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>
                      <p className="text-xs text-slate-500">透過PNG推奨</p>
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setBrand({ ...brand, logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                <h4 className="text-lg font-bold mb-6">定型フォント指示</h4>
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    {Object.keys(FONT_MAP).map(label => (
                      <button
                        key={label}
                        onClick={() => setBrand({ ...brand, fontPreference: label })}
                        className={`px-6 py-3 rounded-2xl border text-sm transition-all ${brand.fontPreference === label ? 'bg-white text-slate-900 font-bold border-white' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="p-6 bg-slate-900 rounded-2xl">
                    <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest font-bold">Preview Text</p>
                    {(() => {
                      const current = FONT_MAP[brand.fontPreference] || DEFAULT_FONT;
                      return (
                        <p className="text-4xl" style={{ fontFamily: current.family, fontWeight: current.weight }}>
                          The quick brown fox jumps over the lazy dog.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button className="px-8 py-3 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors">キャンセル</button>
                <button 
                  onClick={() => {
                    saveBrandConfig(brand);
                    setActiveTab('dashboard');
                    setToast({
                      id: Date.now().toString(),
                      message: 'ブランド設定を保存しました。',
                      type: 'success',
                    });
                  }}
                  className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                >
                  設定を保存して生成へ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Generating Overlay */}
      <GeneratingOverlay
        isVisible={isGenerating}
        message={progressMessage}
        progress={currentSlide ?? undefined}
      />

      {/* Toast Notification */}
      <ErrorToast message={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default App;
