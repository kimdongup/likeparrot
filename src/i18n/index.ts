import { GERMAN_UI } from './de';
import { ENGLISH_UI } from './en';
import { SPANISH_UI } from './es';
import { FRENCH_UI } from './fr';
import { JAPANESE_UI } from './ja';
import { KOREAN_UI } from './ko';
import type { UiStrings } from './types';
import { VIETNAMESE_UI } from './vi';
import { CHINESE_UI } from './zh';
import { TRADITIONAL_CHINESE_UI } from './zhTW';

const UI_TRANSLATIONS: Record<string, UiStrings> = {
  ko: KOREAN_UI,
  en: ENGLISH_UI,
  ja: JAPANESE_UI,
  'zh-TW': TRADITIONAL_CHINESE_UI,
  zh: CHINESE_UI,
  es: SPANISH_UI,
  fr: FRENCH_UI,
  de: GERMAN_UI,
  vi: VIETNAMESE_UI,
};

const normalizeUiLanguageCode = (languageCode?: string): string => {
  const normalized = languageCode?.trim().toLowerCase() ?? '';
  if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-TW';
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh';
  return normalized.split('-')[0] || 'en';
};

export const getUiStrings = (languageCode?: string): UiStrings =>
  UI_TRANSLATIONS[normalizeUiLanguageCode(languageCode)] ?? ENGLISH_UI;

export type { UiStrings } from './types';
