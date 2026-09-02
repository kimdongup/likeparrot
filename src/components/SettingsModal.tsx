import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Moon,
  ShieldAlert,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { ThemePreference } from '../services/preferences';
import type { LanguageOption } from '../types';
import { LanguageFlagSelect } from './LanguageFlagSelect';

const getEnglishLanguageName = (language: LanguageOption): string =>
  language.name.replace(/\s*\([^)]*[\u3131-\uD79D][^)]*\)\s*$/u, '').trim();

type ActionResult = boolean | void | Promise<boolean | void>;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  rememberApiKey: boolean;
  onSaveApiKey: (apiKey: string, rememberOnDevice: boolean) => ActionResult;
  onDeleteApiKey: () => ActionResult;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  sourceLanguage: LanguageOption;
  targetLanguage: LanguageOption;
  onSourceLanguageChange: (language: LanguageOption) => void;
  onTargetLanguageChange: (language: LanguageOption) => void;
  isFirstRun?: boolean;
  onContinueWithoutKey?: () => void;
}

type SettingsDialogProps = Omit<SettingsModalProps, 'isOpen'>;

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  { value: 'light', label: 'Light', description: 'Always use the light theme', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme', Icon: Moon },
  { value: 'system', label: 'System', description: 'Match your device setting', Icon: Monitor },
];

export function SettingsModal({ isOpen, ...dialogProps }: SettingsModalProps) {
  return isOpen ? <SettingsDialog {...dialogProps} /> : null;
}

function SettingsDialog({
  onClose,
  apiKey,
  rememberApiKey,
  onSaveApiKey,
  onDeleteApiKey,
  theme,
  onThemeChange,
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  isFirstRun = false,
  onContinueWithoutKey,
}: SettingsDialogProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [rememberOnDevice, setRememberOnDevice] = useState(rememberApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstRunAtOpenRef = useRef(isFirstRun);
  const shouldFocusApiKeyRef = useRef(!isFirstRun && !apiKey);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      if (firstRunAtOpenRef.current) dialogRef.current?.focus({ preventScroll: true });
      else if (shouldFocusApiKeyRef.current) inputRef.current?.focus();
      else dialogRef.current?.focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.hasAttribute('hidden') && element.tabIndex >= 0);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (document.activeElement === dialogRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey || saveState === 'saving' || isDeleting) return;

    setActionError(null);
    setSaveState('saving');
    try {
      const result = await onSaveApiKey(cleanKey, rememberOnDevice);
      if (result === false) {
        setRememberOnDevice(rememberApiKey);
        setActionError('The key may be active for this tab, but the storage preference could not be saved. Check your browser storage settings.');
        setSaveState('idle');
        return;
      }
      setInputKey(cleanKey);
      setSaveState('saved');
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => {
        savedTimerRef.current = null;
        setSaveState('idle');
      }, 1800);
    } catch {
      setActionError('The API key could not be saved. Please try again.');
      setSaveState('idle');
    }
  };

  const handleDelete = async () => {
    if (saveState === 'saving' || isDeleting) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      const result = await onDeleteApiKey();
      if (result === false) {
        setInputKey('');
        setRememberOnDevice(false);
        setShowKey(false);
        setSaveState('idle');
        setActionError('The API key could not be removed completely. Check this site’s browser data.');
        return;
      }
      setInputKey('');
      setRememberOnDevice(false);
      setShowKey(false);
      setSaveState('idle');
      inputRef.current?.focus();
    } catch {
      setActionError('The API key could not be deleted. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleThemeKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % themeOptions.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + themeOptions.length) % themeOptions.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = themeOptions.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onThemeChange(themeOptions[nextIndex].value);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))] backdrop-blur-sm sm:items-center sm:py-5 sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        aria-describedby={isFirstRun ? 'settings-first-run-description' : undefined}
        tabIndex={-1}
        lang="en"
        className="settings-panel flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl outline-none sm:max-w-xl sm:rounded-3xl [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-950"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6 [[data-theme=light]_&]:border-slate-200">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
              {isFirstRun ? 'Getting started' : 'LikeParrot'}
            </p>
            <h2 id="settings-title" className="text-balance text-lg font-bold tracking-tight sm:text-xl">
              {isFirstRun ? 'Connect your Gemini API key' : 'Settings'}
            </h2>
            {isFirstRun && (
              <p
                id="settings-first-run-description"
                className="mt-1.5 max-w-md text-sm leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600"
              >
                Audio First and Gemini translation require a personal API key.
                You can still use Text First with on-device or network translation without one.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className={`overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pt-6 ${
          isFirstRun
            ? 'pb-5 sm:pb-6'
            : 'pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6'
        }`}>
          <form onSubmit={handleSave} autoComplete="off" className="space-y-6">
            <section aria-labelledby="languages-heading" className="space-y-3">
              <h3 id="languages-heading" className="text-sm font-bold">Languages</h3>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-slate-50">
                <div className="min-w-0">
                  <label
                    id="settings-source-language-label"
                    htmlFor="settings-source-language"
                    className="mb-1.5 block text-[11px] font-semibold text-slate-400 [[data-theme=light]_&]:text-slate-600"
                  >
                    I speak<span className="sr-only"> — source language</span>
                  </label>
                  <div className="flex min-w-0 items-center gap-2">
                    <LanguageFlagSelect
                      id="settings-source-language"
                      label="Source language"
                      labelledBy="settings-source-language-label"
                      selectedLanguage={sourceLanguage}
                      onLanguageChange={onSourceLanguageChange}
                    />
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-300 [[data-theme=light]_&]:text-slate-700">
                      {getEnglishLanguageName(sourceLanguage)}
                    </span>
                  </div>
                </div>

                <ArrowRight className="mb-5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />

                <div className="min-w-0">
                  <label
                    id="settings-target-language-label"
                    htmlFor="settings-target-language"
                    className="mb-1.5 block text-[11px] font-semibold text-slate-400 [[data-theme=light]_&]:text-slate-600"
                  >
                    Translate to<span className="sr-only"> — translation and speech language</span>
                  </label>
                  <div className="flex min-w-0 items-center gap-2">
                    <LanguageFlagSelect
                      id="settings-target-language"
                      label="Translation and speech language"
                      labelledBy="settings-target-language-label"
                      selectedLanguage={targetLanguage}
                      onLanguageChange={onTargetLanguageChange}
                    />
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-300 [[data-theme=light]_&]:text-slate-700">
                      {getEnglishLanguageName(targetLanguage)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="api-key-heading" className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                <h3 id="api-key-heading" className="text-sm font-bold">Gemini API key</h3>
                {apiKey && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden="true" /> Saved
                  </span>
                )}
              </div>

              <div className="relative">
                <label htmlFor="settings-api-key" className="sr-only">Google AI Studio API key</label>
                <input
                  ref={inputRef}
                  id="settings-api-key"
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(event) => {
                    setInputKey(event.target.value);
                    setSaveState('idle');
                    setActionError(null);
                  }}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="AIzaSy..."
                  required
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 pr-12 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((visible) => !visible)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  aria-pressed={showKey}
                  className="absolute right-1 top-0 flex h-12 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:text-slate-900"
                >
                  {showKey
                    ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
                    : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs leading-5 text-slate-400 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-600">
                <p className="mb-2 font-semibold text-slate-200 [[data-theme=light]_&]:text-slate-800">
                  How to get an API key
                </p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open Google AI Studio using the link below.</li>
                  <li>Sign in with your Google account and select <strong>Create API key</strong>.</li>
                  <li>Copy the generated key, paste it above, and save it.</li>
                </ol>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:text-indigo-700"
                >
                  Create an API key in Google AI Studio
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>

              <div className="flex items-start gap-2 text-xs leading-5 text-amber-300/90 [[data-theme=light]_&]:text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  {rememberOnDevice
                    ? 'The key stays in this browser. Do not enable this on a shared device. '
                    : 'The key is stored only for this tab session. You will need to enter it again after closing the tab. '}
                  Public deployments should use short-lived backend tokens instead of placing a long-lived key in the browser.
                </p>
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-800">
                <input
                  type="checkbox"
                  checked={rememberOnDevice}
                  onChange={(event) => {
                    setRememberOnDevice(event.target.checked);
                    setSaveState('idle');
                    setActionError(null);
                  }}
                  className="h-5 w-5 shrink-0 accent-indigo-600"
                />
                <span>
                  <span className="block font-semibold">Remember the API key on this device</span>
                  <span className="block text-xs text-slate-400 [[data-theme=light]_&]:text-slate-600">Use this only on a personal device.</span>
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={!inputKey.trim() || saveState === 'saving' || isDeleting}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? (
                    <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved</>
                  ) : 'Save API key'}
                </button>
                {(apiKey || inputKey) && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saveState === 'saving' || isDeleting}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 [[data-theme=light]_&]:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> {isDeleting ? 'Deleting…' : 'Delete key'}
                  </button>
                )}
                <span className="sr-only" role="status" aria-live="polite">
                  {saveState === 'saved' ? 'The API key has been saved.' : ''}
                </span>
              </div>
              {actionError && (
                <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300 [[data-theme=light]_&]:text-rose-800">
                  {actionError}
                </p>
              )}
            </section>

            <section aria-labelledby="theme-heading" className="border-t border-slate-800 pt-5 [[data-theme=light]_&]:border-slate-200">
              <h3 id="theme-heading" className="mb-3 text-sm font-bold">Appearance</h3>
              <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-3 gap-2">
                {themeOptions.map(({ value, label, description, Icon }, index) => {
                  const selected = theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => onThemeChange(value)}
                      onKeyDown={(event) => handleThemeKeyDown(event, index)}
                      className={`min-h-[5.5rem] rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                        selected
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 [[data-theme=light]_&]:text-indigo-800'
                          : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-700'
                      }`}
                    >
                      <Icon className="mb-1.5 h-4.5 w-4.5" aria-hidden="true" />
                      <span className="block text-xs font-bold sm:text-sm">{label}</span>
                      <span className="mt-0.5 hidden text-[10px] leading-4 opacity-70 sm:block">{description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </form>
        </div>

        {isFirstRun && onContinueWithoutKey && (
          <footer className="shrink-0 border-t border-slate-800 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 [[data-theme=light]_&]:border-slate-200">
            <button
              type="button"
              onClick={onContinueWithoutKey}
              className="min-h-11 w-full rounded-xl text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-900"
            >
              Continue to Text First without an API key
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
