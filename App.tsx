
import React, { useState, useEffect, useRef } from 'react';
import { BrandConfig, BrandPreset, GeneratedImage, SavedImage, TemplateImage } from './types';
import { SAMPLE_SCRIPTS, FONT_MAP, DEFAULT_FONT } from './constants';
import { generateStoryBackgrounds } from './services/imageGenerationService';
import { EditPalette } from './components/EditPalette';
import { InstagramOverlay } from './components/InstagramOverlay';
import { TextOverlay } from './components/TextOverlay';
import { LogoOverlay } from './components/LogoOverlay';
import { GeneratingOverlay } from './components/GeneratingOverlay';
import { TemplateGallery } from './components/TemplateGallery';
import { SavedGallery } from './components/SavedGallery';
import { ErrorToast, ToastMessage } from './components/ErrorToast';
import { downloadImage, downloadAllImages, flattenImageForDownload } from './utils/imageDownload';
import { saveBrandPresets, loadBrandPresets, saveActivePresetId, loadActivePresetId, migrateOldBrandConfig } from './utils/storage';
import { loadAllTemplates } from './utils/templateStorage';
import { extractColorsFromImage } from './utils/colorExtraction';
import { saveGeneratedImage, loadSavedImages } from './utils/generatedImageStorage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'brand' | 'gallery'>('dashboard');
  const [message, setMessage] = useState('');
  const [atmosphereNote, setAtmosphereNote] = useState('');
  const [brand, setBrand] = useState<BrandConfig>({
    logoUrl: '',
    primaryColor: '#6366f1',
    fontPreference: 'Noto Sans JP Bold',
    useLogoColors: false,
    useLogoOverlay: false,
  });

  // プリセット管理
  const [brandPresets, setBrandPresets] = useState<BrandPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null); // null=新規, string=編集中
  const [editingPresetName, setEditingPresetName] = useState('');
  const [editingBrand, setEditingBrand] = useState<BrandConfig>({
    logoUrl: '',
    primaryColor: '#6366f1',
    fontPreference: 'Noto Sans JP Bold',
    useLogoColors: false,
    useLogoOverlay: false,
  });
  const [isEditingPreset, setIsEditingPreset] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [currentSlide, setCurrentSlide] = useState<{ current: number; total: number } | null>(null);
  const [templates, setTemplates] = useState<TemplateImage[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

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

  // プリセットの読み込み（マイグレーション含む）
  useEffect(() => {
    let presets = loadBrandPresets();
    if (presets.length === 0) {
      const migrated = migrateOldBrandConfig();
      if (migrated) {
        presets = [migrated];
        saveBrandPresets(presets);
        saveActivePresetId(migrated.id);
      }
    }
    setBrandPresets(presets);

    const savedActiveId = loadActivePresetId();
    if (savedActiveId) {
      const activePreset = presets.find(p => p.id === savedActiveId);
      if (activePreset) {
        setActivePresetId(activePreset.id);
        setBrand(activePreset.config);
      }
    } else if (presets.length > 0) {
      setActivePresetId(presets[0].id);
      setBrand(presets[0].config);
    }
  }, []);

  // ロゴがあるのにextractedColorsが無い場合、自動抽出
  useEffect(() => {
    if (brand.logoUrl && !brand.extractedColors) {
      extractColorsFromImage(brand.logoUrl)
        .then(extractedColors => {
          setBrand(prev => ({ ...prev, extractedColors }));
        })
        .catch(() => {});
    }
  }, [brand.logoUrl, brand.extractedColors]);

  // テンプレートの読み込み
  useEffect(() => {
    loadAllTemplates()
      .then(setTemplates)
      .catch(console.error);
  }, []);

  // 保存済み画像の読み込み
  useEffect(() => {
    loadSavedImages()
      .then(setSavedImages)
      .catch(console.error);
  }, []);

  // プリセット選択ハンドラ
  const handleSelectPreset = (presetId: string) => {
    if (!presetId) {
      setActivePresetId(null);
      saveActivePresetId(null);
      setBrand({
        logoUrl: '',
        primaryColor: '#6366f1',
        fontPreference: 'Noto Sans JP Bold',
        useLogoColors: false,
        useLogoOverlay: false,
      });
      return;
    }
    const preset = brandPresets.find(p => p.id === presetId);
    if (preset) {
      setActivePresetId(preset.id);
      setBrand(preset.config);
      saveActivePresetId(preset.id);
    }
  };

  // プリセット編集開始
  const handleStartEditPreset = (preset: BrandPreset) => {
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name);
    setEditingBrand({ ...preset.config });
    setIsEditingPreset(true);
  };

  // 新規プリセット作成開始
  const handleStartNewPreset = () => {
    setEditingPresetId(null);
    setEditingPresetName('');
    setEditingBrand({
      logoUrl: '',
      primaryColor: '#6366f1',
      fontPreference: 'Noto Sans JP Bold',
      useLogoColors: false,
      useLogoOverlay: false,
    });
    setIsEditingPreset(true);
  };

  // プリセット保存
  const handleSavePreset = () => {
    const now = Date.now();
    let updatedPresets: BrandPreset[];

    if (editingPresetId) {
      // 既存プリセットの更新
      updatedPresets = brandPresets.map(p =>
        p.id === editingPresetId
          ? { ...p, name: editingPresetName || p.name, config: { ...editingBrand }, updatedAt: now }
          : p
      );
      // アクティブなプリセットを編集した場合、brandも更新
      if (activePresetId === editingPresetId) {
        setBrand({ ...editingBrand });
      }
    } else {
      // 新規プリセット
      const newPreset: BrandPreset = {
        id: `preset-${now}`,
        name: editingPresetName || `プリセット ${brandPresets.length + 1}`,
        config: { ...editingBrand },
        createdAt: now,
        updatedAt: now,
      };
      updatedPresets = [...brandPresets, newPreset];
      // プリセットが無かった場合、自動的にアクティブに
      if (brandPresets.length === 0) {
        setActivePresetId(newPreset.id);
        setBrand({ ...editingBrand });
        saveActivePresetId(newPreset.id);
      }
    }

    setBrandPresets(updatedPresets);
    saveBrandPresets(updatedPresets);
    setIsEditingPreset(false);
    showToast('ブランドプリセットを保存しました。', 'success');
  };

  // プリセット削除
  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = brandPresets.filter(p => p.id !== presetId);
    setBrandPresets(updatedPresets);
    saveBrandPresets(updatedPresets);

    if (activePresetId === presetId) {
      if (updatedPresets.length > 0) {
        setActivePresetId(updatedPresets[0].id);
        setBrand(updatedPresets[0].config);
        saveActivePresetId(updatedPresets[0].id);
      } else {
        setActivePresetId(null);
        saveActivePresetId(null);
        setBrand({
          logoUrl: '',
          primaryColor: '#6366f1',
          fontPreference: 'Noto Sans JP Bold',
          useLogoColors: false,
          useLogoOverlay: false,
        });
      }
    }

    if (editingPresetId === presetId) {
      setIsEditingPreset(false);
    }

    showToast('プリセットを削除しました。', 'info');
  };

  // 編集用ロゴアップロード
  const handleEditingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const logoUrl = reader.result as string;
      try {
        const extractedColors = await extractColorsFromImage(logoUrl);
        setEditingBrand(prev => ({
          ...prev,
          logoUrl,
          extractedColors,
          primaryColor: extractedColors.dominant,
        }));
        showToast('ロゴからカラーパレットを抽出しました。', 'success');
      } catch {
        setEditingBrand(prev => ({ ...prev, logoUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const showToast = (message: string, type: 'success' | 'error' | 'info', duration?: number) => {
    setToast({ id: Date.now().toString(), message, type, duration });
  };

  const handleGenerate = async () => {
    if (!message) {
      showToast('描きたいメッセージを入力してください。', 'error');
      return;
    }

    setIsGenerating(true);
    setProgressMessage('画像生成を開始しています...');
    setCurrentSlide(null);
    setToast(null);

    try {
      const logoPalette = brand.useLogoColors && brand.extractedColors
        ? brand.extractedColors.palette
        : undefined;

      const newImages = await generateStoryBackgrounds(
        message,
        atmosphereNote,
        brand.primaryColor,
        {
          onProgress: (msg) => {
            setProgressMessage(msg);
          },
          onSlideGenerated: (current, total) => {
            setCurrentSlide({ current, total });
          },
        },
        selectedTemplate?.dataUrl,
        logoPalette
      );

      if (newImages.length === 0) {
        showToast('画像が生成されませんでした。もう一度お試しください。', 'error');
      } else {
        // ロゴ画像挿入がONなら、生成画像のlogoOverlay.visibleを自動有効化
        const finalImages = brand.useLogoOverlay
          ? newImages.map(img => ({
              ...img,
              settings: {
                ...img.settings,
                logoOverlay: { ...img.settings.logoOverlay, visible: true },
              },
            }))
          : newImages;
        setGeneratedImages(prev => [...finalImages, ...prev]);
        setSelectedImageId(finalImages[0].id);
        showToast(`${finalImages.length}枚の背景画像を生成しました！`, 'success');

        // サーバーに自動保存
        setProgressMessage('画像をサーバーに保存中...');
        for (const img of finalImages) {
          try {
            const saved = await saveGeneratedImage(img, { originalMessage: message });
            setSavedImages(prev => [saved, ...prev]);
          } catch (err) {
            console.error('画像の保存に失敗:', err);
          }
        }
      }
    } catch (error) {
      console.error('画像生成エラー:', error);
      let errorMessage = '画像生成に失敗しました。';

      if (error instanceof Error) {
        errorMessage = error.message;

        if (errorMessage.includes('接続できません') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Gemini APIに接続できません。\nネットワーク接続とAPIキーの設定を確認してください。';
        }
      }

      showToast(errorMessage, 'error', 10000);
    } finally {
      setIsGenerating(false);
      setProgressMessage('');
      setCurrentSlide(null);
    }
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const hasOverlays = image.settings.logoOverlay?.visible ||
        image.settings.textOverlay?.textVisible ||
        image.settings.brandOverlay ||
        image.settings.blur > 0 ||
        image.settings.brightness !== 100;

      let downloadUrl = image.url;
      if (hasOverlays) {
        downloadUrl = await flattenImageForDownload(image, brand, FONT_MAP, DEFAULT_FONT);
      }

      const slideNum = image.slideNumber || 1;
      const filename = `story-background-slide-${slideNum}.png`;
      await downloadImage(downloadUrl, filename);
      showToast('画像をダウンロードしました。', 'success');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      showToast('画像のダウンロードに失敗しました。', 'error');
    }
  };

  const handleDownloadAll = async () => {
    if (generatedImages.length === 0) return;

    try {
      showToast('すべての画像をダウンロードしています...', 'info');
      await downloadAllImages(generatedImages);
      showToast(`${generatedImages.length}枚の画像をダウンロードしました。`, 'success');
    } catch (error) {
      console.error('一括ダウンロードエラー:', error);
      showToast('一部の画像のダウンロードに失敗しました。', 'error');
    }
  };

  const updateImageSettings = (id: string, updates: Partial<GeneratedImage['settings']>) => {
    setGeneratedImages(prev => prev.map(img =>
      img.id === id ? { ...img, settings: { ...img.settings, ...updates } } : img
    ));
  };

  const selectedImage = generatedImages.find(img => img.id === selectedImageId);

  const handleLoadSample = (sample: (typeof SAMPLE_SCRIPTS)[0]) => {
    setMessage(sample.message);
    setAtmosphereNote(sample.atmosphereNote);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const logoUrl = reader.result as string;
      try {
        const extractedColors = await extractColorsFromImage(logoUrl);
        setBrand(prev => ({
          ...prev,
          logoUrl,
          extractedColors,
          primaryColor: extractedColors.dominant,
        }));
        showToast('ロゴからカラーパレットを抽出しました。', 'success');
      } catch {
        setBrand(prev => ({ ...prev, logoUrl }));
      }
    };
    reader.readAsDataURL(file);
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
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'gallery' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <span className="hidden lg:block font-medium">保存済み画像</span>
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
                  <h2 className="text-3xl font-bold text-white mb-2">ストーリー作成</h2>
                  <p className="text-slate-400">メッセージを入力して、背景画像を3パターン生成します。</p>
                </header>

                {/* プリセット選択 */}
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">使用ブランド</label>
                  <select
                    value={activePresetId || ''}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                  >
                    <option value="">使用しない</option>
                    {brandPresets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm mb-8">
                  <TemplateGallery
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onSelect={setSelectedTemplateId}
                    onTemplatesChange={setTemplates}
                  />
                </div>

                <div className="space-y-6 bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-semibold text-slate-300">
                        描きたいメッセージ <span className="text-pink-400">(必須)</span>
                      </label>
                      <button
                        onClick={() => handleLoadSample(SAMPLE_SCRIPTS[0])}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md text-slate-300 transition-colors"
                      >
                        サンプル読込
                      </button>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={"年内ラストAI講座\n締切まで後3日！"}
                      className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">
                      雰囲気の注釈 <span className="text-slate-500">(任意)</span>
                    </label>
                    <input
                      type="text"
                      value={atmosphereNote}
                      onChange={(e) => setAtmosphereNote(e.target.value)}
                      placeholder="例：文字を強調して、背景白、ポップな雰囲気..."
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>

                  {/* ロゴ関連トグル */}
                  {brand.logoUrl && (
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700 space-y-4">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ロゴ設定</p>

                      {/* ロゴカラー採用 */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-slate-300">ロゴカラー採用</label>
                          <p className="text-[10px] text-slate-500">生成画像にロゴの色味を反映</p>
                        </div>
                        <button
                          onClick={() => setBrand(prev => ({ ...prev, useLogoColors: !prev.useLogoColors }))}
                          className={`w-12 h-6 rounded-full transition-colors relative ${brand.useLogoColors ? 'bg-indigo-600' : 'bg-slate-600'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${brand.useLogoColors ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      {brand.extractedColors && (
                        <div className="flex gap-2">
                          {brand.extractedColors.palette.map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-lg border border-slate-600"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}

                      {/* ロゴ画像挿入 */}
                      <div className="pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-300">ロゴ画像挿入</label>
                            <p className="text-[10px] text-slate-500">生成画像にロゴを重ねて配置</p>
                          </div>
                          <button
                            onClick={() => setBrand(prev => ({ ...prev, useLogoOverlay: !prev.useLogoOverlay }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${brand.useLogoOverlay ? 'bg-indigo-600' : 'bg-slate-600'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${brand.useLogoOverlay ? 'translate-x-7' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !message}
                    className={`w-full py-4 ${selectedTemplate ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'} disabled:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {currentSlide ? `生成中... (${currentSlide.current}/${currentSlide.total})` : '生成中...'}
                      </>
                    ) : selectedTemplate ? (
                      <>
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        素材画像で3パターン生成
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        背景を3パターン生成
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
                      <div ref={previewContainerRef} className="instagram-aspect rounded-[40px] overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">
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

                        {/* Layer 2.5: Logo overlay (draggable) */}
                        {selectedImage?.settings.logoOverlay?.visible && brand.logoUrl && (
                          <LogoOverlay
                            logoUrl={brand.logoUrl}
                            settings={selectedImage.settings.logoOverlay}
                            onSettingsChange={(updates) => updateImageSettings(selectedImage.id, {
                              logoOverlay: { ...selectedImage.settings.logoOverlay, ...updates },
                            })}
                            containerRef={previewContainerRef}
                            interactive={true}
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
                      <p className="text-slate-400">メッセージを入力して、最適な背景画像を3パターン生成します。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'brand' ? (
          <div className="p-4 md:p-8 lg:p-12 max-w-4xl">
            <header className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-2">ブランドプリセット設定</h2>
              <p className="text-slate-400">複数のブランドを登録し、作成時に切り替えて使えます。</p>
            </header>

            {/* プリセット一覧 */}
            {!isEditingPreset && (
              <div className="space-y-6">
                {brandPresets.length === 0 ? (
                  <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl p-12 text-center">
                    <p className="text-slate-400 mb-4">ブランドプリセットがまだありません。</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brandPresets.map(preset => (
                      <div
                        key={preset.id}
                        className={`bg-slate-800/50 p-6 rounded-2xl border transition-all ${activePresetId === preset.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700 hover:border-slate-600'}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-bold text-white">{preset.name}</h4>
                            {activePresetId === preset.id && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full uppercase tracking-wider">使用中</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEditPreset(preset)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>

                        {/* カラースウォッチ＆ロゴサムネイル */}
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl border border-slate-600 shrink-0" style={{ backgroundColor: preset.config.primaryColor }} />
                          {preset.config.extractedColors && (
                            <div className="flex gap-1">
                              {preset.config.extractedColors.palette.slice(0, 4).map((c, i) => (
                                <div key={i} className="w-5 h-5 rounded-md border border-slate-600" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          )}
                          {preset.config.logoUrl && (
                            <div className="ml-auto w-12 h-12 rounded-xl border border-slate-700 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                              <img src={preset.config.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                          <span>{preset.config.fontPreference}</span>
                          {activePresetId !== preset.id && (
                            <button
                              onClick={() => handleSelectPreset(preset.id)}
                              className="ml-auto px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors font-medium"
                            >
                              使用する
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleStartNewPreset}
                  className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-400 hover:border-indigo-600/40 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  新規プリセットを作成
                </button>
              </div>
            )}

            {/* プリセット編集フォーム */}
            {isEditingPreset && (
              <div className="space-y-12">
                {/* プリセット名 */}
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    プリセット名
                  </h4>
                  <input
                    type="text"
                    value={editingPresetName}
                    onChange={(e) => setEditingPresetName(e.target.value)}
                    placeholder="例：メインブランド、サブブランドA..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
                    <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      メインカラー (HEX)
                    </h4>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl shadow-xl shadow-black/20 shrink-0 border-2 border-slate-700" style={{ backgroundColor: editingBrand.primaryColor }} />
                      <div className="flex-1 space-y-4">
                        <input
                          type="text"
                          value={editingBrand.primaryColor}
                          onChange={(e) => setEditingBrand(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2">
                          {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#000000', '#ffffff'].map(c => (
                            <button
                              key={c}
                              onClick={() => setEditingBrand(prev => ({ ...prev, primaryColor: c }))}
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
                    {editingBrand.logoUrl ? (
                      <div className="space-y-4">
                        <div className="relative border-2 border-slate-700 rounded-2xl h-32 flex items-center justify-center bg-slate-900/50">
                          <img src={editingBrand.logoUrl} alt="Logo" className="max-h-24 max-w-full object-contain" />
                          <button
                            onClick={() => setEditingBrand(prev => ({ ...prev, logoUrl: '', extractedColors: undefined }))}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        {editingBrand.extractedColors && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">ロゴから抽出されたカラー</p>
                            <div className="flex gap-2">
                              {editingBrand.extractedColors.palette.map((color, i) => (
                                <button
                                  key={i}
                                  onClick={() => setEditingBrand(prev => ({ ...prev, primaryColor: color }))}
                                  className="w-8 h-8 rounded-lg border border-slate-600 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-700 rounded-2xl h-32 flex flex-col items-center justify-center hover:bg-slate-700/50 transition-colors cursor-pointer group">
                        <svg className="w-8 h-8 text-slate-500 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>
                        <p className="text-xs text-slate-500">透過PNG推奨</p>
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleEditingLogoUpload}
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
                          onClick={() => setEditingBrand(prev => ({ ...prev, fontPreference: label }))}
                          className={`px-6 py-3 rounded-2xl border text-sm transition-all ${editingBrand.fontPreference === label ? 'bg-white text-slate-900 font-bold border-white' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="p-6 bg-slate-900 rounded-2xl">
                      <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest font-bold">Preview Text</p>
                      {(() => {
                        const current = FONT_MAP[editingBrand.fontPreference] || DEFAULT_FONT;
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
                  <button
                    onClick={() => setIsEditingPreset(false)}
                    className="px-8 py-3 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSavePreset}
                    className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                  >
                    {editingPresetId ? 'プリセットを保存' : 'プリセットを作成'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Gallery Tab */
          <div className="p-4 md:p-8 lg:p-12">
            <header className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-2">保存済み画像</h2>
              <p className="text-slate-400">過去に生成・保存された画像の一覧です。</p>
            </header>
            <SavedGallery
              images={savedImages}
              onImagesChange={setSavedImages}
              onToast={showToast}
            />
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
