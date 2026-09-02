import { useEffect, useRef, useState } from 'react';
import { Bot, Cloud, KeyRound, Palette, ReceiptText, X } from 'lucide-react';
import { getUiStrings } from '../constants/translations';
import type { ApiKeyProvider, ThemePreference } from '../services/preferences';
import type { SoundFirstModelId } from '../services/liveTranslation';
import type { LanguageOption } from '../types';
import { ApiKeySettingsPanel } from './ApiKeySettingsPanel';
import { AppearanceSettingsPanel } from './AppearanceSettingsPanel';
import { SourceLanguageFlags } from './SourceLanguageFlags';

type ActionResult = boolean | void | Promise<boolean | void>;
type SettingsSection = 'gemini' | 'openai' | 'azure' | 'appearance';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiApiKey: string;
  rememberGeminiApiKey: boolean;
  openAiApiKey: string;
  rememberOpenAiApiKey: boolean;
  azureApiKey: string;
  azureRegion: string;
  rememberAzureApiKey: boolean;
  selectedSoundFirstModelId: SoundFirstModelId;
  onSaveApiKey: (
    provider: ApiKeyProvider,
    apiKey: string,
    rememberOnDevice: boolean,
    auxiliaryValue?: string
  ) => ActionResult;
  onDeleteApiKey: (provider: ApiKeyProvider) => ActionResult;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  sourceLanguage: LanguageOption;
  onSourceLanguageChange: (language: LanguageOption) => void;
  onOpenBillingPlan: () => void;
}

type SettingsDialogProps = Omit<SettingsModalProps, 'isOpen'>;

export function SettingsModal({ isOpen, ...dialogProps }: SettingsModalProps) {
  return isOpen ? <SettingsDialog {...dialogProps} /> : null;
}

function SettingsDialog({
  onClose,
  geminiApiKey,
  rememberGeminiApiKey,
  openAiApiKey,
  rememberOpenAiApiKey,
  azureApiKey,
  azureRegion,
  rememberAzureApiKey,
  selectedSoundFirstModelId,
  onSaveApiKey,
  onDeleteApiKey,
  theme,
  onThemeChange,
  sourceLanguage,
  onSourceLanguageChange,
  onOpenBillingPlan,
}: SettingsDialogProps) {
  const initialSection: SettingsSection = selectedSoundFirstModelId === 'gpt-realtime-translate'
    ? 'openai'
    : 'gemini';
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const t = getUiStrings(sourceLanguage.code);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.closest('[hidden]') && element.tabIndex >= 0);
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
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  const sections = [
    { id: 'gemini' as const, label: t.settings.geminiApi, Icon: KeyRound, saved: Boolean(geminiApiKey) },
    { id: 'openai' as const, label: t.settings.openAiApi, Icon: Bot, saved: Boolean(openAiApiKey) },
    { id: 'azure' as const, label: t.settings.azureApi, Icon: Cloud, saved: Boolean(azureApiKey) },
    { id: 'appearance' as const, label: t.settings.appearance, Icon: Palette, saved: false },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))] backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        lang={t.locale}
        className="settings-panel flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl outline-none sm:max-w-4xl sm:rounded-3xl [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-slate-950"
      >
        <header className="shrink-0 border-b border-slate-800 px-4 py-3 sm:px-5 [[data-theme=light]_&]:border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
                LikeParrot
              </p>
              <h2 id="settings-title" className="text-lg font-bold tracking-tight sm:text-xl">
                {t.settings.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.settings.close}
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <SourceLanguageFlags
            selectedLanguage={sourceLanguage}
            onLanguageChange={onSourceLanguageChange}
            className="mt-2"
          />
        </header>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label={t.settings.navigation}
            className="w-[4.25rem] shrink-0 border-r border-slate-800 bg-slate-950/35 p-2 sm:w-48 sm:p-3 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-slate-50"
          >
            <div role="tablist" aria-orientation="vertical" aria-label={t.settings.selectSection} className="space-y-1.5">
              {sections.map(({ id, label, Icon, saved }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`settings-panel-${id}`}
                    id={`settings-tab-${id}`}
                    onClick={() => setSection(id)}
                    className={`relative flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:justify-start sm:px-3 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 [[data-theme=light]_&]:hover:bg-white [[data-theme=light]_&]:hover:text-slate-900'
                    }`}
                    title={label}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">{label}</span>
                    {saved && id !== 'appearance' && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border-t border-slate-800 pt-3 [[data-theme=light]_&]:border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBillingPlan();
                }}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:justify-start sm:px-3 [[data-theme=light]_&]:text-cyan-700 [[data-theme=light]_&]:hover:bg-cyan-50 [[data-theme=light]_&]:hover:text-cyan-900"
                title={t.header.billingPlanTitle}
                aria-label={t.header.billingPlanTitle}
              >
                <ReceiptText className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t.header.billingPlan}</span>
              </button>
            </div>
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
            <div id="settings-panel-gemini" role="tabpanel" aria-labelledby="settings-tab-gemini" hidden={section !== 'gemini'}>
              <ApiKeySettingsPanel
                provider="gemini"
                apiKey={geminiApiKey}
                rememberApiKey={rememberGeminiApiKey}
                title={t.settings.apiKey}
                description={t.settings.geminiApiDescription}
                inputLabel={t.settings.apiInputLabel}
                placeholder="AIzaSy..."
                helpTitle={t.settings.howToGetKey}
                helpSteps={[t.settings.apiStep1, t.settings.apiStep2, t.settings.apiStep3]}
                createKeyLabel={t.settings.createKey}
                createKeyUrl="https://aistudio.google.com/app/apikey"
                t={t}
                onSave={(key, remember) => onSaveApiKey('gemini', key, remember)}
                onDelete={() => onDeleteApiKey('gemini')}
              />
            </div>

            <div id="settings-panel-openai" role="tabpanel" aria-labelledby="settings-tab-openai" hidden={section !== 'openai'}>
              <ApiKeySettingsPanel
                provider="openai"
                apiKey={openAiApiKey}
                rememberApiKey={rememberOpenAiApiKey}
                title={t.settings.openAiApiKey}
                description={t.settings.openAiApiDescription}
                inputLabel={t.settings.openAiApiInputLabel}
                placeholder="sk-..."
                helpTitle={t.settings.openAiHowToGetKey}
                helpSteps={[t.settings.openAiApiStep1, t.settings.openAiApiStep2, t.settings.openAiApiStep3]}
                createKeyLabel={t.settings.createOpenAiKey}
                createKeyUrl="https://platform.openai.com/api-keys"
                securityNotice={t.settings.openAiTokenNotice}
                t={t}
                onSave={(key, remember) => onSaveApiKey('openai', key, remember)}
                onDelete={() => onDeleteApiKey('openai')}
              />
            </div>

            <div id="settings-panel-azure" role="tabpanel" aria-labelledby="settings-tab-azure" hidden={section !== 'azure'}>
              <ApiKeySettingsPanel
                provider="azure"
                apiKey={azureApiKey}
                rememberApiKey={rememberAzureApiKey}
                title={t.settings.azureApiKey}
                description={t.settings.azureApiDescription}
                inputLabel={t.settings.azureApiInputLabel}
                placeholder="Azure Translator key"
                auxiliaryInput={{
                  value: azureRegion,
                  label: t.settings.azureRegion,
                  placeholder: 'koreacentral',
                  hint: t.settings.azureRegionHint,
                }}
                helpTitle={t.settings.azureHowToGetKey}
                helpSteps={[t.settings.azureApiStep1, t.settings.azureApiStep2, t.settings.azureApiStep3]}
                createKeyLabel={t.settings.createAzureKey}
                createKeyUrl="https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation"
                securityNotice={t.settings.azureTokenNotice}
                t={t}
                onSave={(key, remember, region) => onSaveApiKey('azure', key, remember, region)}
                onDelete={() => onDeleteApiKey('azure')}
              />
            </div>

            <div id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" hidden={section !== 'appearance'}>
              <AppearanceSettingsPanel theme={theme} t={t} onThemeChange={onThemeChange} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
