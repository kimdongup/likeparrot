import { memo } from 'react';
import {
  getLocalizedLanguageNameByCode,
  SUPPORTED_LANGUAGES,
} from '../constants/languages';
import { getUiStrings } from '../constants/translations';
import type { LanguageOption } from '../types';

interface SourceLanguageFlagsProps {
  selectedLanguage: LanguageOption;
  onLanguageChange: (language: LanguageOption) => void;
  disabled?: boolean;
  layout?: 'scroll' | 'grid';
  className?: string;
}

export const SourceLanguageFlags = memo(function SourceLanguageFlags({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  layout = 'scroll',
  className = '',
}: SourceLanguageFlagsProps) {
  const t = getUiStrings(selectedLanguage.code);

  return (
    <div
      className={`${
        layout === 'grid'
          ? 'grid grid-cols-4 gap-2 min-[360px]:grid-cols-5 sm:grid-cols-9'
          : 'flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain py-1 scrollbar-none'
      } ${className}`}
      role="group"
      aria-label={t.header.sourceLanguage}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const selected = selectedLanguage.code === language.code;
        const localizedName = getLocalizedLanguageNameByCode(language.speechCode, t.locale);
        return (
          <button
            type="button"
            key={language.code}
            onClick={() => onLanguageChange(language)}
            disabled={disabled}
            title={language.nativeName}
            aria-label={`${t.header.chooseSourceLanguage}: ${localizedName}`}
            aria-pressed={selected}
            className={`flex h-14 min-w-0 items-center justify-center rounded-xl border p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              layout === 'scroll' ? 'w-14 shrink-0' : 'w-full'
            } ${
              selected
                ? 'border-indigo-400/50 bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-700 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="text-4xl leading-none" aria-hidden="true">{language.flag}</span>
          </button>
        );
      })}
    </div>
  );
});
