import { lazy, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { AllInOneBanner } from './components/AllInOneBanner';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { PipelineBoard } from './components/PipelineBoard';
import { SettingsModal } from './components/SettingsModal';
import { TranscriptTerminal } from './components/TranscriptTerminal';
import { getUiStrings } from './constants/translations';
import { useLikeParrotController } from './hooks/useLikeParrotController';

const BillingPlanPage = lazy(() => import('./components/BillingPlanPage').then((module) => ({
  default: module.BillingPlanPage,
})));

export function App() {
  const {
    view,
    activity,
    languages,
    pipeline,
    soundFirst,
    transcript,
    settings,
    actions,
  } = useLikeParrotController();
  const t = getUiStrings(languages.source.code);
  const selectedLiveApiKey = soundFirst.selectedModelId === 'gpt-realtime-translate'
    ? settings.openAiApiKey
    : settings.geminiApiKey;

  return (
    <div className="app-shell min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header
        isListening={activity.isListening}
        isConnecting={activity.isConnecting}
        isSpeaking={activity.isSpeaking}
        hasApiKey={Boolean(selectedLiveApiKey)}
        onOpenSettings={actions.openSettings}
        onSaveTranscript={actions.saveTranscript}
        canSaveTranscript={transcript.cards.length > 0}
        isAllInOnePage={view.isSoundFirstPage}
        isBillingPlanPage={view.isBillingPlanPage}
        onNavigate={actions.navigate}
        selectedSourceLang={languages.source}
        onSourceLangChange={languages.changeSource}
      />

      <main className="app-main flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4 sm:gap-5">
        {view.errorMessage && (
          <div
            role="alert"
            lang={t.locale}
            className="app-alert p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 [[data-theme=light]_&]:text-rose-800"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold">{t.common.notice}</p>
              <p className="text-xs text-rose-200 mt-0.5 [[data-theme=light]_&]:text-rose-800">
                {view.errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={actions.dismissError}
              className="-my-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 [[data-theme=light]_&]:text-rose-700 [[data-theme=light]_&]:hover:text-rose-900"
            >
              {t.common.dismiss}
            </button>
          </div>
        )}

        {view.isBillingPlanPage ? (
          <Suspense fallback={(
            <div
              role="status"
              className="min-h-40 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-muted)]"
            >
              {t.common.connecting}
            </div>
          )}>
            <BillingPlanPage uiLanguageCode={languages.source.code} />
          </Suspense>
        ) : (
          <>
            {view.isSoundFirstPage ? (
              <AllInOneBanner
                isListening={activity.isListening}
                isConnecting={activity.isConnecting}
                isSpeaking={activity.isSpeaking}
                lastLatencyMs={view.soundFirstLatencyMs}
                uiLanguageCode={languages.source.code}
                selectedModelId={soundFirst.selectedModelId}
                isSelectedModelConfigured={soundFirst.isSelectedModelConfigured}
                models={soundFirst.models}
                onModelChange={soundFirst.changeModel}
              />
            ) : (
              <PipelineBoard
                pipeline={pipeline.status}
                selections={pipeline.selections}
                onSelectionChange={pipeline.changeSelections}
                isListening={pipeline.isListeningOrConnecting}
                isSpeaking={activity.isSpeaking}
                uiLanguageCode={languages.source.code}
              />
            )}

            <Controls
              isListening={activity.isListening}
              isConnecting={activity.isConnecting}
              onToggleListening={actions.toggleListening}
              selectedSourceLang={languages.source}
              selectedTargetLang={languages.target}
              onTargetLangChange={languages.changeTarget}
              disabled={false}
            />

            <TranscriptTerminal
              cards={transcript.cards}
              playingCardId={transcript.playingCardId}
              onPlayCard={transcript.play}
              onStopCard={transcript.stop}
              onDeleteCard={transcript.delete}
              onClearAll={transcript.clear}
              interimText={transcript.interimText}
              isTranslating={transcript.isTranslating}
              streamingTranslation={transcript.streamingTranslation}
              sourceLangCode={languages.source.speechCode}
              targetLangCode={languages.target.speechCode}
            />
          </>
        )}
      </main>

      <SettingsModal
        isOpen={settings.isOpen}
        onClose={settings.close}
        geminiApiKey={settings.geminiApiKey}
        rememberGeminiApiKey={settings.rememberGeminiApiKey}
        openAiApiKey={settings.openAiApiKey}
        rememberOpenAiApiKey={settings.rememberOpenAiApiKey}
        selectedSoundFirstModelId={soundFirst.selectedModelId}
        onSaveApiKey={settings.saveApiKey}
        onDeleteApiKey={settings.deleteApiKey}
        theme={settings.theme}
        onThemeChange={settings.changeTheme}
        sourceLanguage={languages.source}
        onSourceLanguageChange={languages.changeSource}
        onOpenBillingPlan={() => actions.navigate('/billingplan')}
      />
    </div>
  );
}

export default App;
