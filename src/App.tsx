import { lazy, Suspense, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { MobileDictationComposer } from './components/MobileDictationComposer';
import { SettingsModal } from './components/SettingsModal';
import { TargetLanguageBar } from './components/TargetLanguageBar';
import { TranscriptTerminal } from './components/TranscriptTerminal';
import { WorkflowSidebar } from './components/WorkflowDrawer';
import { resolveWorkflowCopy, WorkflowActiveFlow } from './components/WorkflowPicker';
import { getUiStrings } from './constants/translations';
import { useLikeParrotController } from './hooks/useLikeParrotController';
import {
  getMobileDictationComposerCopy,
  getWorkflowPickerCopy,
} from './services/workflowPresentation';

const BillingPlanPage = lazy(() => import('./components/BillingPlanPage').then((module) => ({
  default: module.BillingPlanPage,
})));

export function App() {
  const {
    view,
    activity,
    languages,
    workflow,
    transcript,
    settings,
    actions,
  } = useLikeParrotController();
  const t = getUiStrings(languages.source.code);
  const workflowCopy = getWorkflowPickerCopy(
    languages.source.code,
    workflow.profiles,
    workflow.availability
  );
  const mobileComposerCopy = getMobileDictationComposerCopy(languages.source.code);
  const displayedProfile = workflow.activeProfile ?? workflow.profiles.find(
    (profile) => profile.id === workflow.selectedId
  );
  const workflowLabel = displayedProfile
    ? workflowCopy.profileLabels?.[displayedProfile.id] ?? displayedProfile.shortLabel
    : undefined;
  const workflowBusy = activity.isListening || activity.isConnecting ||
    activity.isSpeaking || transcript.isTranslating;
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [flowProfileId, setFlowProfileId] = useState<typeof workflow.selectedId | null>(null);
  const isAutomatic = workflow.selectedId === 'auto';
  const pickerValue = isAutomatic
    ? workflow.resolvedProfileId ?? workflow.selectedId
    : workflow.selectedId;
  const flowProfile = flowProfileId
    ? workflow.profiles.find((profile) => profile.id === flowProfileId)
    : undefined;
  const resolvedWorkflowCopy = resolveWorkflowCopy(workflowCopy);

  return (
    <div className="app-shell flex min-h-screen selection:bg-indigo-500 selection:text-white">
      {!view.isBillingPlanPage && (
        <WorkflowSidebar
          expanded={sidebarExpanded}
          mobileOpen={mobileSidebarOpen}
          expandLabel={t.header.expandSidebar}
          collapseLabel={t.header.collapseSidebar}
          onExpandedChange={setSidebarExpanded}
          onMobileOpenChange={setMobileSidebarOpen}
          profiles={workflow.profiles}
          value={pickerValue}
          selectedId={workflow.selectedId}
          availability={workflow.availability}
          resolvedProfileId={workflow.resolvedProfileId}
          onChange={workflow.change}
          disabled={workflowBusy}
          copy={workflowCopy}
          isAutomatic={isAutomatic}
          flowProfileId={flowProfileId}
          onToggleFlow={(id) => {
            setFlowProfileId((current) => current === id ? null : id);
          }}
        />
      )}
      {flowProfile && !view.isBillingPlanPage && (
        <section
          className="sticky top-0 hidden h-dvh w-[min(24rem,38vw)] shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] md:flex"
          aria-label={resolvedWorkflowCopy.activeFlowTitle}
        >
          <WorkflowActiveFlow
            activeProfile={flowProfile}
            copy={resolvedWorkflowCopy}
            instanceId="desktop-flow"
            automaticNote={
              isAutomatic && flowProfile.id === workflow.resolvedProfileId
                ? resolvedWorkflowCopy.usingAutomaticLabel
                : undefined
            }
            onClose={() => setFlowProfileId(null)}
          />
        </section>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
      <Header
        isListening={activity.isListening}
        isConnecting={activity.isConnecting}
        isSpeaking={activity.isSpeaking}
        hasConfigurationIssue={!workflow.isSelectedAvailable}
        onOpenSettings={actions.openSettings}
        onSaveTranscript={actions.saveTranscript}
        canSaveTranscript={transcript.canExport}
        hasTranscript={transcript.cards.length > 0}
        isBillingPlanPage={view.isBillingPlanPage}
        onNavigate={actions.navigate}
        selectedSourceLang={languages.source}
        onSourceLangChange={languages.changeSource}
        workflowLabel={workflowLabel}
        onOpenWorkflow={() => setMobileSidebarOpen(true)}
      />

      <main className="app-main flex min-w-0 w-full flex-1 flex-col gap-4 p-3 sm:gap-5 sm:p-5 lg:p-6">
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
            <BillingPlanPage
              uiLanguageCode={languages.source.code}
              onBackToHome={() => actions.navigate('/')}
            />
          </Suspense>
        ) : (
          <>
            {flowProfile && (
              <div className="md:hidden">
                <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl">
                  <WorkflowActiveFlow
                    activeProfile={flowProfile}
                    copy={resolvedWorkflowCopy}
                    instanceId="mobile-flow"
                    automaticNote={
                      isAutomatic && flowProfile.id === workflow.resolvedProfileId
                        ? resolvedWorkflowCopy.usingAutomaticLabel
                        : undefined
                    }
                    onClose={() => setFlowProfileId(null)}
                  />
                </div>
              </div>
            )}
            {workflow.isMobileDictation ? (
              <>
                <TargetLanguageBar
                  selectedSourceLang={languages.source}
                  selectedTargetLang={languages.target}
                  onTargetLangChange={languages.changeTarget}
                  disabled={transcript.isTranslating}
                />
                <MobileDictationComposer
                  sourceLanguageCode={languages.source.speechCode}
                  sourceLanguageName={languages.source.nativeName}
                  onSubmit={workflow.submitText}
                  disabled={!workflow.isSelectedAvailable || transcript.isTranslating}
                  copy={mobileComposerCopy}
                />
              </>
            ) : (
              <Controls
                isListening={activity.isListening}
                isConnecting={activity.isConnecting}
                onToggleListening={actions.toggleListening}
                selectedSourceLang={languages.source}
                selectedTargetLang={languages.target}
                onTargetLangChange={languages.changeTarget}
                disabled={!workflow.isSelectedAvailable || !workflow.activeProfile}
              />
            )}

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
      </div>

      <SettingsModal
        isOpen={settings.isOpen}
        onClose={settings.close}
        geminiApiKey={settings.geminiApiKey}
        rememberGeminiApiKey={settings.rememberGeminiApiKey}
        openAiApiKey={settings.openAiApiKey}
        rememberOpenAiApiKey={settings.rememberOpenAiApiKey}
        azureApiKey={settings.azureApiKey}
        azureRegion={settings.azureRegion}
        rememberAzureApiKey={settings.rememberAzureApiKey}
        azureSpeechApiKey={settings.azureSpeechApiKey}
        azureSpeechRegion={settings.azureSpeechRegion}
        azureSpeechResource={settings.azureSpeechResource}
        rememberAzureSpeechApiKey={settings.rememberAzureSpeechApiKey}
        onSaveApiKey={settings.saveApiKey}
        onDeleteApiKey={settings.deleteApiKey}
        automaticRoutingPreference={settings.automaticRoutingPreference}
        onAutomaticRoutingPreferenceChange={settings.changeAutomaticRoutingPreference}
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
