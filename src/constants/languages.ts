import type { LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ko', speechCode: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', speechCode: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', speechCode: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-TW', speechCode: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'zh', speechCode: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'es', speechCode: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', speechCode: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', speechCode: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', speechCode: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

const languageDisplayNamesCache = new Map<string, Intl.DisplayNames>();
const localizedLanguageNameCache = new Map<string, string>();

export const getLocalizedLanguageNameByCode = (
  languageCode: string | undefined,
  displayLocale: string
): string => {
  const normalizedCode = languageCode?.trim();
  if (!normalizedCode) return '';
  const cacheKey = `${displayLocale.toLowerCase()}|${normalizedCode.toLowerCase()}`;
  const cachedName = localizedLanguageNameCache.get(cacheKey);
  if (cachedName) return cachedName;
  const language = SUPPORTED_LANGUAGES.find((option) =>
    option.code.toLowerCase() === normalizedCode.toLowerCase() ||
    option.speechCode.toLowerCase() === normalizedCode.toLowerCase()
  );
  const code = language?.speechCode ?? normalizedCode;

  try {
    let displayNames = languageDisplayNamesCache.get(displayLocale);
    if (!displayNames) {
      displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
      languageDisplayNamesCache.set(displayLocale, displayNames);
    }
    const localizedName = displayNames.of(code) ??
      language?.nativeName ??
      normalizedCode;
    localizedLanguageNameCache.set(cacheKey, localizedName);
    return localizedName;
  } catch {
    const fallbackName = language?.nativeName ?? normalizedCode;
    localizedLanguageNameCache.set(cacheKey, fallbackName);
    return fallbackName;
  }
};
