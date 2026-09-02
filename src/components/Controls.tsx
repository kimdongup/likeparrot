import { memo } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type { LanguageOption } from '../types';
import { getUiStrings } from '../constants/translations';

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

  return (
    <section lang="ko" aria-label="통역 실행 제어" className="control-panel bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] items-end gap-3 sm:gap-4">
        <div className="min-w-0">
          <label
            htmlFor="target-language"
            className="text-xs font-semibold text-pink-300 mb-1.5 flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-pink-400" aria-hidden="true" />
              <span>{t.targetLangLabel}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedTargetLang.flag}{' '}
              <span lang={selectedTargetLang.code}>{selectedTargetLang.nativeName}</span>
            </span>
          </label>
          <select
            id="target-language"
            value={selectedTargetLang.code}
            onChange={(event) => {
              const found = SUPPORTED_LANGUAGES.find((language) => language.code === event.target.value);
              if (found) onTargetLangChange(found);
            }}
            disabled={isActive}
            className="w-full min-h-12 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-pink-500 disabled:opacity-60 transition-all cursor-pointer shadow-inner"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code} lang={language.code}>
                {language.flag} {language.name} ({language.nativeName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-stretch justify-end">
          <button
            type="button"
            onClick={onToggleListening}
            disabled={disabled}
            aria-busy={isConnecting}
            className={`relative group min-h-12 flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 shadow-lg w-full cursor-pointer touch-manipulation ${
              disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isActive
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30 scale-102 ring-4 ring-rose-500/20 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30 hover:scale-102 active:scale-98'
            }`}
          >
            {isActive ? (
              <>
                <MicOff className="w-5 h-5" aria-hidden="true" />
                <span>{t.stopListening}</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" aria-hidden="true" />
                <span>{t.startListening}</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 mt-1.5 text-center sm:text-left">
            {isConnecting ? t.connecting : isListening ? t.micListeningHint : t.micIdleHint}
          </p>
        </div>
      </div>
    </section>
  );
});
