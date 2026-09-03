import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { getUiStrings } from '../constants/translations';
import { BuiltInTranslator } from '../services/builtInTranslator';
import { GeminiLiveSocketService } from '../services/geminiLiveSocket';
import {
  getSoundFirstModel,
  isSoundFirstModelId,
} from '../services/liveTranslation';
import { OpenAIRealtimeTranslationService } from '../services/openAiRealtimeTranslation';
import { detectPlatformCapabilities } from '../services/platformCapabilities';
import {
  applyThemePreference,
  deleteStoredAzureRegion,
  deleteStoredProviderApiKey,
  readAutomaticRoutingPreference,
  readStoredApiKey,
  readStoredAzureRegion,
  readStoredProviderApiKey,
  readStoredTheme,
  readStoredWorkflowProfileId,
  saveAutomaticRoutingPreference,
  saveStoredAzureRegion,
  saveStoredProviderApiKey,
  saveStoredTheme,
  saveStoredWorkflowProfileId,
} from '../services/preferences';
import {
  FOLLOW_ALONG_FAST_MAX_WORDS,
  FOLLOW_ALONG_FAST_SILENCE_MS,
  FOLLOW_ALONG_STABLE_MAX_WORDS,
  FOLLOW_ALONG_STABLE_SILENCE_MS,
  resolveTranscriptCoalesce,
  WebSpeechRecognizer,
} from '../services/speechRecognition';
import { SpeechService } from '../services/speechSynthesis';
import { downloadTranscriptHtml } from '../services/transcriptExport';
import {
  clearTranslationCards,
  deleteTranslationCard,
  loadTranslationCards,
  saveTranslationCard,
} from '../services/translationHistory';
import { TranslationService } from '../services/translator';
import {
  getWorkflowAvailabilities,
  getWorkflowProfile,
  resolveAutomaticWorkflow,
  WORKFLOW_PROFILES,
} from '../services/workflowProfiles';
import type {
  LiveSocketCallbacks,
  LiveTranslationService,
  SoundFirstModelId,
} from '../services/liveTranslation';
import type {
  ApiKeyProvider,
  AutomaticRoutingPreference,
  PreferenceStorageStatus,
  ThemePreference,
} from '../services/preferences';
import type {
  LanguageOption,
  Stage2Option,
  TranscriptInputMethod,
  TranslationCard,
  TranslationFailureReason,
} from '../types';
import type {
  WorkflowAvailability,
  WorkflowProfile,
  WorkflowProfileId,
} from '../services/workflowProfiles';

export interface LikeParrotController {
  view: {
    isBillingPlanPage: boolean;
    currentPath: string;
    errorMessage: string | null;
  };
  activity: {
    isListening: boolean;
    isConnecting: boolean;
    isSpeaking: boolean;
  };
  languages: {
    source: LanguageOption;
    target: LanguageOption;
    changeSource: (language: LanguageOption) => void;
    changeTarget: (language: LanguageOption) => void;
  };
  workflow: {
    profiles: readonly WorkflowProfile[];
    selectedId: WorkflowProfileId;
    availability: Record<WorkflowProfileId, WorkflowAvailability>;
    resolvedProfileId: WorkflowProfileId | null;
    activeProfile: WorkflowProfile | null;
    isSelectedAvailable: boolean;
    isMobileDictation: boolean;
    lastLatencyMs: number;
    change: (profileId: WorkflowProfileId) => void;
    submitText: (text: string) => Promise<void>;
  };
  transcript: {
    cards: TranslationCard[];
    playingCardId: string | null;
    interimText: string;
    isTranslating: boolean;
    streamingTranslation: string;
    play: (card: TranslationCard) => void;
    stop: () => void;
    delete: (id: string) => void;
    clear: () => void;
  };
  settings: {
    isOpen: boolean;
    geminiApiKey: string;
    rememberGeminiApiKey: boolean;
    openAiApiKey: string;
    rememberOpenAiApiKey: boolean;
    azureApiKey: string;
    azureRegion: string;
    rememberAzureApiKey: boolean;
    automaticRoutingPreference: AutomaticRoutingPreference;
    theme: ThemePreference;
    close: () => void;
    saveApiKey: (
      provider: ApiKeyProvider,
      apiKey: string,
      rememberOnDevice: boolean,
      auxiliaryValue?: string
    ) => boolean;
    deleteApiKey: (provider: ApiKeyProvider) => boolean;
    changeAutomaticRoutingPreference: (
      preference: AutomaticRoutingPreference
    ) => boolean;
    changeTheme: (theme: ThemePreference) => void;
  };
  actions: {
    dismissError: () => void;
    openSettings: () => void;
    saveTranscript: () => void;
    navigate: (path: string) => void;
    toggleListening: () => Promise<void>;
  };
}

const STORAGE_PIPELINE_SELECTIONS = 'likeparrot_pipeline_selections';
const STORAGE_SOURCE_LANGUAGE = 'likeparrot_source_language';
const STORAGE_TARGET_LANGUAGE = 'likeparrot_target_language';
const STORAGE_SOUND_FIRST_MODEL = 'likeparrot_sound_first_model';
const MAX_VISIBLE_CARDS = 500;
const MAX_PENDING_PIPELINE_JOBS = 24;

const normalizePath = (path: string): string => path.replace(/\/+$/u, '') || '/';
const canonicalizePath = (path: string): string => {
  const normalized = normalizePath(path);
  return normalized === '/all_in_one' ? '/' : normalized;
};

const isWorkflowProfileId = (value: unknown): value is WorkflowProfileId =>
  typeof value === 'string' && WORKFLOW_PROFILES.some((profile) => profile.id === value);

const getInitialWorkflowProfileId = (requestedPath: string): WorkflowProfileId => {
  const storedWorkflow = readStoredWorkflowProfileId();
  if (isWorkflowProfileId(storedWorkflow)) return storedWorkflow;

  if (normalizePath(requestedPath) === '/all_in_one') {
    try {
      const legacyLiveModel = window.localStorage.getItem(STORAGE_SOUND_FIRST_MODEL);
      if (isSoundFirstModelId(legacyLiveModel)) return legacyLiveModel;
    } catch {
      // Continue with the former Text First selection migration.
    }
  }

  try {
    const rawSelections = window.localStorage.getItem(STORAGE_PIPELINE_SELECTIONS);
    if (rawSelections) {
      const selections = JSON.parse(rawSelections) as { stage1?: unknown; stage2?: unknown };
      if (selections.stage2 === 'chrome_nano') {
        return selections.stage1 === 'webspeech_std'
          ? 'desktop-chrome-on-device-stable'
          : 'desktop-chrome-on-device-fast';
      }
      if (selections.stage2 === 'gemini_stream') return 'desktop-webspeech-gemini-stable';
      if (selections.stage2 === 'turbo_fastpath') return 'desktop-webspeech-azure-stable';
    }
  } catch {
    // Invalid legacy preferences are safely replaced by Automatic.
  }
  return 'auto';
};

const getInitialLanguages = (): { source: LanguageOption; target: LanguageOption } => {
  let source = SUPPORTED_LANGUAGES[0];
  let target = SUPPORTED_LANGUAGES[1];
  try {
    const storedSource = window.localStorage.getItem(STORAGE_SOURCE_LANGUAGE);
    const storedTarget = window.localStorage.getItem(STORAGE_TARGET_LANGUAGE);
    source = SUPPORTED_LANGUAGES.find((language) => language.code === storedSource) ?? source;
    target = SUPPORTED_LANGUAGES.find((language) => language.code === storedTarget) ?? target;
  } catch {
    // Defaults remain usable when storage is restricted.
  }
  if (source.code === target.code) {
    target = SUPPORTED_LANGUAGES.find((language) => language.code !== source.code) ?? target;
  }
  return { source, target };
};

const saveLanguagePreference = (storageKey: string, languageCode: string): void => {
  try {
    window.localStorage.setItem(storageKey, languageCode);
  } catch {
    // The in-memory selection remains active.
  }
};

const getApiStorageError = (
  status: PreferenceStorageStatus,
  languageCode: string
): string | null => status === 'success'
  ? null
  : getUiStrings(languageCode).settings.storageError;

const createCardId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isLiveProfileId = (profileId: WorkflowProfileId): profileId is SoundFirstModelId =>
  profileId === 'gemini-3.5-live-translate-preview' || profileId === 'gpt-realtime-translate';

const getTranslationEngine = (profile: WorkflowProfile): Stage2Option => {
  if (profile.translationMethod === 'chrome_translator') return 'chrome_nano';
  if (profile.translationMethod === 'gemini_flash_lite') return 'gemini_stream';
  if (profile.translationMethod === 'azure_translator') return 'turbo_fastpath';
  throw new Error('The selected workflow is not a text translation pipeline.');
};

const getInputMethod = (profile: WorkflowProfile): TranscriptInputMethod =>
  profile.inputMethod === 'mobile_keyboard' ? 'keyboard_text' : 'desktop_web_speech';

const getUnavailableMessage = (
  availability: WorkflowAvailability | undefined,
  languageCode: string
): string => {
  const errors = getUiStrings(languageCode).errors;
  if (availability?.missingCredential === 'gemini') return errors.geminiApiKeyRequired;
  if (availability?.missingCredential === 'openai') return errors.openAiApiKeyRequired;
  if (availability?.missingCredential === 'azure') return errors.azureApiKeyRequired;
  return errors.workflowUnavailable;
};

export function useLikeParrotController(): LikeParrotController {
  const requestedInitialPath = normalizePath(window.location.pathname);
  const [currentPath, setCurrentPath] = useState(() => canonicalizePath(requestedInitialPath));
  const isBillingPlanPage = currentPath === '/billingplan';
  const [platformCapabilities] = useState(detectPlatformCapabilities);
  const [initialApiKeyRead] = useState(readStoredApiKey);
  const [initialOpenAiApiKeyRead] = useState(() => readStoredProviderApiKey('openai'));
  const [initialAzureApiKeyRead] = useState(() => readStoredProviderApiKey('azure'));
  const [initialAzureRegionRead] = useState(readStoredAzureRegion);
  const [initialLanguages] = useState(getInitialLanguages);

  const [apiKey, setApiKey] = useState(initialApiKeyRead.apiKey);
  const [rememberApiKey, setRememberApiKey] = useState(initialApiKeyRead.persistent);
  const [openAiApiKey, setOpenAiApiKey] = useState(initialOpenAiApiKeyRead.apiKey);
  const [rememberOpenAiApiKey, setRememberOpenAiApiKey] = useState(
    initialOpenAiApiKeyRead.persistent
  );
  const [azureApiKey, setAzureApiKey] = useState(initialAzureApiKeyRead.apiKey);
  const [azureRegion, setAzureRegion] = useState(initialAzureRegionRead.apiKey);
  const [rememberAzureApiKey, setRememberAzureApiKey] = useState(
    initialAzureApiKeyRead.persistent
  );
  const [automaticRoutingPreference, setAutomaticRoutingPreference] = useState(
    readAutomaticRoutingPreference
  );
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<WorkflowProfileId>(() =>
    getInitialWorkflowProfileId(requestedInitialPath)
  );
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);
  const [sourceLang, setSourceLang] = useState<LanguageOption>(initialLanguages.source);
  const [targetLang, setTargetLang] = useState<LanguageOption>(initialLanguages.target);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const storageFailure = [
      initialApiKeyRead,
      initialOpenAiApiKeyRead,
      initialAzureApiKeyRead,
      initialAzureRegionRead,
    ].find((result) => result.status !== 'success');
    return storageFailure
      ? getApiStorageError(storageFailure.status, initialLanguages.source.code)
      : null;
  });
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [streamingTranslation, setStreamingTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState(0);
  const [cards, setCards] = useState<TranslationCard[]>([]);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  const credentials = useMemo(() => ({
    gemini: Boolean(apiKey.trim()),
    openai: Boolean(openAiApiKey.trim()),
    azure: Boolean(azureApiKey.trim()),
  }), [apiKey, azureApiKey, openAiApiKey]);
  const availabilityContext = useMemo(() => ({
    capabilities: platformCapabilities,
    credentials,
  }), [credentials, platformCapabilities]);
  const resolutionOptions = useMemo(() => ({
    mode: 'text-first' as const,
    preferredCloudProvider: automaticRoutingPreference.preferredCloudProvider,
    desktopEndpoint: 'stable' as const,
    allowCloudFallback: automaticRoutingPreference.allowCloudFallback,
  }), [automaticRoutingPreference]);
  const workflowAvailability = useMemo(
    () => getWorkflowAvailabilities(availabilityContext, resolutionOptions),
    [availabilityContext, resolutionOptions]
  );
  const automaticResolution = useMemo(
    () => resolveAutomaticWorkflow(availabilityContext, resolutionOptions),
    [availabilityContext, resolutionOptions]
  );
  const selectedProfile = getWorkflowProfile(selectedWorkflowId);
  const activeProfile = selectedWorkflowId === 'auto'
    ? automaticResolution.profile
    : selectedProfile;
  const resolvedProfileId = selectedWorkflowId === 'auto'
    ? automaticResolution.profile?.id ?? null
    : null;
  const isSelectedAvailable = workflowAvailability[selectedWorkflowId].available;

  const recognizerRef = useRef<WebSpeechRecognizer | null>(null);
  const liveServicesRef = useRef<Partial<Record<SoundFirstModelId, LiveTranslationService>>>({});
  const cardsRef = useRef<TranslationCard[]>([]);
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const apiKeyRef = useRef(apiKey);
  const openAiApiKeyRef = useRef(openAiApiKey);
  const azureApiKeyRef = useRef(azureApiKey);
  const azureRegionRef = useRef(azureRegion);
  const activeProfileRef = useRef<WorkflowProfile | null>(activeProfile);
  const workflowAvailabilityRef = useRef(workflowAvailability);
  const currentPathRef = useRef(currentPath);
  const pipelineGenerationRef = useRef(0);
  const pipelineQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activePipelineRequestsRef = useRef(new Map<string, AbortController>());
  const pendingPipelineJobsRef = useRef(0);
  const pendingCardIdsRef = useRef(new Set<string>());
  const translationTokenRef = useRef(new Map<string, number>());
  const translationSourceRef = useRef(new Map<string, string>());
  const deletedPendingCardIdsRef = useRef(new Set<string>());
  const resumeTimerRef = useRef<number | null>(null);
  const historyInvalidationRef = useRef(0);
  const liveUiEnabledRef = useRef(false);
  const liveStartAttemptRef = useRef(0);

  const commitCards = useCallback((nextCards: TranslationCard[]) => {
    const ordered = nextCards
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, MAX_VISIBLE_CARDS);
    cardsRef.current = ordered;
    setCards(ordered);
  }, []);

  const upsertCard = useCallback((card: TranslationCard) => {
    if (deletedPendingCardIdsRef.current.has(card.id)) return;
    commitCards([
      card,
      ...cardsRef.current.filter((existing) => existing.id !== card.id),
    ]);
    void saveTranslationCard(card).catch((error) => {
      console.warn('[TranslationHistory] save failed:', error);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveTranscript);
    });
  }, [commitCards]);

  const patchCard = useCallback((
    cardId: string,
    patch: Partial<TranslationCard>
  ): TranslationCard | null => {
    if (deletedPendingCardIdsRef.current.has(cardId)) return null;
    const existing = cardsRef.current.find((card) => card.id === cardId);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    upsertCard(updated);
    return updated;
  }, [upsertCard]);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const scheduleRecognizerResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      if (
        currentPathRef.current === '/' &&
        activeProfileRef.current?.inputMethod === 'desktop_web_speech' &&
        recognizerRef.current?.isDesiredListening() &&
        !SpeechService.isSpeaking()
      ) {
        setIsSpeaking(false);
        recognizerRef.current?.resumeAfterPlayback();
      }
    }, 300);
  }, [clearResumeTimer]);

  const cancelPipeline = useCallback((markInterrupted = true) => {
    pipelineGenerationRef.current += 1;
    for (const controller of activePipelineRequestsRef.current.values()) controller.abort();
    activePipelineRequestsRef.current.clear();
    if (markInterrupted) {
      for (const cardId of pendingCardIdsRef.current) {
        patchCard(cardId, {
          translationStatus: 'failed',
          translationFailureReason: 'interrupted',
          translationFailureDetail: undefined,
        });
      }
    }
    pendingCardIdsRef.current.clear();
    pendingPipelineJobsRef.current = 0;
    pipelineQueueRef.current = Promise.resolve();
  }, [patchCard]);

  const stopWorkflow = useCallback(() => {
    liveUiEnabledRef.current = false;
    liveStartAttemptRef.current += 1;
    cancelPipeline(true);
    clearResumeTimer();
    recognizerRef.current?.stop();
    for (const service of Object.values(liveServicesRef.current)) void service?.stop();
    SpeechService.stop();
    setIsListening(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsTranslating(false);
    setPlayingCardId(null);
    setInterimText('');
    setStreamingTranslation('');
  }, [cancelPipeline, clearResumeTimer]);

  const queueSourceTranslation = useCallback((
    sourceText: string,
    inputMethod?: TranscriptInputMethod
  ): Promise<void> => {
    let cleanText = sourceText.replace(/\s+/gu, ' ').trim();
    if (!cleanText) return Promise.reject(new Error('Source text is empty.'));
    const profile = activeProfileRef.current;
    if (!profile || profile.kind !== 'text-pipeline') {
      const error = new Error('The selected workflow cannot translate submitted text.');
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.workflowUnavailable);
      return Promise.reject(error);
    }

    const currentSource = sourceLangRef.current;
    const currentTarget = targetLangRef.current;
    if (currentSource.code === currentTarget.code) {
      const error = new Error('Source and target languages must differ.');
      setErrorMessage(getUiStrings(currentSource.code).errors.chooseDifferentLanguages);
      return Promise.reject(error);
    }

    const resolvedInputMethod = inputMethod ?? getInputMethod(profile);
    let existingCardId: string | null = null;
    if (resolvedInputMethod === 'desktop_web_speech') {
      const recentSources = cardsRef.current
        .filter((card) => card.inputMethod === 'desktop_web_speech')
        .slice(0, 6)
        .map((card) => card.sourceText);
      const decision = resolveTranscriptCoalesce(recentSources, cleanText);
      if (decision.action === 'skip') return Promise.resolve();
      if (decision.action === 'replace') {
        const target = cardsRef.current.find((card) => card.inputMethod === 'desktop_web_speech');
        if (target) {
          existingCardId = target.id;
          cleanText = decision.combined;
          patchCard(target.id, {
            sourceText: cleanText,
            translatedText: '',
            translationStatus: 'pending',
            translationFailureReason: undefined,
            translationFailureDetail: undefined,
          });
        } else {
          cleanText = decision.combined;
        }
      } else {
        cleanText = decision.text;
      }
    }

    const cardId = existingCardId ?? createCardId();
    const receivedAt = performance.now();
    if (!existingCardId) {
      upsertCard({
        id: cardId,
        timestamp: new Date(),
        sourceText: cleanText,
        translatedText: '',
        translationStatus: 'pending',
        inputMethod: resolvedInputMethod,
        workflowId: profile.id,
        sourceLang: currentSource.name,
        sourceLangCode: currentSource.code,
        targetLang: currentTarget.name,
        targetLangCode: currentTarget.speechCode,
        pipelineTag: profile.shortLabel,
      });
    }

    if (pendingPipelineJobsRef.current >= MAX_PENDING_PIPELINE_JOBS && !existingCardId) {
      patchCard(cardId, {
        translationStatus: 'failed',
        translationFailureReason: 'translation_failed',
        translationFailureDetail: 'Translation queue is full.',
      });
      const error = new Error('Translation queue is full.');
      setErrorMessage(getUiStrings(currentSource.code).errors.speechTooFast);
      return Promise.reject(error);
    }

    const jobToken = (translationTokenRef.current.get(cardId) ?? 0) + 1;
    translationTokenRef.current.set(cardId, jobToken);
    translationSourceRef.current.set(cardId, cleanText);
    if (existingCardId) {
      activePipelineRequestsRef.current.get(cardId)?.abort();
      SpeechService.cancelGroup(cardId);
    }
    if (!pendingCardIdsRef.current.has(cardId)) {
      pendingPipelineJobsRef.current += 1;
      pendingCardIdsRef.current.add(cardId);
    }
    setInterimText('');
    setStreamingTranslation('');
    setIsTranslating(true);
    const generation = pipelineGenerationRef.current;
    const currentKey = apiKeyRef.current;
    const currentAzureCredentials = {
      apiKey: azureApiKeyRef.current,
      region: azureRegionRef.current,
    };
    const speechGroupId = cardId;

    const processTranslation = async () => {
      if (translationTokenRef.current.get(cardId) !== jobToken) return;
      const controller = new AbortController();
      activePipelineRequestsRef.current.set(cardId, controller);
      const textForTranslation = translationSourceRef.current.get(cardId) ?? cleanText;

      try {
        if (generation !== pipelineGenerationRef.current) {
          throw new DOMException('Workflow changed', 'AbortError');
        }
        if (deletedPendingCardIdsRef.current.has(cardId)) {
          throw new DOMException('Transcript entry deleted', 'AbortError');
        }
        const result = await TranslationService.translateWithPipeline(
          textForTranslation,
          currentSource.name,
          currentSource.code,
          currentTarget.name,
          currentTarget.code,
          currentKey,
          currentAzureCredentials,
          (_chunk, accumulated) => {
            if (
              generation === pipelineGenerationRef.current &&
              !deletedPendingCardIdsRef.current.has(cardId)
            ) {
              setStreamingTranslation(accumulated);
            }
          },
          undefined,
          getTranslationEngine(profile),
          controller.signal
        );

        if (
          generation !== pipelineGenerationRef.current ||
          deletedPendingCardIdsRef.current.has(cardId)
        ) {
          throw new DOMException('Workflow changed', 'AbortError');
        }
        const endToEndLatencyMs = Math.max(0, Math.round(performance.now() - receivedAt));
        patchCard(cardId, {
          translatedText: result.translatedText,
          translationStatus: 'complete',
          translationFailureReason: undefined,
          translationFailureDetail: undefined,
          pipelineTag: result.engineName.replace(/^[^\s]+\s/u, ''),
          latencyMs: endToEndLatencyMs,
        });
        setLastLatencyMs(endToEndLatencyMs);

        // Desktop follow-along keeps the microphone open. Automatic TTS would
        // abort recognition and drop the next utterance, so playback is manual.
        if (result.translatedText.trim() && profile.inputMethod !== 'desktop_web_speech') {
          SpeechService.enqueueChunk(
            result.translatedText,
            currentTarget.speechCode,
            () => {
              clearResumeTimer();
              setIsSpeaking(true);
            },
            () => {
              setIsSpeaking(SpeechService.isSpeaking());
              scheduleRecognizerResume();
            },
            (error) => {
              console.warn('[TTS] sentence playback failed:', error);
              setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.ttsFailed);
            },
            speechGroupId
          );
        }
      } catch (error) {
        if (translationTokenRef.current.get(cardId) !== jobToken) return;
        SpeechService.cancelGroup(speechGroupId);
        const aborted = controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError');
        if (
          !deletedPendingCardIdsRef.current.has(cardId) &&
          generation === pipelineGenerationRef.current
        ) {
          const failureReason: TranslationFailureReason = aborted
            ? 'cancelled'
            : 'translation_failed';
          patchCard(cardId, {
            translationStatus: 'failed',
            translationFailureReason: failureReason,
            translationFailureDetail: error instanceof Error ? error.message : String(error),
          });
        }
        if (!aborted && generation === pipelineGenerationRef.current) {
          console.warn('[Translation] pipeline failed:', error);
          setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.translationFailed);
        }
        throw error;
      } finally {
        if (translationTokenRef.current.get(cardId) === jobToken) {
          activePipelineRequestsRef.current.delete(cardId);
          pendingCardIdsRef.current.delete(cardId);
          deletedPendingCardIdsRef.current.delete(cardId);
          translationSourceRef.current.delete(cardId);
          pendingPipelineJobsRef.current = Math.max(0, pendingPipelineJobsRef.current - 1);
          if (
            generation === pipelineGenerationRef.current &&
            pendingPipelineJobsRef.current === 0
          ) {
            setIsTranslating(false);
            setStreamingTranslation('');
            scheduleRecognizerResume();
          }
        }
      }
    };

    const runQueuedTranslation = () => processTranslation();
    const operation = pipelineQueueRef.current.then(runQueuedTranslation, runQueuedTranslation);
    pipelineQueueRef.current = operation.catch(() => {});
    return operation;
  }, [clearResumeTimer, patchCard, scheduleRecognizerResume, upsertCard]);

  useEffect(() => {
    if (requestedInitialPath === '/all_in_one') {
      window.history.replaceState({}, '', '/');
    }
  }, [requestedInitialPath]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
    document.documentElement.lang = sourceLang.speechCode;
    const strings = getUiStrings(sourceLang.code);
    document.title = isBillingPlanPage
      ? `LikeParrot - ${strings.header.billingPlan}`
      : `LikeParrot - ${strings.controls.ariaLabel}`;
  }, [isBillingPlanPage, sourceLang]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
    openAiApiKeyRef.current = openAiApiKey;
    azureApiKeyRef.current = azureApiKey;
    azureRegionRef.current = azureRegion;
  }, [apiKey, azureApiKey, azureRegion, openAiApiKey]);

  useEffect(() => {
    activeProfileRef.current = activeProfile;
    workflowAvailabilityRef.current = workflowAvailability;
    if (activeProfile?.endpointProfile) {
      const isFast = activeProfile.endpointProfile === 'fast';
      recognizerRef.current?.setSilenceDelay(
        isFast ? FOLLOW_ALONG_FAST_SILENCE_MS : FOLLOW_ALONG_STABLE_SILENCE_MS
      );
      recognizerRef.current?.setMaxBufferWords(
        isFast ? FOLLOW_ALONG_FAST_MAX_WORDS : FOLLOW_ALONG_STABLE_MAX_WORDS
      );
    }
  }, [activeProfile, workflowAvailability]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => applyThemePreference(theme, (resolvedTheme) => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = resolvedTheme === 'dark' ? '#4f46e5' : '#f8fafc';
  }), [theme]);

  useEffect(() => {
    let active = true;
    const invalidationAtStart = historyInvalidationRef.current;
    void loadTranslationCards()
      .then((storedCards) => {
        if (!active || invalidationAtStart !== historyInvalidationRef.current) return;
        const merged = new Map(storedCards.map((card) => [card.id, card]));
        for (const card of cardsRef.current) merged.set(card.id, card);
        commitCards([...merged.values()]);
      })
      .catch((error) => {
        console.warn('[TranslationHistory] load failed:', error);
        if (active) {
          setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.loadTranscript);
        }
      });
    return () => {
      active = false;
    };
  }, [commitCards]);

  useEffect(() => {
    const canUpdateLiveUi = (modelId: SoundFirstModelId) =>
      liveUiEnabledRef.current &&
      currentPathRef.current === '/' &&
      activeProfileRef.current?.id === modelId;
    const createCallbacks = (modelId: SoundFirstModelId): LiveSocketCallbacks => ({
      onInputTranscript: (text) => {
        if (canUpdateLiveUi(modelId)) setInterimText(text);
      },
      onOutputTranscript: (text) => {
        if (!canUpdateLiveUi(modelId)) return;
        setStreamingTranslation(text);
        setIsTranslating(Boolean(text));
      },
      onTurnComplete: ({
        sourceText,
        translatedText,
        sourceLanguageCode,
        targetLanguageCode,
        latencyMs,
      }) => {
        if (!translatedText.trim()) return;
        const currentSource = SUPPORTED_LANGUAGES.find(
          (language) => language.code === sourceLanguageCode
        ) ?? sourceLangRef.current;
        const currentTarget = SUPPORTED_LANGUAGES.find(
          (language) => language.code === targetLanguageCode
        ) ?? targetLangRef.current;
        if (canUpdateLiveUi(modelId)) setLastLatencyMs(latencyMs);
        upsertCard({
          id: createCardId(),
          timestamp: new Date(),
          sourceText,
          sourceTextUnavailable: !sourceText,
          translatedText,
          translationStatus: 'complete',
          inputMethod: 'live_audio',
          workflowId: modelId,
          sourceLang: currentSource.name,
          sourceLangCode: currentSource.code,
          targetLang: currentTarget.name,
          targetLangCode: currentTarget.speechCode,
          pipelineTag: getSoundFirstModel(modelId).transcriptTag,
          latencyMs,
        });
      },
      onAudioPlayingState: (playing) => {
        if (canUpdateLiveUi(modelId)) setIsSpeaking(playing);
      },
      onStatusChange: (status) => {
        if (!canUpdateLiveUi(modelId)) return;
        setIsConnecting(status === 'connecting');
        setIsListening(status === 'connected');
        if (status === 'disconnected' || status === 'error') {
          setIsSpeaking(false);
          setIsTranslating(false);
          setInterimText('');
          setStreamingTranslation('');
        }
      },
      onError: (message) => {
        console.warn(`[${getSoundFirstModel(modelId).shortLabel}] runtime error:`, message);
        if (canUpdateLiveUi(modelId)) {
          setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.audioFirstInit);
        }
      },
    });
    const geminiService = new GeminiLiveSocketService(
      createCallbacks('gemini-3.5-live-translate-preview')
    );
    const openAiService = new OpenAIRealtimeTranslationService(
      createCallbacks('gpt-realtime-translate')
    );
    liveServicesRef.current = {
      'gemini-3.5-live-translate-preview': geminiService,
      'gpt-realtime-translate': openAiService,
    };
    return () => {
      geminiService.dispose();
      openAiService.dispose();
      liveServicesRef.current = {};
    };
  }, [upsertCard]);

  useEffect(() => {
    if (!WebSpeechRecognizer.isSupported()) return;
    const recognizer = new WebSpeechRecognizer();
    recognizer.onStateChange = (listening) => {
      if (
        currentPathRef.current === '/' &&
        activeProfileRef.current?.inputMethod === 'desktop_web_speech'
      ) {
        setIsConnecting(false);
        setIsListening(listening);
      }
      if (!listening) setInterimText('');
    };
    recognizer.onInterimTranscript = (text) => {
      if (
        currentPathRef.current === '/' &&
        activeProfileRef.current?.inputMethod === 'desktop_web_speech'
      ) {
        setInterimText(text);
      }
    };
    recognizer.onError = (message) => {
      console.warn('[Web Speech] recognition error:', message);
      if (activeProfileRef.current?.inputMethod === 'desktop_web_speech') {
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.textFirstInit);
        setIsConnecting(false);
        setIsListening(false);
      }
    };
    recognizer.onFinalTranscript = (finalText) => {
      if (
        currentPathRef.current !== '/' ||
        activeProfileRef.current?.inputMethod !== 'desktop_web_speech'
      ) return;
      void queueSourceTranslation(finalText, 'desktop_web_speech').catch(() => {});
    };
    recognizerRef.current = recognizer;
    return () => {
      recognizer.stop();
      if (recognizerRef.current === recognizer) recognizerRef.current = null;
    };
  }, [queueSourceTranslation]);

  useEffect(() => {
    const handlePopState = () => {
      stopWorkflow();
      const requestedPath = normalizePath(window.location.pathname);
      const nextPath = canonicalizePath(requestedPath);
      if (requestedPath === '/all_in_one') window.history.replaceState({}, '', '/');
      currentPathRef.current = nextPath;
      setCurrentPath(nextPath);
      setErrorMessage(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stopWorkflow]);

  useEffect(() => () => {
    cancelPipeline(true);
    clearResumeTimer();
    SpeechService.stop();
  }, [cancelPipeline, clearResumeTimer]);

  const handleNavigate = useCallback((path: string) => {
    stopWorkflow();
    const nextPath = canonicalizePath(path);
    currentPathRef.current = nextPath;
    window.history.pushState({}, '', nextPath);
    setCurrentPath(nextPath);
    setErrorMessage(null);
  }, [stopWorkflow]);

  const handleWorkflowChange = useCallback((profileId: WorkflowProfileId) => {
    const profileAvailability = workflowAvailabilityRef.current[profileId];
    if (!profileAvailability?.available) {
      setErrorMessage(getUnavailableMessage(profileAvailability, sourceLangRef.current.code));
      return;
    }
    if (profileId === selectedWorkflowId) return;
    stopWorkflow();
    setErrorMessage(null);
    setSelectedWorkflowId(profileId);
    if (!saveStoredWorkflowProfileId(profileId)) {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveWorkflow);
    }
  }, [selectedWorkflowId, stopWorkflow]);

  const handleSaveApiKey = useCallback((
    provider: ApiKeyProvider,
    key: string,
    rememberOnDevice: boolean,
    auxiliaryValue = ''
  ): boolean => {
    const cleanKey = key.trim();
    const keyStatus = saveStoredProviderApiKey(provider, cleanKey, rememberOnDevice);
    const regionStatus = provider === 'azure'
      ? saveStoredAzureRegion(auxiliaryValue, rememberOnDevice)
      : 'success';
    const status = keyStatus !== 'success' ? keyStatus : regionStatus;
    const sessionSaved = ![keyStatus, regionStatus].some(
      (value) => value === 'session-failed' || value === 'session-and-legacy-failed'
    );
    if (sessionSaved) {
      if (provider === 'gemini') {
        apiKeyRef.current = cleanKey;
        setApiKey(cleanKey);
        setRememberApiKey(keyStatus === 'legacy-cleanup-failed'
          ? rememberApiKey
          : rememberOnDevice);
      } else if (provider === 'openai') {
        openAiApiKeyRef.current = cleanKey;
        setOpenAiApiKey(cleanKey);
        setRememberOpenAiApiKey(keyStatus === 'legacy-cleanup-failed'
          ? rememberOpenAiApiKey
          : rememberOnDevice);
      } else {
        azureApiKeyRef.current = cleanKey;
        azureRegionRef.current = auxiliaryValue.trim().toLowerCase();
        setAzureApiKey(cleanKey);
        setAzureRegion(auxiliaryValue.trim().toLowerCase());
        setRememberAzureApiKey(status === 'legacy-cleanup-failed'
          ? rememberAzureApiKey
          : rememberOnDevice);
      }
    }
    setErrorMessage(getApiStorageError(status, sourceLangRef.current.code));
    return status === 'success';
  }, [rememberApiKey, rememberAzureApiKey, rememberOpenAiApiKey]);

  const handleDeleteApiKey = useCallback((provider: ApiKeyProvider): boolean => {
    stopWorkflow();
    const keyStatus = deleteStoredProviderApiKey(provider);
    const regionStatus = provider === 'azure' ? deleteStoredAzureRegion() : 'success';
    const status = keyStatus !== 'success' ? keyStatus : regionStatus;
    if (provider === 'gemini') {
      apiKeyRef.current = '';
      setApiKey('');
      setRememberApiKey(false);
    } else if (provider === 'openai') {
      openAiApiKeyRef.current = '';
      setOpenAiApiKey('');
      setRememberOpenAiApiKey(false);
    } else {
      azureApiKeyRef.current = '';
      azureRegionRef.current = '';
      setAzureApiKey('');
      setAzureRegion('');
      setRememberAzureApiKey(false);
    }
    setErrorMessage(status === 'success'
      ? null
      : getUiStrings(sourceLangRef.current.code).settings.incompleteDeleteError);
    return status === 'success';
  }, [stopWorkflow]);

  const handleAutomaticRoutingPreferenceChange = useCallback((
    preference: AutomaticRoutingPreference
  ): boolean => {
    stopWorkflow();
    setAutomaticRoutingPreference(preference);
    const saved = saveAutomaticRoutingPreference(preference);
    setErrorMessage(saved
      ? null
      : getUiStrings(sourceLangRef.current.code).settings.storageError);
    return saved;
  }, [stopWorkflow]);

  const handleThemeChange = useCallback((nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    if (!saveStoredTheme(nextTheme)) {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveTheme);
    }
  }, []);

  const handleSaveTranscript = useCallback(() => {
    if (cardsRef.current.length === 0) return;
    try {
      const strings = getUiStrings(sourceLangRef.current.code);
      downloadTranscriptHtml(cardsRef.current, {
        title: strings.transcript.htmlTitle,
        locale: strings.locale,
        uiLanguageCode: sourceLangRef.current.code,
      });
    } catch (error) {
      console.warn('[Transcript] HTML export failed:', error);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveHtmlFailed);
    }
  }, []);

  const handleToggleListening = useCallback(async () => {
    setErrorMessage(null);
    if (isListening || isConnecting) {
      stopWorkflow();
      return;
    }
    const profile = activeProfileRef.current;
    const selectedAvailability = workflowAvailabilityRef.current[selectedWorkflowId];
    if (!profile || !selectedAvailability?.available) {
      setErrorMessage(getUnavailableMessage(selectedAvailability, sourceLang.code));
      return;
    }
    if (sourceLang.code === targetLang.code) {
      setErrorMessage(getUiStrings(sourceLang.code).errors.chooseDifferentLanguages);
      return;
    }
    if (profile.inputMethod === 'mobile_keyboard') return;

    cancelPipeline(true);
    setIsTranslating(false);
    setStreamingTranslation('');
    clearResumeTimer();
    setPlayingCardId(null);
    setIsSpeaking(false);
    SpeechService.stop();

    if (profile.kind === 'realtime-audio' && isLiveProfileId(profile.id)) {
      const selectedApiKey = profile.credentialProvider === 'openai'
        ? openAiApiKeyRef.current
        : apiKeyRef.current;
      if (!selectedApiKey.trim()) {
        setErrorMessage(getUnavailableMessage(selectedAvailability, sourceLang.code));
        return;
      }
      const liveService = liveServicesRef.current[profile.id];
      if (!liveService) {
        setErrorMessage(getUiStrings(sourceLang.code).errors.audioFirstInit);
        return;
      }
      const startAttempt = ++liveStartAttemptRef.current;
      liveUiEnabledRef.current = false;
      setIsConnecting(true);
      try {
        await liveService.stop();
        if (
          startAttempt !== liveStartAttemptRef.current ||
          activeProfileRef.current?.id !== profile.id ||
          currentPathRef.current !== '/'
        ) return;
        liveUiEnabledRef.current = true;
        await liveService.start(
          selectedApiKey,
          sourceLangRef.current.code,
          targetLangRef.current.code
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (startAttempt !== liveStartAttemptRef.current) return;
        liveUiEnabledRef.current = false;
        setIsConnecting(false);
        setIsListening(false);
        console.warn(`[${profile.shortLabel}] start failed:`, error);
        setErrorMessage(getUiStrings(sourceLang.code).errors.audioFirstInit);
      }
      return;
    }

    if (profile.inputMethod !== 'desktop_web_speech') {
      setErrorMessage(getUiStrings(sourceLang.code).errors.workflowUnavailable);
      return;
    }
    const recognizer = recognizerRef.current;
    if (!recognizer) {
      setErrorMessage(getUiStrings(sourceLang.code).errors.textFirstInit);
      return;
    }
    if (profile.translationMethod === 'chrome_translator') {
      void BuiltInTranslator.prepare(sourceLang.code, targetLang.code).catch((error) => {
        console.warn('[Translator] on-device model preparation failed:', error);
      });
    }
    const isFast = profile.endpointProfile === 'fast';
    recognizer.setSilenceDelay(
      isFast ? FOLLOW_ALONG_FAST_SILENCE_MS : FOLLOW_ALONG_STABLE_SILENCE_MS
    );
    recognizer.setMaxBufferWords(
      isFast ? FOLLOW_ALONG_FAST_MAX_WORDS : FOLLOW_ALONG_STABLE_MAX_WORDS
    );
    setIsConnecting(true);
    recognizer.start(sourceLang.speechCode);
  }, [
    cancelPipeline,
    clearResumeTimer,
    isConnecting,
    isListening,
    selectedWorkflowId,
    sourceLang,
    stopWorkflow,
    targetLang,
  ]);

  const handleSourceLangChange = useCallback((language: LanguageOption) => {
    const previousSource = sourceLangRef.current;
    const currentTarget = targetLangRef.current;
    if (currentTarget.code === language.code) {
      targetLangRef.current = previousSource;
      setTargetLang(previousSource);
      saveLanguagePreference(STORAGE_TARGET_LANGUAGE, previousSource.code);
    }
    sourceLangRef.current = language;
    setSourceLang(language);
    saveLanguagePreference(STORAGE_SOURCE_LANGUAGE, language.code);
    setErrorMessage(null);
    recognizerRef.current?.setLanguage(language.speechCode);
  }, []);

  const handleTargetLangChange = useCallback((language: LanguageOption) => {
    if (sourceLangRef.current.code === language.code) return;
    targetLangRef.current = language;
    setTargetLang(language);
    saveLanguagePreference(STORAGE_TARGET_LANGUAGE, language.code);
  }, []);

  const handlePlayCard = useCallback((card: TranslationCard) => {
    if ((card.translationStatus ?? 'complete') !== 'complete' || !card.translatedText.trim()) return;
    if (activeProfileRef.current?.kind === 'realtime-audio' && (isListening || isConnecting)) {
      stopWorkflow();
    } else if (
      activeProfileRef.current?.inputMethod !== 'desktop_web_speech'
      && isTranslating
    ) {
      cancelPipeline(true);
      setIsTranslating(false);
      setStreamingTranslation('');
    }
    clearResumeTimer();
    SpeechService.stop();
    if (activeProfileRef.current?.inputMethod === 'desktop_web_speech') {
      recognizerRef.current?.suspendForPlayback();
    }
    setPlayingCardId(card.id);
    setIsSpeaking(true);
    SpeechService.speak(
      card.translatedText,
      card.targetLangCode,
      () => {
        setPlayingCardId(card.id);
        setIsSpeaking(true);
      },
      () => {
        setPlayingCardId(null);
        setIsSpeaking(false);
        scheduleRecognizerResume();
      },
      (error) => {
        console.warn('[TTS] transcript playback failed:', error);
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.ttsFailed);
      }
    );
  }, [
    cancelPipeline,
    clearResumeTimer,
    isConnecting,
    isListening,
    isTranslating,
    scheduleRecognizerResume,
    stopWorkflow,
  ]);

  const handleStopCard = useCallback(() => {
    SpeechService.stop();
    clearResumeTimer();
    setPlayingCardId(null);
    setIsSpeaking(false);
    scheduleRecognizerResume();
  }, [clearResumeTimer, scheduleRecognizerResume]);

  const handleDeleteCard = useCallback((id: string) => {
    if (playingCardId === id) handleStopCard();
    const removedCard = cardsRef.current.find((card) => card.id === id);
    if (!removedCard) return;
    if (pendingCardIdsRef.current.has(id)) {
      deletedPendingCardIdsRef.current.add(id);
      activePipelineRequestsRef.current.get(id)?.abort();
      SpeechService.cancelGroup(id);
    }
    historyInvalidationRef.current += 1;
    commitCards(cardsRef.current.filter((card) => card.id !== id));
    void deleteTranslationCard(id).catch((error) => {
      console.warn('[TranslationHistory] delete failed:', error);
      if (!pendingCardIdsRef.current.has(id)) upsertCard(removedCard);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.deleteEntry);
    });
  }, [commitCards, handleStopCard, playingCardId, upsertCard]);

  const handleClearAll = useCallback(() => {
    handleStopCard();
    const removedCards = cardsRef.current;
    cancelPipeline(false);
    setIsTranslating(false);
    setStreamingTranslation('');
    historyInvalidationRef.current += 1;
    commitCards([]);
    void clearTranslationCards().catch((error) => {
      console.warn('[TranslationHistory] clear failed:', error);
      commitCards([...removedCards, ...cardsRef.current].filter(
        (card, index, all) => all.findIndex((candidate) => candidate.id === card.id) === index
      ));
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.clearHistory);
    });
  }, [cancelPipeline, commitCards, handleStopCard]);

  const handleDismissError = useCallback(() => setErrorMessage(null), []);
  const handleOpenSettings = useCallback(() => {
    stopWorkflow();
    setIsSettingsOpen(true);
  }, [stopWorkflow]);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);

  const view = useMemo(() => ({
    isBillingPlanPage,
    currentPath,
    errorMessage,
  }), [currentPath, errorMessage, isBillingPlanPage]);
  const activity = useMemo(() => ({
    isListening,
    isConnecting,
    isSpeaking,
  }), [isConnecting, isListening, isSpeaking]);
  const languages = useMemo(() => ({
    source: sourceLang,
    target: targetLang,
    changeSource: handleSourceLangChange,
    changeTarget: handleTargetLangChange,
  }), [handleSourceLangChange, handleTargetLangChange, sourceLang, targetLang]);
  const workflow = useMemo(() => ({
    profiles: WORKFLOW_PROFILES,
    selectedId: selectedWorkflowId,
    availability: workflowAvailability,
    resolvedProfileId,
    activeProfile,
    isSelectedAvailable,
    isMobileDictation: activeProfile?.inputMethod === 'mobile_keyboard' ||
      (selectedWorkflowId === 'auto' && platformCapabilities.isMobile),
    lastLatencyMs,
    change: handleWorkflowChange,
    submitText: (text: string) => queueSourceTranslation(text, 'keyboard_text'),
  }), [
    activeProfile,
    handleWorkflowChange,
    isSelectedAvailable,
    lastLatencyMs,
    platformCapabilities.isMobile,
    queueSourceTranslation,
    resolvedProfileId,
    selectedWorkflowId,
    workflowAvailability,
  ]);
  const transcript = useMemo(() => ({
    cards,
    playingCardId,
    interimText,
    isTranslating,
    streamingTranslation,
    play: handlePlayCard,
    stop: handleStopCard,
    delete: handleDeleteCard,
    clear: handleClearAll,
  }), [
    cards,
    handleClearAll,
    handleDeleteCard,
    handlePlayCard,
    handleStopCard,
    interimText,
    isTranslating,
    playingCardId,
    streamingTranslation,
  ]);
  const settings = useMemo(() => ({
    isOpen: isSettingsOpen,
    geminiApiKey: apiKey,
    rememberGeminiApiKey: rememberApiKey,
    openAiApiKey,
    rememberOpenAiApiKey,
    azureApiKey,
    azureRegion,
    rememberAzureApiKey,
    automaticRoutingPreference,
    theme,
    close: handleCloseSettings,
    saveApiKey: handleSaveApiKey,
    deleteApiKey: handleDeleteApiKey,
    changeAutomaticRoutingPreference: handleAutomaticRoutingPreferenceChange,
    changeTheme: handleThemeChange,
  }), [
    apiKey,
    automaticRoutingPreference,
    azureApiKey,
    azureRegion,
    handleAutomaticRoutingPreferenceChange,
    handleCloseSettings,
    handleDeleteApiKey,
    handleSaveApiKey,
    handleThemeChange,
    isSettingsOpen,
    openAiApiKey,
    rememberApiKey,
    rememberAzureApiKey,
    rememberOpenAiApiKey,
    theme,
  ]);
  const actions = useMemo(() => ({
    dismissError: handleDismissError,
    openSettings: handleOpenSettings,
    saveTranscript: handleSaveTranscript,
    navigate: handleNavigate,
    toggleListening: handleToggleListening,
  }), [
    handleDismissError,
    handleNavigate,
    handleOpenSettings,
    handleSaveTranscript,
    handleToggleListening,
  ]);

  return useMemo(() => ({
    view,
    activity,
    languages,
    workflow,
    transcript,
    settings,
    actions,
  }), [actions, activity, languages, settings, transcript, view, workflow]);
}
