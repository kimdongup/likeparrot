import { memo, type ReactNode } from 'react';
import {
  ArrowLeft,
  Download,
  LoaderCircle,
  Mic,
  PanelLeft,
  Settings,
  Volume2,
} from 'lucide-react';
import { getUiStrings } from '../constants/translations';
import type { LanguageOption } from '../types';
import { SourceLanguageFlags } from './SourceLanguageFlags';

interface HeaderProps {
  isListening: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  hasConfigurationIssue: boolean;
  onOpenSettings: () => void;
  onSaveTranscript?: () => void;
  canSaveTranscript?: boolean;
  isBillingPlanPage: boolean;
  onNavigate: (path: string) => void;
  selectedSourceLang: LanguageOption;
  onSourceLangChange: (lang: LanguageOption) => void;
  workflowLabel?: string;
  onOpenWorkflow?: () => void;
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
  hasConfigurationIssue,
  onOpenSettings,
  onSaveTranscript,
  canSaveTranscript = false,
  isBillingPlanPage,
  onNavigate,
  selectedSourceLang,
  onSourceLangChange,
  workflowLabel,
  onOpenWorkflow,
}: HeaderProps) {
  const t = getUiStrings(selectedSourceLang.code);
  const isActive = isListening || isConnecting;
  const activityStatus = isSpeaking
    ? t.common.speaking
    : isConnecting
      ? t.common.connecting
      : isListening
        ? t.common.listening
        : '';

  const languageSelector = (
    <SourceLanguageFlags
      selectedLanguage={selectedSourceLang}
      onLanguageChange={onSourceLangChange}
      disabled={isActive}
    />
  );

  return (
    <header className="app-header sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 px-3 py-2.5 text-slate-100 shadow-sm backdrop-blur-lg [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white/90 [[data-theme=light]_&]:text-slate-950">
      <div className="w-full">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="group flex min-h-11 min-w-11 shrink-0 items-center gap-2 text-left focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label={t.header.home}
              lang={t.locale}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-pink-500 text-base font-bold text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
                🦜
              </span>
              <span className="hidden min-[380px]:block">
                <span className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight">LikeParrot</span>
                  {isBillingPlanPage && (
                    <span className="hidden rounded-md border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cyan-300 sm:inline [[data-theme=light]_&]:text-cyan-700">
                      {t.header.billingPlan}
                    </span>
                  )}
                </span>
                <span className="hidden max-w-[15rem] truncate text-[10px] text-slate-400 lg:block [[data-theme=light]_&]:text-slate-500">
                  {isBillingPlanPage
                    ? t.header.billingSubtitle
                    : t.pipeline.subtitle}
                </span>
              </span>
            </button>
            {!isBillingPlanPage && onOpenWorkflow && (
              <button
                type="button"
                onClick={onOpenWorkflow}
                title={t.header.openWorkflowTitle}
                className="hidden max-w-[9rem] truncate rounded-md border border-slate-600/60 bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-300 hover:border-indigo-400/70 sm:inline md:hidden [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-100 [[data-theme=light]_&]:text-slate-700"
              >
                {workflowLabel ?? t.header.openWorkflow}
              </button>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 px-2 md:block">
            {languageSelector}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isBillingPlanPage && (
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-800 [[data-theme=light]_&]:hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.header.backToHome}
              </button>
            )}
            {!isBillingPlanPage && onOpenWorkflow && (
              <button
                type="button"
                onClick={onOpenWorkflow}
                aria-label={t.header.openWorkflow}
                title={t.header.openWorkflowTitle}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 md:hidden [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-700 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950"
              >
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {activityStatus}
            </span>
            <div className="hidden lg:block">
              {isSpeaking ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 text-xs font-semibold text-violet-400 [[data-theme=light]_&]:text-violet-700">
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.speaking}
                </div>
              ) : isConnecting ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 text-xs font-semibold text-amber-400 [[data-theme=light]_&]:text-amber-800">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {t.common.connecting}
                </div>
              ) : isListening ? (
                <div className="flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.listening}
                </div>
              ) : null}
            </div>

            {onSaveTranscript && (
              <HeaderIconButton
                label={t.header.saveTranscript}
                title={canSaveTranscript ? t.header.saveTranscriptTitle : t.header.noTranscriptToSave}
                onClick={onSaveTranscript}
                disabled={!canSaveTranscript}
              >
                <Download className="h-4.5 w-4.5" aria-hidden="true" />
              </HeaderIconButton>
            )}

            <div className="relative">
              <HeaderIconButton
                label={hasConfigurationIssue ? t.header.openSettingsNeedsKey : t.header.openSettings}
                title={t.header.settingsTitle}
                onClick={onOpenSettings}
              >
                <Settings className="h-4.5 w-4.5" aria-hidden="true" />
              </HeaderIconButton>
              {hasConfigurationIssue && (
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
