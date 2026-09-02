import { memo } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { LanguageOption } from '../types';
import { getUiStrings } from '../constants/translations';
import { LanguageFlagSelect } from './LanguageFlagSelect';

const ENGLISH_UI = getUiStrings('en');

interface ControlsProps {
  isListening: boolean;
  isConnecting: boolean;
  onToggleListening: () => void;
  selectedTargetLang: LanguageOption;
  onTargetLangChange: (lang: LanguageOption) => void;
  disabled?: boolean;
}

export const Controls = memo(function Controls({
  isListening,
  isConnecting,
  onToggleListening,
  selectedTargetLang,
  onTargetLangChange,
  disabled,
}: ControlsProps) {
  const t = ENGLISH_UI;
  const isActive = isListening || isConnecting;

  return (
    <section lang="en" aria-label="Live interpretation controls" className="control-panel bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-slate-200">
      <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-end gap-3 sm:gap-4">
        <div className="min-w-0">
          <label
            id="target-language-label"
            htmlFor="target-language"
            className="mb-1.5 block truncate text-center text-[10px] font-bold uppercase tracking-wider text-pink-300"
          >
            To<span className="sr-only"> — translation and speech language</span>
          </label>
          <LanguageFlagSelect
            id="target-language"
            label="Translation and speech language"
            labelledBy="target-language-label"
            selectedLanguage={selectedTargetLang}
            onLanguageChange={onTargetLangChange}
            disabled={isActive}
            className="border-pink-500/40 hover:border-pink-400 focus-within:border-pink-400 focus-within:ring-pink-400"
          />
        </div>

        <div className="flex min-w-0 flex-col items-stretch justify-end">
          <p className="mb-1.5 line-clamp-2 min-w-0 text-left text-[11px] leading-4 text-slate-400" role="status" aria-live="polite">
            {isConnecting ? t.connecting : isListening ? t.micListeningHint : t.micIdleHint}
          </p>
          <button
            type="button"
            onClick={onToggleListening}
            disabled={disabled}
            aria-busy={isConnecting}
            className={`relative group flex h-16 w-full min-w-0 items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold leading-tight shadow-lg transition-all duration-300 cursor-pointer touch-manipulation sm:px-6 sm:text-lg ${
              disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isActive
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30 scale-102 ring-4 ring-rose-500/20 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30 hover:scale-102 active:scale-98'
            }`}
          >
            {isActive ? (
              <>
                <MicOff className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-center">{t.stopListening}</span>
              </>
            ) : (
              <>
                <Mic className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-center">{t.startListening}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
});
