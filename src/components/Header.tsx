import { memo, type ReactNode } from 'react';
import {
  Download,
  FileText,
  LoaderCircle,
  Mic,
  Settings,
  Volume2,
  Zap,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { getUiStrings } from '../constants/translations';
import type { LanguageOption } from '../types';

const ENGLISH_UI = getUiStrings('en');
const getEnglishLanguageName = (language: LanguageOption): string =>
  language.name.replace(/\s*\([^)]*[\u3131-\uD79D][^)]*\)\s*$/u, '').trim();

interface HeaderProps {
  isListening: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onSaveTranscript?: () => void;
  canSaveTranscript?: boolean;
  isAllInOnePage: boolean;
  onNavigate: (path: string) => void;
  selectedSourceLang: LanguageOption;
  onSourceLangChange: (lang: LanguageOption) => void;
}

interface HeaderIconButtonProps {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

function HeaderIconButton({
  label,
  title,
  onClick,
  disabled = false,
  children,
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-35 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-700 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950"
    >
      {children}
    </button>
  );
}

export const Header = memo(function Header({
  isListening,
  isConnecting,
  isSpeaking,
  hasApiKey,
  onOpenSettings,
  onSaveTranscript,
  canSaveTranscript = false,
  isAllInOnePage,
  onNavigate,
  selectedSourceLang,
  onSourceLangChange,
}: HeaderProps) {
  const t = ENGLISH_UI;
  const isActive = isListening || isConnecting;
  const activityStatus = isSpeaking
    ? t.speaking
    : isConnecting
      ? t.connecting
      : isListening
        ? t.listening
        : '';

  const languageSelector = (
    <div
      className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain py-1 scrollbar-none"
      role="group"
      aria-label="Source language"
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const selected = selectedSourceLang.code === language.code;
        return (
          <button
            type="button"
            key={language.code}
            onClick={() => onSourceLangChange(language)}
            disabled={isActive}
            title={`Source language: ${getEnglishLanguageName(language)}`}
            aria-label={`Source language: ${getEnglishLanguageName(language)}`}
            aria-pressed={selected}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
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

  return (
    <header className="app-header sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 px-3 py-2.5 text-slate-100 shadow-sm backdrop-blur-lg [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white/90 [[data-theme=light]_&]:text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="group flex min-h-11 min-w-11 shrink-0 items-center gap-2 text-left focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Go to LikeParrot Text First"
            lang="en"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-pink-500 text-base font-bold text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
              🦜
            </span>
            <span className="hidden min-[380px]:block">
              <span className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight">LikeParrot</span>
                <span className={`hidden rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wide sm:inline ${
                  isAllInOnePage
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 [[data-theme=light]_&]:text-emerald-700'
                    : 'border-indigo-500/30 bg-indigo-500/15 text-indigo-400 [[data-theme=light]_&]:text-indigo-700'
                }`}>
                  {isAllInOnePage ? 'Audio First' : 'Text First'}
                </span>
              </span>
              <span className="hidden max-w-[15rem] truncate text-[10px] text-slate-400 lg:block [[data-theme=light]_&]:text-slate-500">
                {isAllInOnePage ? t.allInOneSubtitle : t.subtitle}
              </span>
            </span>
          </button>

          <div className="hidden min-w-0 flex-1 px-2 md:block">
            {languageSelector}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {activityStatus}
            </span>
            <div className="hidden lg:block">
              {isSpeaking ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 text-xs font-semibold text-violet-400 [[data-theme=light]_&]:text-violet-700">
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> {t.speaking}
                </div>
              ) : isConnecting ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 text-xs font-semibold text-amber-400 [[data-theme=light]_&]:text-amber-800">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {t.connecting}
                </div>
              ) : isListening ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" /> {t.listening}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onNavigate(isAllInOnePage ? '/' : '/all_in_one')}
              title={isAllInOnePage ? 'Switch to Text First' : 'Switch to Audio First'}
              className={`flex h-11 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isAllInOnePage
                  ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-800 [[data-theme=light]_&]:hover:bg-slate-100'
                  : 'border-emerald-600 bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-600'
              }`}
            >
              {isAllInOnePage
                ? <FileText className="h-4 w-4" aria-hidden="true" />
                : <Zap className="h-4 w-4" aria-hidden="true" />}
              <span>{isAllInOnePage ? 'Text First' : 'Audio First'}</span>
            </button>

            {onSaveTranscript && (
              <HeaderIconButton
                label="Save transcript as HTML"
                title={canSaveTranscript ? 'Save the conversation transcript as HTML' : 'There is no transcript to save'}
                onClick={onSaveTranscript}
                disabled={!canSaveTranscript}
              >
                <Download className="h-4.5 w-4.5" aria-hidden="true" />
              </HeaderIconButton>
            )}

            <div className="relative">
              <HeaderIconButton
                label={hasApiKey ? 'Open settings' : 'Open settings; Gemini API key required'}
                title="Theme and Gemini API key settings"
                onClick={onOpenSettings}
              >
                <Settings className="h-4.5 w-4.5" aria-hidden="true" />
              </HeaderIconButton>
              {!hasApiKey && (
                <span
                  className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-amber-400 [[data-theme=light]_&]:border-white"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 border-t border-slate-800/70 pt-1.5 md:hidden [[data-theme=light]_&]:border-slate-200">
          {languageSelector}
        </div>
      </div>
    </header>
  );
});
