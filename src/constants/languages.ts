import type { LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ko', speechCode: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', speechCode: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', speechCode: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-TW', speechCode: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文 (台灣)', flag: '🇹🇼' },
  { code: 'zh', speechCode: 'zh-CN', name: 'Simplified Chinese', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'es', speechCode: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', speechCode: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', speechCode: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', speechCode: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

export const getEnglishLanguageNameByCode = (languageCode?: string): string => {
  const normalizedCode = languageCode?.trim();
  if (!normalizedCode) return 'Unknown language';

  return SUPPORTED_LANGUAGES.find((language) =>
    language.code.toLowerCase() === normalizedCode.toLowerCase() ||
    language.speechCode.toLowerCase() === normalizedCode.toLowerCase()
  )?.name ?? normalizedCode;
};
