import { memo } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type { LanguageOption } from '../types';
import { getUiStrings } from '../constants/translations';
import { LanguageNameSelect } from './LanguageNameSelect';

interface ControlsProps {
  isListening: boolean;
  isConnecting: boolean;
  onToggleListening: () => void;
  selectedSourceLang: LanguageOption;
  selectedTargetLang: LanguageOption;
  onTargetLangChange: (lang: LanguageOption) => void;
  disabled?: boolean;
}

export const Controls = memo(function Controls({
  isListening,
  isConnecting,
  onToggleListening,
  selectedSourceLang,
  selectedTargetLang,
  onTargetLangChange,
  disabled,
}: ControlsProps) {
  const t = getUiStrings(selectedSourceLang.code);
  const isActive = isListening || isConnecting;
  const targetOptions = SUPPORTED_LANGUAGES.filter(
    (language) => language.code !== selectedSourceLang.code
  );

  return (
    <section lang={t.locale} aria-label={t.controls.ariaLabel} className="control-panel bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-slate-200">
      <div className="grid grid-cols-[7.75rem_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
        <div className="min-w-0">
          <label
            id="target-language-label"
            htmlFor="target-language"
            className="mb-1.5 block truncate text-center text-[10px] font-bold uppercase tracking-wider text-pink-300"
          >
            {t.controls.targetShort}<span className="sr-only"> — {t.controls.targetLanguage}</span>
          </label>
          <LanguageNameSelect
            id="target-language"
            label={t.controls.targetLanguage}
            labelledBy="target-language-label"
            selectedLanguage={selectedTargetLang}
            onLanguageChange={onTargetLangChange}
            options={targetOptions}
            disabled={isActive}
          />
        </div>

        <div className="flex min-w-0 flex-col items-stretch justify-end">
          <p className="mb-1.5 line-clamp-2 min-w-0 text-left text-[11px] leading-4 text-slate-400" role="status" aria-live="polite">
            {isConnecting ? t.common.connecting : isListening ? t.controls.micOnHint : t.controls.micIdleHint}
          </p>
          <button
            type="button"
            onClick={onToggleListening}
            disabled={disabled}
            aria-busy={isConnecting}
            className={`relative group flex h-16 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold leading-4 shadow-lg transition-all duration-300 cursor-pointer touch-manipulation sm:gap-2.5 sm:px-6 sm:text-lg sm:leading-tight ${
              disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isActive
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30 scale-102 ring-4 ring-rose-500/20 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30 hover:scale-102 active:scale-98'
            }`}
          >
            {isActive ? (
              <>
                <MicOff className="h-5 w-5 shrink-0 max-[359px]:hidden sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="min-w-0 break-words text-center [hyphens:auto]">{t.controls.stop}</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 shrink-0 max-[359px]:hidden sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="min-w-0 break-words text-center [hyphens:auto]">{t.controls.start}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
});
