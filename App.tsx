import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Sliders, Wand2, ScanSearch, Download, Undo2, Globe, Sparkles, Sun, Droplet, MonitorPlay } from 'lucide-react';
import { Language, EditMode, ImageAdjustments, PresetFilter } from './types';
import { TRANSLATIONS, DEFAULT_ADJUSTMENTS, PRESET_FILTERS } from './constants';
import { identifyImageContent, editImageWithAI } from './services/geminiService';
import { Button } from './components/Button';

// --- Sub-components defined here to simplify file structure as requested ---

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

const App: React.FC = () => {
  // State
  const [lang, setLang] = useState<Language>('en');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null); // Displayed image (potentially AI generated)
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [activeMode, setActiveMode] = useState<EditMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [identifyResult, setIdentifyResult] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => TRANSLATIONS[key][lang];
  const isRTL = lang === 'ar';

  // Handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setOriginalImage(result);
        setCurrentImage(result);
        setAdjustments(DEFAULT_ADJUSTMENTS);
        setIdentifyResult(null);
        setActiveMode('filter'); // Default to filters view
      };
      reader.readAsDataURL(file);
    }
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
      // Note: Values need to be converted to standard CSS filter units
      // brightness: 100 is baseline (100% or 1.0). 
      // contrast: 100 is baseline.
      
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
      link.download = `lumina-edit-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
      
      // Add to gallery state for this session
      setGallery(prev => [link.href, ...prev]);
    }
  };

  const handleIdentify = async () => {
    if (!currentImage) return;
    setIsLoading(true);
    setIdentifyResult(null);
    try {
      // To get the currently visible pixels (with filters), use canvas
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
      // We assume user wants to edit the current state (with filters applied? or original?)
      // Usually, for generative fill/edit, it's safer to send the base image, but 
      // if they applied B&W and then want to edit, we should send the B&W version.
      const imageData = canvasRef.current?.toDataURL('image/png') || currentImage;
      const newImage = await editImageWithAI(imageData, aiPrompt);
      setCurrentImage(newImage);
      setAdjustments(DEFAULT_ADJUSTMENTS); // Reset standard filters as the AI generated image has "baked in" the look
      setAiPrompt('');
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
    setCurrentImage(originalImage);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setIdentifyResult(null);
  };

  return (
    <div className={`min-h-screen bg-dark-900 text-gray-100 font-sans ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-dark-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {t('appTitle')}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
              <Globe size={18} className="mr-2 rtl:ml-2" />
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col md:flex-row gap-6">
        
        {/* Left/Top: Tool Navigation (Only visible if image uploaded) */}
        {originalImage && (
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:w-20 shrink-0">
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
            <div className="flex-grow md:h-8" />
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
        )}

        {/* Center: Workspace */}
        <div className="flex-1 bg-dark-800 rounded-2xl border border-gray-700 overflow-hidden relative flex flex-col">
          {!originalImage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
              <div 
                className="w-full max-w-md border-2 border-dashed border-gray-600 rounded-2xl p-12 flex flex-col items-center justify-center hover:border-brand-500 hover:bg-dark-800/50 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-brand-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t('uploadTitle')}</h3>
                <p className="text-gray-400">{t('uploadDesc')}</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0a0a0a] relative p-4">
              {/* Canvas is the Source of Truth for visual output */}
              <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-full object-contain shadow-2xl shadow-black"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />
              
              {/* Identify Overlay */}
              {activeMode === 'identify' && identifyResult && (
                <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-black/80 backdrop-blur-md p-6 rounded-xl border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300 shadow-2xl z-20">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-brand-400 flex items-center gap-2">
                      <ScanSearch size={16} />
                      {t('identifyResult')}
                    </h3>
                    <button onClick={() => setIdentifyResult(null)} className="text-gray-400 hover:text-white">&times;</button>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{identifyResult}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Contextual Panel */}
        {originalImage && (
          <aside className="w-full md:w-80 bg-dark-800 rounded-2xl border border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            <div className="p-4 border-b border-gray-700 font-bold flex items-center gap-2 text-brand-400">
              {activeMode === 'filter' && <Droplet size={18} />}
              {activeMode === 'adjust' && <Sliders size={18} />}
              {activeMode === 'ai-edit' && <Wand2 size={18} />}
              {activeMode === 'identify' && <ScanSearch size={18} />}
              
              <span>
                {activeMode === 'filter' && t('filters')}
                {activeMode === 'adjust' && t('adjust')}
                {activeMode === 'ai-edit' && t('aiEdit')}
                {activeMode === 'identify' && t('identify')}
              </span>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {activeMode === 'filter' && (
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => applyPreset(filter)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-700 hover:border-brand-500 transition-all focus:outline-none"
                    >
                      {/* Mini Preview Mockups */}
                      <div 
                        className="w-full h-full bg-cover bg-center transition-transform group-hover:scale-110"
                        style={{ 
                          backgroundImage: `url(${originalImage})`,
                          filter: `
                            brightness(${filter.adjustments.brightness}%) 
                            contrast(${filter.adjustments.contrast}%) 
                            grayscale(${filter.adjustments.grayscale}%) 
                            sepia(${filter.adjustments.sepia}%)
                          `
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2 opacity-100 transition-opacity">
                        <span className="text-xs font-medium text-white shadow-sm">
                          {t(filter.nameKey)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeMode === 'adjust' && (
                <div className="space-y-6">
                  <SliderControl 
                    label={t('brightness')} 
                    value={adjustments.brightness} 
                    min={0} max={200} 
                    onChange={(v) => setAdjustments({...adjustments, brightness: v})} 
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <SliderControl 
                    label={t('contrast')} 
                    value={adjustments.contrast} 
                    min={0} max={200} 
                    onChange={(v) => setAdjustments({...adjustments, contrast: v})}
                    dir={isRTL ? 'rtl' : 'ltr'} 
                  />
                  <SliderControl 
                    label={t('saturation')} 
                    value={adjustments.saturation} 
                    min={0} max={200} 
                    onChange={(v) => setAdjustments({...adjustments, saturation: v})}
                    dir={isRTL ? 'rtl' : 'ltr'} 
                  />
                  <SliderControl 
                    label={t('sepia')} 
                    value={adjustments.sepia} 
                    min={0} max={100} 
                    onChange={(v) => setAdjustments({...adjustments, sepia: v})}
                    dir={isRTL ? 'rtl' : 'ltr'} 
                  />
                  <SliderControl 
                    label={t('grayscale')} 
                    value={adjustments.grayscale} 
                    min={0} max={100} 
                    onChange={(v) => setAdjustments({...adjustments, grayscale: v})}
                    dir={isRTL ? 'rtl' : 'ltr'} 
                  />
                  <SliderControl 
                    label={t('blur')} 
                    value={adjustments.blur} 
                    min={0} max={20} 
                    onChange={(v) => setAdjustments({...adjustments, blur: v})}
                    dir={isRTL ? 'rtl' : 'ltr'} 
                  />
                </div>
              )}

              {activeMode === 'identify' && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="p-4 bg-brand-900/20 rounded-full text-brand-500">
                    <ScanSearch size={48} />
                  </div>
                  <p className="text-sm text-gray-400">
                    {t('identifyPrompt')}
                  </p>
                  <Button onClick={handleIdentify} isLoading={isLoading} className="w-full">
                    {t('identify')}
                  </Button>
                </div>
              )}

              {activeMode === 'ai-edit' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <span className="font-bold text-brand-400">Tip:</span> Use this to remove objects (e.g. "Remove the person"), add effects, or change the style completely (e.g. "Make it an oil painting").
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t('aiPromptPlaceholder')}
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <Button 
                    onClick={handleAIEdit} 
                    disabled={!aiPrompt.trim()} 
                    isLoading={isLoading}
                    className="w-full"
                  >
                    <Wand2 size={16} />
                    {t('generate')}
                  </Button>
                </div>
              )}

            </div>
          </aside>
        )}
      </main>

      {/* Gallery strip (Bottom) */}
      {gallery.length > 0 && (
        <section className="fixed bottom-0 left-0 right-0 h-20 bg-dark-900 border-t border-gray-800 flex items-center px-4 gap-4 overflow-x-auto z-40">
           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-dark-900 px-2 py-1">
             {t('gallery')}
           </span>
           {gallery.map((src, i) => (
             <img key={i} src={src} alt="Gallery" className="h-14 w-14 rounded-lg object-cover border border-gray-700 hover:border-brand-500 cursor-pointer" onClick={() => {
               const win = window.open();
               win?.document.write(`<img src="${src}" />`);
             }} />
           ))}
        </section>
      )}
    </div>
  );
};

// Helper UI Component for the Sidebar
const TooltipButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`w-full md:w-20 p-3 md:py-4 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50' : 'text-gray-400 hover:bg-dark-800 hover:text-white'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;