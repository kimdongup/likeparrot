import { ChevronDown } from 'lucide-react';
import { memo } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type { LanguageOption } from '../types';

interface LanguageNameSelectProps {
  id: string;
  label: string;
  labelledBy?: string;
  selectedLanguage: LanguageOption;
  onLanguageChange: (language: LanguageOption) => void;
  options?: readonly LanguageOption[];
  disabled?: boolean;
  className?: string;
}

export const LanguageNameSelect = memo(function LanguageNameSelect({
  id,
  label,
  labelledBy,
  selectedLanguage,
  onLanguageChange,
  options = SUPPORTED_LANGUAGES,
  disabled = false,
  className = '',
}: LanguageNameSelectProps) {
  return (
    <div
      className={`group relative flex h-16 w-full min-w-0 items-center gap-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 px-1.5 shadow-inner transition hover:border-pink-400 focus-within:border-pink-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-pink-400 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className}`}
    >
      <span className="pointer-events-none shrink-0 select-none text-2xl leading-none" aria-hidden="true">
        {selectedLanguage.flag}
      </span>
      <span
        className="pointer-events-none min-w-0 flex-1 truncate text-xs font-semibold text-slate-100 [[data-theme=light]_&]:text-slate-900 sm:text-sm"
        lang={selectedLanguage.speechCode}
        aria-hidden="true"
      >
        {selectedLanguage.nativeName}
      </span>
      <ChevronDown className="pointer-events-none h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
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
        title={`${label}: ${selectedLanguage.nativeName}`}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        {options.map((language) => (
          <option key={language.code} value={language.code} lang={language.speechCode}>
            {language.flag} {language.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
});
