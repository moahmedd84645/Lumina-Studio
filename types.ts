export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}

export type EditMode = 'adjust' | 'filter' | 'ai-edit' | 'identify' | 'erase' | null;

export interface ImageAdjustments {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  grayscale: number;  // 0-100, default 0
  sepia: number;      // 0-100, default 0
  blur: number;       // 0-20, default 0
}

export interface PresetFilter {
  id: string;
  nameKey: string;
  adjustments: ImageAdjustments;
  overlay?: string; // CSS blend mode or color
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
}