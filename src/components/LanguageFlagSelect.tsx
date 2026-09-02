import { memo } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type { LanguageOption } from '../types';

interface LanguageFlagSelectProps {
  id: string;
  label: string;
  labelledBy?: string;
  selectedLanguage: LanguageOption;
  onLanguageChange: (language: LanguageOption) => void;
  options?: readonly LanguageOption[];
  disabled?: boolean;
  className?: string;
}

const getEnglishLanguageName = (language: LanguageOption): string =>
  language.name.replace(/\s*\([^)]*[\u3131-\uD79D][^)]*\)\s*$/u, '').trim();

export const LanguageFlagSelect = memo(function LanguageFlagSelect({
  id,
  label,
  labelledBy,
  selectedLanguage,
  onLanguageChange,
  options = SUPPORTED_LANGUAGES,
  disabled = false,
  className = '',
}: LanguageFlagSelectProps) {
  const selectedName = getEnglishLanguageName(selectedLanguage);

  return (
    <div
      className={`group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 shadow-inner transition hover:border-indigo-400 focus-within:border-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-400 disabled:opacity-50 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className}`}
    >
      <span className="pointer-events-none select-none text-4xl leading-none" aria-hidden="true">
        {selectedLanguage.flag}
      </span>
      <select
        id={id}
        value={selectedLanguage.code}
        onChange={(event) => {
          const language = options.find((option) => option.code === event.target.value);
          if (language) onLanguageChange(language);
        }}
        disabled={disabled}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        title={`${label}: ${selectedName}`}
        lang="en"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {options.map((language) => (
          <option key={language.code} value={language.code}>
            {language.flag} {getEnglishLanguageName(language)}
          </option>
        ))}
      </select>
    </div>
  );
});
