import { ImageAdjustments, PresetFilter, TranslationDictionary } from './types';

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
};

export const TRANSLATIONS: TranslationDictionary = {
  appTitle: { en: 'Lumina Studio', ar: 'ستوديو لومينا' },
  uploadTitle: { en: 'Upload Photo', ar: 'رفع صورة' },
  uploadDesc: { en: 'Drag & drop or click to upload', ar: 'اسحب وأفلت أو انقر للرفع' },
  tools: { en: 'Tools', ar: 'الأدوات' },
  adjust: { en: 'Adjust', ar: 'تعديل' },
  filters: { en: 'Filters', ar: 'فلاتر' },
  aiEdit: { en: 'AI Magic', ar: 'سحر الذكاء الاصطناعي' },
  identify: { en: 'Identify', ar: 'تعرف' },
  download: { en: 'Download', ar: 'تحميل' },
  reset: { en: 'Reset', ar: 'إعادة ضبط' },
  brightness: { en: 'Brightness', ar: 'السطوع' },
  contrast: { en: 'Contrast', ar: 'التباين' },
  saturation: { en: 'Saturation', ar: 'التشبع' },
  grayscale: { en: 'B&W', ar: 'أبيض وأسود' },
  sepia: { en: 'Sepia', ar: 'سيبيا' },
  blur: { en: 'Blur', ar: 'ضبابية' },
  identifyPrompt: { en: 'Analyzing image...', ar: 'جاري تحليل الصورة...' },
  identifyResult: { en: 'Identification Result', ar: 'نتيجة التعرف' },
  aiPromptPlaceholder: { en: 'Describe what to change (e.g., "Remove the cup", "Make it look like 1980s")', ar: 'صف ما تريد تغييره (مثلاً: "احذف الكوب"، "اجعلها تبدو كأنها من الثمانينيات")' },
  generate: { en: 'Generate', ar: 'توليد' },
  processing: { en: 'Processing...', ar: 'جاري المعالجة...' },
  vintage: { en: 'Vintage', ar: 'عتيق' },
  movie: { en: 'Movie Mode', ar: 'وضع السينما' },
  warm: { en: 'Warm', ar: 'دافئ' },
  cool: { en: 'Cool', ar: 'بارد' },
  dramatic: { en: 'Dramatic', ar: 'درامي' },
  original: { en: 'Original', ar: 'أصلي' },
  back: { en: 'Back', ar: 'رجوع' },
  gallery: { en: 'Gallery', ar: 'المعرض' },
  error: { en: 'An error occurred', ar: 'حدث خطأ' },
  success: { en: 'Success', ar: 'تم بنجاح' },
};

export const PRESET_FILTERS: PresetFilter[] = [
  {
    id: 'original',
    nameKey: 'original',
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  },
  {
    id: 'vintage',
    nameKey: 'vintage',
    adjustments: { ...DEFAULT_ADJUSTMENTS, sepia: 40, contrast: 110, brightness: 90, saturation: 80 },
  },
  {
    id: 'bw',
    nameKey: 'grayscale',
    adjustments: { ...DEFAULT_ADJUSTMENTS, grayscale: 100, contrast: 120 },
  },
  {
    id: 'movie',
    nameKey: 'movie',
    adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 130, saturation: 110, brightness: 95 },
  },
  {
    id: 'dramatic',
    nameKey: 'dramatic',
    adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 150, saturation: 0, brightness: 80 },
  },
];
