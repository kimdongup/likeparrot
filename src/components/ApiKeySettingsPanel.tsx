import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { UiStrings } from '../constants/translations';
import type { ApiKeyProvider } from '../services/preferences';

type ActionResult = boolean | void | Promise<boolean | void>;

interface ApiKeySettingsPanelProps {
  provider: ApiKeyProvider;
  apiKey: string;
  rememberApiKey: boolean;
  title: string;
  description: string;
  inputLabel: string;
  placeholder: string;
  helpTitle: string;
  helpSteps: readonly [string, string, string];
  createKeyLabel: string;
  createKeyUrl: string;
  securityNotice?: string;
  auxiliaryInput?: {
    value: string;
    label: string;
    placeholder: string;
    hint?: string;
  };
  t: UiStrings;
  autoFocus?: boolean;
  onSave: (apiKey: string, rememberOnDevice: boolean, auxiliaryValue?: string) => ActionResult;
  onDelete: () => ActionResult;
}

export function ApiKeySettingsPanel({
  provider,
  apiKey,
  rememberApiKey,
  title,
  description,
  inputLabel,
  placeholder,
  helpTitle,
  helpSteps,
  createKeyLabel,
  createKeyUrl,
  securityNotice,
  auxiliaryInput,
  t,
  autoFocus = false,
  onSave,
  onDelete,
}: ApiKeySettingsPanelProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [auxiliaryValue, setAuxiliaryValue] = useState(auxiliaryInput?.value ?? '');
  const [rememberOnDevice, setRememberOnDevice] = useState(rememberApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<
    'storage' | 'save' | 'delete' | 'incomplete-delete' | null
  >(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
  }, []);

  const actionErrorMessage = actionError === 'storage'
    ? t.settings.storageError
    : actionError === 'save'
      ? t.settings.saveError
      : actionError === 'delete'
        ? t.settings.deleteError
        : actionError === 'incomplete-delete'
          ? t.settings.incompleteDeleteError
          : null;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey || saveState === 'saving' || isDeleting) return;
    setActionError(null);
    setSaveState('saving');
    try {
      const result = await onSave(cleanKey, rememberOnDevice, auxiliaryValue.trim());
      if (result === false) {
        setRememberOnDevice(rememberApiKey);
        setActionError('storage');
        setSaveState('idle');
        return;
      }
      setInputKey(cleanKey);
      setSaveState('saved');
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => {
        savedTimerRef.current = null;
        setSaveState('idle');
      }, 1_800);
    } catch {
      setActionError('save');
      setSaveState('idle');
    }
  };

  const handleDelete = async () => {
    if (saveState === 'saving' || isDeleting) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      const result = await onDelete();
      setInputKey('');
      setAuxiliaryValue('');
      setRememberOnDevice(false);
      setShowKey(false);
      setSaveState('idle');
      if (result === false) setActionError('incomplete-delete');
    } catch {
      setActionError('delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} autoComplete="off" className="space-y-5" aria-labelledby={`${provider}-api-heading`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          <h3 id={`${provider}-api-heading`} className="text-base font-bold">{title}</h3>
          {apiKey && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
              <Check className="h-3 w-3" aria-hidden="true" /> {t.settings.apiSaved}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600">
          {description}
        </p>
      </div>

      <div className="relative">
        <label htmlFor={`${provider}-api-key`} className="sr-only">{inputLabel}</label>
        <input
          id={`${provider}-api-key`}
          type={showKey ? 'text' : 'password'}
          value={inputKey}
          onChange={(event) => {
            setInputKey(event.target.value);
            setSaveState('idle');
            setActionError(null);
          }}
          autoFocus={autoFocus}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          placeholder={placeholder}
          required
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 pr-12 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setShowKey((visible) => !visible)}
          aria-label={showKey ? t.settings.hideKey : t.settings.showKey}
          aria-pressed={showKey}
          className="absolute right-1 top-0 flex h-12 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:text-slate-900"
        >
          {showKey
            ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
            : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
        </button>
      </div>

      {auxiliaryInput && (
        <div>
          <label
            htmlFor={`${provider}-api-auxiliary`}
            className="mb-1.5 block text-xs font-semibold text-slate-300 [[data-theme=light]_&]:text-slate-700"
          >
            {auxiliaryInput.label}
          </label>
          <input
            id={`${provider}-api-auxiliary`}
            type="text"
            value={auxiliaryValue}
            onChange={(event) => {
              setAuxiliaryValue(event.target.value);
              setSaveState('idle');
              setActionError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={auxiliaryInput.placeholder}
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:placeholder:text-slate-400"
          />
          {auxiliaryInput.hint && (
            <p className="mt-1.5 text-xs leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600">
              {auxiliaryInput.hint}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs leading-5 text-slate-400 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-600">
        <p className="mb-2 font-semibold text-slate-200 [[data-theme=light]_&]:text-slate-800">{helpTitle}</p>
        <ol className="list-decimal space-y-1 pl-4">
          {helpSteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <a
          href={createKeyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:text-indigo-700"
        >
          {createKeyLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="flex items-start gap-2 text-xs leading-5 text-amber-300/90 [[data-theme=light]_&]:text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {rememberOnDevice
            ? `${t.settings.persistentKeyWarning} `
            : `${t.settings.sessionKeyWarning} `}
          {securityNotice ?? t.settings.publicDeploymentWarning}
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
          <span className="block font-semibold">{t.settings.rememberKey}</span>
          <span className="block text-xs text-slate-400 [[data-theme=light]_&]:text-slate-600">{t.settings.personalDeviceOnly}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!inputKey.trim() || saveState === 'saving' || isDeleting}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          {saveState === 'saving' ? t.common.saving : saveState === 'saved' ? (
            <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t.common.saved}</>
          ) : t.settings.saveKey}
        </button>
        {(apiKey || inputKey) && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saveState === 'saving' || isDeleting}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 [[data-theme=light]_&]:text-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {isDeleting ? t.common.deleting : t.settings.deleteKey}
          </button>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {saveState === 'saved' ? t.common.saved : ''}
        </span>
      </div>

      {actionErrorMessage && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300 [[data-theme=light]_&]:text-rose-800">
          {actionErrorMessage}
        </p>
      )}
    </form>
  );
}
