import { useEffect, useRef, useState } from 'react';
import {
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
  { value: 'light', label: '밝게', description: '항상 밝은 화면', Icon: Sun },
  { value: 'dark', label: '어둡게', description: '항상 어두운 화면', Icon: Moon },
  { value: 'system', label: '시스템', description: '기기 설정과 맞춤', Icon: Monitor },
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
  const shouldFocusApiKeyRef = useRef(isFirstRun || !apiKey);
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
      if (shouldFocusApiKeyRef.current) inputRef.current?.focus();
      else dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
        setActionError('키는 현재 탭에 적용됐을 수 있지만 저장 옵션을 완료하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.');
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
      setActionError('API 키 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
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
        setActionError('API 키를 완전히 삭제하지 못했습니다. 브라우저 사이트 데이터를 확인해 주세요.');
        return;
      }
      setInputKey('');
      setRememberOnDevice(false);
      setShowKey(false);
      setSaveState('idle');
      inputRef.current?.focus();
    } catch {
      setActionError('API 키 삭제 중 오류가 발생했습니다. 다시 시도해 주세요.');
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-5"
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
        lang="ko"
        className="settings-panel flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl outline-none sm:max-w-xl sm:rounded-3xl [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-950"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6 [[data-theme=light]_&]:border-slate-200">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
              {isFirstRun ? '처음 시작하기' : 'LikeParrot'}
            </p>
            <h2 id="settings-title" className="text-balance text-lg font-bold tracking-tight sm:text-xl">
              {isFirstRun ? 'Gemini API 키를 먼저 연결해 주세요' : '설정'}
            </h2>
            {isFirstRun && (
              <p
                id="settings-first-run-description"
                className="mt-1.5 max-w-md text-sm leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600"
              >
                소리먼저와 Gemini 번역을 사용하려면 개인 API 키가 필요합니다.
                키 없이도 글먼저의 기기 내장·네트워크 번역은 사용할 수 있습니다.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
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
            <section aria-labelledby="api-key-heading" className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                <h3 id="api-key-heading" className="text-sm font-bold">Gemini API 키</h3>
                {apiKey && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden="true" /> 저장됨
                  </span>
                )}
              </div>

              <div className="relative">
                <label htmlFor="settings-api-key" className="sr-only">Google AI Studio API 키</label>
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
                  aria-label={showKey ? 'API 키 숨기기' : 'API 키 보기'}
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
                  API 키 가져오는 방법
                </p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>아래 링크로 Google AI Studio를 엽니다.</li>
                  <li>Google 계정으로 로그인하고 <span lang="en">Create API key</span>를 선택합니다.</li>
                  <li>생성된 키를 복사해 위 입력란에 붙여넣고 저장합니다.</li>
                </ol>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:text-indigo-700"
                >
                  Google AI Studio에서 API 키 만들기
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>

              <div className="flex items-start gap-2 text-xs leading-5 text-amber-300/90 [[data-theme=light]_&]:text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  {rememberOnDevice
                    ? '키가 이 브라우저에 계속 저장됩니다. 공유 기기에서는 선택하지 마세요. '
                    : '키는 이 탭의 세션에만 저장됩니다. 탭을 닫으면 다시 입력해야 합니다. '}
                  공개 서비스는 브라우저에 장기 키를 넣지 말고 백엔드 임시 토큰을 사용해야 합니다.
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
                  <span className="block font-semibold">이 기기에 API 키 기억하기</span>
                  <span className="block text-xs text-slate-500 [[data-theme=light]_&]:text-slate-600">개인 기기에서만 사용하세요.</span>
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={!inputKey.trim() || saveState === 'saving' || isDeleting}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? (
                    <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> 저장됨</>
                  ) : 'API 키 저장'}
                </button>
                {(apiKey || inputKey) && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saveState === 'saving' || isDeleting}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 [[data-theme=light]_&]:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> {isDeleting ? '삭제 중…' : '키 삭제'}
                  </button>
                )}
                <span className="sr-only" role="status" aria-live="polite">
                  {saveState === 'saved' ? 'API 키가 저장되었습니다.' : ''}
                </span>
              </div>
              {actionError && (
                <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300 [[data-theme=light]_&]:text-rose-800">
                  {actionError}
                </p>
              )}
            </section>

            <section aria-labelledby="theme-heading" className="border-t border-slate-800 pt-5 [[data-theme=light]_&]:border-slate-200">
              <h3 id="theme-heading" className="mb-3 text-sm font-bold">화면 테마</h3>
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
              API 키 없이 글먼저로 계속하기
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
