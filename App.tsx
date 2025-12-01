import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Sliders, Wand2, ScanSearch, Download, Undo2, Redo2, Globe, Sparkles, Droplet, Eraser, LayoutGrid, ArrowLeft, Plus, Save, Trash2, X, AlertCircle } from 'lucide-react';
import { Language, EditMode, ImageAdjustments, PresetFilter } from './types';
import { TRANSLATIONS, DEFAULT_ADJUSTMENTS, PRESET_FILTERS } from './constants';
import { identifyImageContent, editImageWithAI } from './services/geminiService';
import { Button } from './components/Button';

// --- Sub-components ---

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  dir: 'rtl' | 'ltr';
}> = ({ label, value, min, max, onChange, dir }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1 text-sm text-gray-400">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
      dir={dir}
    />
  </div>
);

// Helper UI Component for the Sidebar
const TooltipButton = ({ active, onClick, icon, label, disabled = false, className = '', title }: { active?: boolean, onClick: () => void, icon: React.ReactNode, label?: string, disabled?: boolean, className?: string, title?: string }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-full md:w-20 p-3 md:py-4 flex flex-col items-center justify-center gap-1 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50' : 'text-gray-400 hover:bg-dark-800 hover:text-white'} ${className}`}
  >
    {icon}
    {label && <span className="text-[10px] font-medium text-center leading-tight">{label}</span>}
  </button>
);

const App: React.FC = () => {
  // State
  const [lang, setLang] = useState<Language>('en');
  // Default to gallery view to serve as the "Primary Face"
  const [viewMode, setViewMode] = useState<'editor' | 'gallery'>('gallery');
  
  // History System
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [activeMode, setActiveMode] = useState<EditMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Inputs
  const [aiPrompt, setAiPrompt] = useState('');
  const [erasePrompt, setErasePrompt] = useState('');
  
  const [identifyResult, setIdentifyResult] = useState<string | null>(null);
  
  // Gallery now stores all images (original uploads and saved edits)
  const [gallery, setGallery] = useState<string[]>([]);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- CRASH-PROOF TRANSLATION HELPER ---
  const t = (key: string): string => {
    try {
      // 1. Check if TRANSLATIONS object exists
      if (!TRANSLATIONS) return key;

      // 2. Check if the specific key exists
      const entry = TRANSLATIONS[key];
      if (!entry) {
        // Fallback: Return key name if translation missing
        console.warn(`Missing translation for key: "${key}"`);
        return key;
      }

      // 3. Return language specific string, fallback to 'en', then fallback to key
      return entry[lang] || entry['en'] || key;
    } catch (err) {
      console.error("Translation error", err);
      return key;
    }
  };
  
  const isRTL = lang === 'ar';

  const currentImage = history[historyIndex] || null;

  // Handlers
  const addToHistory = (newImage: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImage);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAdjustments(DEFAULT_ADJUSTMENTS); // Reset sliders on undo to prevent visual conflicts
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAdjustments(DEFAULT_ADJUSTMENTS);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Add to gallery immediately
        setGallery(prev => [result, ...prev]);
        // Open in editor
        openInEditor(result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (event.target) event.target.value = '';
  };

  const openInEditor = (imgSrc: string) => {
    setHistory([imgSrc]);
    setHistoryIndex(0);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setIdentifyResult(null);
    setActiveMode('filter'); 
    setViewMode('editor');
  };

  const saveCurrentToGallery = () => {
    if (canvasRef.current) {
      const newDataUrl = canvasRef.current.toDataURL('image/png');
      setGallery(prev => [newDataUrl, ...prev]);
    }
  };

  const deleteFromGallery = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newGallery = [...gallery];
    newGallery.splice(index, 1);
    setGallery(newGallery);
  };

  const applyAdjustmentsToCanvas = useCallback(() => {
    if (!canvasRef.current || !currentImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = currentImage;
    img.onload = () => {
      // Set dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply Filters
      const { brightness, contrast, saturation, grayscale, sepia, blur } = adjustments;
      
      const filterString = `
        brightness(${brightness}%) 
        contrast(${contrast}%) 
        saturate(${saturation}%) 
        grayscale(${grayscale}%) 
        sepia(${sepia}%) 
        blur(${blur}px)
      `;

      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    };
  }, [currentImage, adjustments]);

  useEffect(() => {
    applyAdjustmentsToCanvas();
  }, [applyAdjustmentsToCanvas]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `firsial-edit-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const handleIdentify = async () => {
    if (!currentImage) return;
    setIsLoading(true);
    setIdentifyResult(null);
    try {
      // Use current visual state (including filters)
      const imageData = canvasRef.current?.toDataURL('image/png') || currentImage;
      const result = await identifyImageContent(imageData, lang);
      setIdentifyResult(result);
    } catch (error) {
      setIdentifyResult(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIEdit = async () => {
    if (!currentImage || !aiPrompt.trim()) return;
    setIsLoading(true);
    try {
      const imageData = canvasRef.current?.toDataURL('image/png') || currentImage;
      const newImage = await editImageWithAI(imageData, aiPrompt);
      
      addToHistory(newImage);
      setAdjustments(DEFAULT_ADJUSTMENTS); 
      setAiPrompt('');
      
      // Auto-save result to gallery so it's not lost
      setGallery(prev => [newImage, ...prev]);
    } catch (error) {
      console.error(error);
      alert(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEraser = async () => {
    if (!currentImage || !erasePrompt.trim()) return;
    setIsLoading(true);
    try {
      const imageData = canvasRef.current?.toDataURL('image/png') || currentImage;
      const fullPrompt = `Remove the ${erasePrompt} from this image and fill in the background seamlessly.`;
      
      const newImage = await editImageWithAI(imageData, fullPrompt);
      
      addToHistory(newImage);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setErasePrompt('');
      
      setGallery(prev => [newImage, ...prev]);
    } catch (error) {
      console.error(error);
      alert(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: PresetFilter) => {
    setAdjustments(preset.adjustments);
  };

  const resetImage = () => {
    // Resets to initial upload
    if (history.length > 0) {
      setHistoryIndex(0);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setIdentifyResult(null);
    }
  };

  return (
    <div className={`min-h-screen bg-dark-900 text-gray-100 font-sans ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-dark-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('gallery')}>
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 hidden sm:block">
              {t('appTitle')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {viewMode === 'editor' && (
                <div className="flex items-center gap-2 mr-2 ml-2 border-r border-l border-gray-700 px-2">
                   <Button 
                      variant="ghost" 
                      onClick={handleUndo} 
                      disabled={historyIndex <= 0}
                      className="p-2"
                      title={t('undo')}
                   >
                     <Undo2 size={18} />
                   </Button>
                   <Button 
                      variant="ghost" 
                      onClick={handleRedo} 
                      disabled={historyIndex >= history.length - 1}
                      className="p-2"
                      title={t('redo')}
                   >
                     <Redo2 size={18} />
                   </Button>
                </div>
             )}
             
             {viewMode === 'editor' && (
                <Button variant="secondary" onClick={() => setViewMode('gallery')} className="text-sm">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">{t('back')}</span>
                </Button>
             )}
            
            <Button variant="ghost" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
              <Globe size={18} className="mr-2 rtl:ml-2" />
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-64px)]">
        
        {viewMode === 'gallery' ? (
          <div className="w-full h-full overflow-y-auto animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <LayoutGrid className="text-brand-500" />
                {t('gallery')}
              </h2>
            </div>
            
            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
              {/* Card 1: New Project */}
              <div 
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-700 hover:border-brand-500 hover:bg-dark-800/50 transition-all cursor-pointer flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 bg-brand-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Plus size={32} className="text-brand-500" />
                </div>
                <h3 className="font-bold text-gray-300 group-hover:text-white">{t('newProject')}</h3>
                <input 
                  type="file" 
                  ref={galleryInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>

              {/* Gallery Items */}
              {gallery.map((src, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-800 bg-black hover:border-brand-500 hover:shadow-xl hover:shadow-brand-900/20 transition-all">
                  <img src={src} alt="Gallery" className="w-full h-full object-cover" />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                    <Button variant="primary" className="w-full" onClick={() => openInEditor(src)}>
                      <Wand2 size={16} /> {t('continue')}
                    </Button>
                    <div className="flex gap-2 w-full">
                       <a 
                        href={src} 
                        download={`firsial-project-${i}.png`} 
                        className="flex-1 flex items-center justify-center p-2 bg-dark-800 hover:bg-white hover:text-black rounded-lg transition-colors text-white border border-gray-600"
                        title={t('download')}
                       >
                        <Download size={18} />
                      </a>
                      <button 
                        onClick={(e) => deleteFromGallery(i, e)}
                        className="flex-1 flex items-center justify-center p-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded-lg transition-colors border border-red-900"
                        title={t('delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {gallery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p>{t('galleryEmpty')}</p>
              </div>
            )}
          </div>
        ) : (
          /* EDITOR MODE */
          <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Tool Navigation */}
            <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:w-20 shrink-0 custom-scrollbar">
              <TooltipButton 
                active={activeMode === 'filter'} 
                onClick={() => setActiveMode('filter')} 
                icon={<Droplet size={24} />} 
                label={t('filters')} 
              />
              <TooltipButton 
                active={activeMode === 'adjust'} 
                onClick={() => setActiveMode('adjust')} 
                icon={<Sliders size={24} />} 
                label={t('adjust')} 
              />
              <TooltipButton 
                active={activeMode === 'erase'} 
                onClick={() => setActiveMode('erase')} 
                icon={<Eraser size={24} />} 
                label={t('erase')} 
              />
              <TooltipButton 
                active={activeMode === 'ai-edit'} 
                onClick={() => setActiveMode('ai-edit')} 
                icon={<Wand2 size={24} />} 
                label={t('aiEdit')} 
              />
              <TooltipButton 
                active={activeMode === 'identify'} 
                onClick={() => setActiveMode('identify')} 
                icon={<ScanSearch size={24} />} 
                label={t('identify')} 
              />
              <div className="w-px h-8 md:h-px md:w-full bg-gray-700 my-0 md:my-2" />
              <TooltipButton 
                active={false} 
                onClick={saveCurrentToGallery} 
                icon={<Save size={24} />} 
                label={t('saveCopy')} 
              />
              <TooltipButton 
                active={false} 
                onClick={handleDownload} 
                icon={<Download size={24} />} 
                label={t('download')} 
              />
              <TooltipButton 
                active={false} 
                onClick={resetImage} 
                icon={<Undo2 size={24} />} 
                label={t('reset')} 
              />
            </nav>

            {/* Canvas Workspace */}
            <div className="flex-1 bg-dark-800 rounded-2xl border border-gray-700 overflow-hidden relative flex flex-col">
              <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0a0a0a] relative p-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-full object-contain shadow-2xl shadow-black"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                />
                
                {activeMode === 'identify' && identifyResult && (
                  <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-black/80 backdrop-blur-md p-6 rounded-xl border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300 shadow-2xl z-20">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-brand-400 flex items-center gap-2">
                        <ScanSearch size={16} />
                        {t('identifyResult')}
                      </h3>
                      <button onClick={() => setIdentifyResult(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-200">{identifyResult}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Context Panel */}
            <aside className="w-full md:w-80 bg-dark-800 rounded-2xl border border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-gray-700 font-bold flex items-center gap-2 text-brand-400">
                {activeMode === 'filter' && <Droplet size={18} />}
                {activeMode === 'adjust' && <Sliders size={18} />}
                {activeMode === 'ai-edit' && <Wand2 size={18} />}
                {activeMode === 'erase' && <Eraser size={18} />}
                {activeMode === 'identify' && <ScanSearch size={18} />}
                <span>
                  {activeMode === 'filter' && t('filters')}
                  {activeMode === 'adjust' && t('adjust')}
                  {activeMode === 'ai-edit' && t('aiEdit')}
                  {activeMode === 'erase' && t('erase')}
                  {activeMode === 'identify' && t('identify')}
                </span>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Panel Content Logic */}
                {activeMode === 'filter' && currentImage && (
                  <div className="grid grid-cols-2 gap-3">
                    {PRESET_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => applyPreset(filter)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-gray-700 hover:border-brand-500 transition-all focus:outline-none"
                      >
                        <div 
                          className="w-full h-full bg-cover bg-center transition-transform group-hover:scale-110"
                          style={{ 
                            backgroundImage: `url(${currentImage})`,
                            filter: `
                              brightness(${filter.adjustments.brightness}%) 
                              contrast(${filter.adjustments.contrast}%) 
                              grayscale(${filter.adjustments.grayscale}%) 
                              sepia(${filter.adjustments.sepia}%)
                              blur(${filter.adjustments.blur}px)
                            `
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-2 opacity-100 transition-opacity">
                          <span className="text-xs font-medium text-white shadow-sm">{t(filter.nameKey)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeMode === 'adjust' && (
                  <div className="space-y-6">
                    <SliderControl label={t('brightness')} value={adjustments.brightness} min={0} max={200} onChange={(v) => setAdjustments({...adjustments, brightness: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                    <SliderControl label={t('contrast')} value={adjustments.contrast} min={0} max={200} onChange={(v) => setAdjustments({...adjustments, contrast: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                    <SliderControl label={t('saturation')} value={adjustments.saturation} min={0} max={200} onChange={(v) => setAdjustments({...adjustments, saturation: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                    <SliderControl label={t('sepia')} value={adjustments.sepia} min={0} max={100} onChange={(v) => setAdjustments({...adjustments, sepia: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                    <SliderControl label={t('grayscale')} value={adjustments.grayscale} min={0} max={100} onChange={(v) => setAdjustments({...adjustments, grayscale: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                    <SliderControl label={t('blur')} value={adjustments.blur} min={0} max={20} onChange={(v) => setAdjustments({...adjustments, blur: v})} dir={isRTL ? 'rtl' : 'ltr'} />
                  </div>
                )}

                {activeMode === 'identify' && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="p-4 bg-brand-900/20 rounded-full text-brand-500">
                      <ScanSearch size={48} />
                    </div>
                    <p className="text-sm text-gray-400">{t('identifyPrompt')}</p>
                    <Button onClick={handleIdentify} isLoading={isLoading} className="w-full">{t('identify')}</Button>
                  </div>
                )}

                {activeMode === 'erase' && (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 flex flex-col items-center text-center">
                      <Eraser size={32} className="text-brand-500 mb-2" />
                      <h4 className="font-bold text-white mb-1">{t('erase')}</h4>
                      <p className="text-xs text-gray-400">{t('eraseDesc')}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">{t('erasePrompt')}</label>
                      <input
                        type="text"
                        value={erasePrompt}
                        onChange={(e) => setErasePrompt(e.target.value)}
                        placeholder={t('erasePlaceholder')}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-brand-500 outline-none"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    </div>
                    <Button onClick={handleEraser} disabled={!erasePrompt.trim()} isLoading={isLoading} className="w-full" variant="danger">
                      <Eraser size={16} /> {t('eraseBtn')}
                    </Button>
                  </div>
                )}

                {activeMode === 'ai-edit' && (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <span className="font-bold text-brand-400">Tip:</span> Describe the desired change.
                    </p>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={t('aiPromptPlaceholder')}
                      className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm focus:border-brand-500 outline-none resize-none"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <Button onClick={handleAIEdit} disabled={!aiPrompt.trim()} isLoading={isLoading} className="w-full">
                      <Wand2 size={16} /> {t('generate')}
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;