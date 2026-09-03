import { memo } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { getUiStrings } from '../constants/translations';
import type { LanguageOption } from '../types';
import { LanguageNameSelect } from './LanguageNameSelect';

interface TargetLanguageBarProps {
  selectedSourceLang: LanguageOption;
  selectedTargetLang: LanguageOption;
  onTargetLangChange: (language: LanguageOption) => void;
  disabled?: boolean;
}

/** Shared target-language control for workflows that do not use the mic button. */
export const TargetLanguageBar = memo(function TargetLanguageBar({
  selectedSourceLang,
  selectedTargetLang,
  onTargetLangChange,
  disabled = false,
}: TargetLanguageBarProps) {
  const t = getUiStrings(selectedSourceLang.code);
  const targetOptions = SUPPORTED_LANGUAGES.filter(
    (language) => language.code !== selectedSourceLang.code
  );

  return (
    <section
      lang={t.locale}
      aria-label={t.controls.targetLanguage}
      className="control-panel rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white"
    >
      <label
        id="mobile-target-language-label"
        htmlFor="mobile-target-language"
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-pink-300"
      >
        {t.controls.targetShort}
        <span className="sr-only"> — {t.controls.targetLanguage}</span>
      </label>
      <LanguageNameSelect
        id="mobile-target-language"
        label={t.controls.targetLanguage}
        labelledBy="mobile-target-language-label"
        selectedLanguage={selectedTargetLang}
        onLanguageChange={onTargetLangChange}
        options={targetOptions}
        disabled={disabled}
      />
    </section>
  );
});
