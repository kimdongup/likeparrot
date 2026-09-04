import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CircleHelp,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import type { UiStrings } from '../constants/translations';
import type { ApiKeyProviderCopy, ApiKeyProviderSpec } from '../services/apiKeyCatalog';
import { openApiKeyHelpWindow } from '../services/apiKeyHelpWindow';
import type { ApiKeyProvider } from '../services/preferences';

type ActionResult = boolean | void | Promise<boolean | void>;

export interface ApiKeySavedValues {
  apiKey: string;
  rememberApiKey: boolean;
  auxiliaryValue?: string;
  extraAuxiliaryValue?: string;
}

interface ApiKeySettingsPanelProps {
  spec: ApiKeyProviderSpec;
  copy: ApiKeyProviderCopy;
  saved: ApiKeySavedValues;
  t: UiStrings;
  onSave: (
    provider: ApiKeyProvider,
    apiKey: string,
    rememberOnDevice: boolean,
    auxiliaryValue?: string,
    extraAuxiliaryValue?: string
  ) => ActionResult;
  onDelete: (provider: ApiKeyProvider) => ActionResult;
}

export function ApiKeySettingsPanel({
  spec,
  copy,
  saved,
  t,
  onSave,
  onDelete,
}: ApiKeySettingsPanelProps) {
  const [inputKey, setInputKey] = useState(saved.apiKey);
  const [auxiliaryValue, setAuxiliaryValue] = useState(saved.auxiliaryValue ?? '');
  const [extraAuxiliaryValue, setExtraAuxiliaryValue] = useState(saved.extraAuxiliaryValue ?? '');
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [inlineHelp, setInlineHelp] = useState(false);
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

  const helpNotices = [
    copy.securityNotice,
    copy.auxiliaryHint,
    copy.extraAuxiliaryHint,
    t.settings.publicDeploymentWarning,
  ].filter((notice): notice is string => Boolean(notice?.trim()));

  const openHelp = () => {
    const opened = openApiKeyHelpWindow({
      title: copy.helpTitle,
      steps: copy.helpSteps,
      createKeyLabel: copy.createKeyLabel,
      createKeyUrl: spec.createKeyUrl,
      notices: helpNotices,
    });
    setInlineHelp(!opened);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey || saveState === 'saving' || isDeleting) return;
    if (spec.auxiliary?.required && !auxiliaryValue.trim()) return;
    setActionError(null);
    setSaveState('saving');
    try {
      const result = await onSave(
        spec.id,
        cleanKey,
        true,
        auxiliaryValue.trim(),
        extraAuxiliaryValue.trim()
      );
      if (result === false) {
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
      const result = await onDelete(spec.id);
      setInputKey('');
      setAuxiliaryValue('');
      setExtraAuxiliaryValue('');
      setShowKey(false);
      setSaveState('idle');
      if (result === false) setActionError('incomplete-delete');
    } catch {
      setActionError('delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const fieldClassName =
    'h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:placeholder:text-slate-400';

  return (
    <form
      onSubmit={handleSave}
      autoComplete="off"
      className="space-y-3"
      aria-labelledby={`${spec.id}-api-heading`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`${spec.id}-api-heading`} className="text-sm font-bold">
              {copy.title}
            </h3>
            {saved.apiKey && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 [[data-theme=light]_&]:text-emerald-700">
                <Check className="h-3 w-3" aria-hidden="true" /> {t.settings.apiSaved}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          onClick={openHelp}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:text-indigo-700 [[data-theme=light]_&]:hover:bg-indigo-50"
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          {t.settings.getKeyHelp}
        </button>
      </div>

      <div className="relative">
        <label htmlFor={`${spec.id}-api-key`} className="sr-only">{copy.inputLabel}</label>
        <input
          id={`${spec.id}-api-key`}
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
          placeholder={spec.keyPlaceholder}
          required
          className={`${fieldClassName} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowKey((visible) => !visible)}
          aria-label={showKey ? t.settings.hideKey : t.settings.showKey}
          aria-pressed={showKey}
          className="absolute right-1 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:text-slate-900"
        >
          {showKey
            ? <EyeOff className="h-4 w-4" aria-hidden="true" />
            : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {spec.auxiliary && copy.auxiliaryLabel && (
        <div>
          <label
            htmlFor={`${spec.id}-api-auxiliary`}
            className="mb-1 block text-[11px] font-semibold text-slate-300 [[data-theme=light]_&]:text-slate-700"
          >
            {copy.auxiliaryLabel}
          </label>
          <input
            id={`${spec.id}-api-auxiliary`}
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
            placeholder={spec.auxiliary.placeholder}
            required={spec.auxiliary.required}
            className={fieldClassName}
          />
        </div>
      )}

      {spec.extraAuxiliary && copy.extraAuxiliaryLabel && (
        <div>
          <label
            htmlFor={`${spec.id}-api-extra-auxiliary`}
            className="mb-1 block text-[11px] font-semibold text-slate-300 [[data-theme=light]_&]:text-slate-700"
          >
            {copy.extraAuxiliaryLabel}
          </label>
          <input
            id={`${spec.id}-api-extra-auxiliary`}
            type="text"
            value={extraAuxiliaryValue}
            onChange={(event) => {
              setExtraAuxiliaryValue(event.target.value);
              setSaveState('idle');
              setActionError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={spec.extraAuxiliary.placeholder}
            className={fieldClassName}
          />
        </div>
      )}

      {inlineHelp && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-600">
          <p className="mb-2 font-semibold text-amber-300 [[data-theme=light]_&]:text-amber-800">
            {t.settings.helpWindowBlocked}
          </p>
          <p className="mb-2 font-semibold text-slate-200 [[data-theme=light]_&]:text-slate-800">
            {copy.helpTitle}
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            {copy.helpSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <a
            href={spec.createKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center font-semibold text-indigo-400 underline-offset-4 hover:underline [[data-theme=light]_&]:text-indigo-700"
          >
            {copy.createKeyLabel}
          </a>
        </div>
      )}

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
        {(saved.apiKey || inputKey) && (
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
