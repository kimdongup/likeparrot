import type { LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ko', speechCode: 'ko-KR', name: 'Korean (한국어)', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', speechCode: 'en-US', name: 'English (영어)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', speechCode: 'ja-JP', name: 'Japanese (일본어)', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-TW', speechCode: 'zh-TW', name: 'Traditional Chinese (대만어)', nativeName: '繁體中文 (台灣)', flag: '🇹🇼' },
  { code: 'zh', speechCode: 'zh-CN', name: 'Chinese (중국어)', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'es', speechCode: 'es-ES', name: 'Spanish (스페인어)', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', speechCode: 'fr-FR', name: 'French (프랑스어)', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', speechCode: 'de-DE', name: 'German (독일어)', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', speechCode: 'vi-VN', name: 'Vietnamese (베트남어)', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];
