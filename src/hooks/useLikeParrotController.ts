import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { getUiStrings } from '../constants/translations';
import { WebSpeechRecognizer } from '../services/speechRecognition';
import { TranslationService } from '../services/translator';
import { SpeechService } from '../services/speechSynthesis';
import { BuiltInTranslator } from '../services/builtInTranslator';
import { GeminiLiveSocketService } from '../services/geminiLiveSocket';
import { OpenAIRealtimeTranslationService } from '../services/openAiRealtimeTranslation';
import {
  SOUND_FIRST_MODELS,
  getSoundFirstModel,
  isSoundFirstModelId,
} from '../services/liveTranslation';
import { downloadTranscriptHtml } from '../services/transcriptExport';
import {
  applyThemePreference,
  deleteStoredProviderApiKey,
  readStoredApiKey,
  readStoredProviderApiKey,
  readStoredTheme,
  saveStoredProviderApiKey,
  saveStoredTheme,
} from '../services/preferences';
import {
  clearTranslationCards,
  deleteTranslationCard,
  loadTranslationCards,
  saveTranslationCard,
} from '../services/translationHistory';
import type {
  LanguageOption,
  PipelineEngineType,
  PipelineSelections,
  PipelineStatus,
  TranslationCard,
} from '../types';
import type {
  ApiKeyProvider,
  PreferenceStorageStatus,
  ThemePreference,
} from '../services/preferences';
import type {
  LiveSocketCallbacks,
  LiveTranslationService,
  SoundFirstModelId,
} from '../services/liveTranslation';

export interface LikeParrotController {
  view: {
    isSoundFirstPage: boolean;
    isBillingPlanPage: boolean;
    currentPath: string;
    errorMessage: string | null;
    soundFirstLatencyMs: number;
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
  pipeline: {
    status: PipelineStatus;
    selections: PipelineSelections;
    changeSelections: (selections: PipelineSelections) => void;
    isListeningOrConnecting: boolean;
  };
  soundFirst: {
    selectedModelId: SoundFirstModelId;
    isSelectedModelConfigured: boolean;
    models: typeof SOUND_FIRST_MODELS;
    changeModel: (modelId: SoundFirstModelId) => void;
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
    theme: ThemePreference;
    close: () => void;
    saveApiKey: (
      provider: ApiKeyProvider,
      apiKey: string,
      rememberOnDevice: boolean
    ) => boolean;
    deleteApiKey: (provider: ApiKeyProvider) => boolean;
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
const MAX_PENDING_PIPELINE_JOBS = 3;

const defaultSelections: PipelineSelections = {
  stage1: 'webspeech_fast',
  stage2: 'auto',
  stage3: 'tts_pipelined',
};

const normalizePath = (path: string): string => path.replace(/\/+$/u, '') || '/';

const getStoredSoundFirstModel = (): SoundFirstModelId => {
  try {
    const stored = localStorage.getItem(STORAGE_SOUND_FIRST_MODEL);
    if (isSoundFirstModelId(stored)) return stored;
  } catch {}
  return SOUND_FIRST_MODELS[0].id;
};

const getStoredSelections = (): PipelineSelections => {
  try {
    const raw = localStorage.getItem(STORAGE_PIPELINE_SELECTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        stage1: parsed.stage1 === 'webspeech_std' ? 'webspeech_std' : 'webspeech_fast',
        stage2: ['chrome_nano', 'gemini_stream', 'turbo_fastpath'].includes(parsed.stage2)
          ? parsed.stage2
          : 'auto',
        stage3: parsed.stage3 === 'tts_standard' ? 'tts_standard' : 'tts_pipelined',
      };
    }
  } catch {}
  return defaultSelections;
};

const getInitialLanguages = (): { source: LanguageOption; target: LanguageOption } => {
  let source = SUPPORTED_LANGUAGES[0];
  let target = SUPPORTED_LANGUAGES[1];
  try {
    const storedSource = localStorage.getItem(STORAGE_SOURCE_LANGUAGE);
    const storedTarget = localStorage.getItem(STORAGE_TARGET_LANGUAGE);
    source = SUPPORTED_LANGUAGES.find((language) => language.code === storedSource) ?? source;
    target = SUPPORTED_LANGUAGES.find((language) => language.code === storedTarget) ?? target;
  } catch {}
  if (source.code === target.code) {
    target = SUPPORTED_LANGUAGES.find((language) => language.code !== source.code) ?? target;
  }
  return { source, target };
};

const saveLanguagePreference = (storageKey: string, languageCode: string): void => {
  try {
    localStorage.setItem(storageKey, languageCode);
  } catch {
    // The current selection remains active even when browser storage is blocked.
  }
};

const getApiStorageError = (
  status: PreferenceStorageStatus,
  languageCode: string
): string | null => status === 'success'
  ? null
  : getUiStrings(languageCode).settings.storageError;

const derivePipelineStatus = (
  selections: PipelineSelections,
  apiKey: string,
  latencyMs = 0,
  actualEngineType?: PipelineEngineType
): PipelineStatus => {
  let engineType: PipelineEngineType = 'network_fallback';
  if (selections.stage2 === 'chrome_nano') {
    engineType = 'chrome_nano';
  } else if (selections.stage2 === 'gemini_stream') {
    engineType = 'gemini_stream';
  } else if (selections.stage2 === 'turbo_fastpath') {
    engineType = 'network_fallback';
  } else if (BuiltInTranslator.isChromeNanoSupported()) {
    engineType = 'chrome_nano';
  } else if (apiKey) {
    engineType = 'gemini_stream';
  }

  if (actualEngineType) engineType = actualEngineType;

  return {
    engineType,
    latencyMs,
  };
};

const createCardId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useLikeParrotController(): LikeParrotController {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const isAllInOnePage = currentPath === '/all_in_one';
  const isBillingPlanPage = currentPath === '/billingplan';

  const [initialApiKeyRead] = useState(readStoredApiKey);
  const [initialOpenAiApiKeyRead] = useState(() => readStoredProviderApiKey('openai'));
  const [initialSoundFirstModel] = useState(getStoredSoundFirstModel);
  const [initialSelections] = useState(() => {
    const storedSelections = getStoredSelections();
    return storedSelections.stage2 === 'gemini_stream' && !initialApiKeyRead.apiKey
      ? { ...storedSelections, stage2: 'auto' as const }
      : storedSelections;
  });
  const [apiKey, setApiKey] = useState(initialApiKeyRead.apiKey);
  const [rememberApiKey, setRememberApiKey] = useState(initialApiKeyRead.persistent);
  const [openAiApiKey, setOpenAiApiKey] = useState(initialOpenAiApiKeyRead.apiKey);
  const [rememberOpenAiApiKey, setRememberOpenAiApiKey] = useState(
    initialOpenAiApiKeyRead.persistent
  );
  const [soundFirstModelId, setSoundFirstModelId] = useState<SoundFirstModelId>(
    initialSoundFirstModel
  );
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);
  const [selections, setSelections] = useState<PipelineSelections>(initialSelections);
  const [initialLanguages] = useState(getInitialLanguages);
  const [sourceLang, setSourceLang] = useState<LanguageOption>(initialLanguages.source);
  const [targetLang, setTargetLang] = useState<LanguageOption>(initialLanguages.target);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (!isAllInOnePage && !isBillingPlanPage && !WebSpeechRecognizer.isSupported()) {
      return getUiStrings(initialLanguages.source.code).errors.webSpeechUnsupported;
    }
    return getApiStorageError(initialApiKeyRead.status, initialLanguages.source.code);
  });

  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [streamingTranslation, setStreamingTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [soundFirstLatencyMs, setSoundFirstLatencyMs] = useState(0);
  const [cards, setCards] = useState<TranslationCard[]>([]);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(() =>
    derivePipelineStatus(initialSelections, initialApiKeyRead.apiKey)
  );

  const recognizerRef = useRef<WebSpeechRecognizer | null>(null);
  const liveServicesRef = useRef<Partial<Record<SoundFirstModelId, LiveTranslationService>>>({});
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const apiKeyRef = useRef(apiKey);
  const soundFirstModelIdRef = useRef(soundFirstModelId);
  const selectionsRef = useRef(selections);
  const isAllInOnePageRef = useRef(isAllInOnePage);
  const pipelineGenerationRef = useRef(0);
  const pipelineQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activePipelineRequestsRef = useRef(new Set<AbortController>());
  const pendingPipelineJobsRef = useRef(0);
  const unmuteTimerRef = useRef<number | null>(null);
  const historyInvalidationRef = useRef(0);
  const liveUiEnabledRef = useRef(false);
  const liveStartAttemptRef = useRef(0);

  const addCard = useCallback((card: TranslationCard) => {
    setCards((previous) => [
      card,
      ...previous.filter((existing) => existing.id !== card.id),
    ].slice(0, MAX_VISIBLE_CARDS));
    void saveTranslationCard(card).catch((error) => {
      console.warn('[TranslationHistory] save failed:', error);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveTranscript);
    });
  }, []);

  const clearUnmuteTimer = useCallback(() => {
    if (unmuteTimerRef.current !== null) {
      window.clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }
  }, []);

  const scheduleRecognizerUnmute = useCallback(() => {
    clearUnmuteTimer();
    unmuteTimerRef.current = window.setTimeout(() => {
      unmuteTimerRef.current = null;
      if (
        !isAllInOnePageRef.current &&
        !SpeechService.isSpeaking() &&
        activePipelineRequestsRef.current.size === 0
      ) {
        setIsSpeaking(false);
        recognizerRef.current?.setMuted(false);
      }
    }, 300);
  }, [clearUnmuteTimer]);

  const cancelPipeline = useCallback(() => {
    pipelineGenerationRef.current += 1;
    for (const controller of activePipelineRequestsRef.current) controller.abort();
    activePipelineRequestsRef.current.clear();
    pendingPipelineJobsRef.current = 0;
    // New speech must not wait behind an old browser model download that the
    // platform itself may continue in the background.
    pipelineQueueRef.current = Promise.resolve();
  }, []);

  const stopWorkflow = useCallback(() => {
    liveUiEnabledRef.current = false;
    liveStartAttemptRef.current += 1;
    cancelPipeline();
    clearUnmuteTimer();
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
  }, [cancelPipeline, clearUnmuteTimer]);

  useEffect(() => {
    let active = true;
    const invalidationAtStart = historyInvalidationRef.current;
    void loadTranslationCards()
      .then((storedCards) => {
        if (!active || invalidationAtStart !== historyInvalidationRef.current) return;
        setCards((currentCards) => {
          const merged = new Map(storedCards.map((card) => [card.id, card]));
          for (const card of currentCards) merged.set(card.id, card);
          return [...merged.values()].sort(
            (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
          ).slice(0, MAX_VISIBLE_CARDS);
        });
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
  }, []);

  useEffect(() => {
    isAllInOnePageRef.current = isAllInOnePage;
  }, [isAllInOnePage]);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
    document.documentElement.lang = sourceLang.speechCode;
    const strings = getUiStrings(sourceLang.code);
    document.title = isBillingPlanPage
      ? `LikeParrot - ${strings.header.billingPlan}`
      : `LikeParrot - ${strings.modes.audioFirst} · ${strings.modes.textFirst}`;
  }, [currentPath, isBillingPlanPage, sourceLang]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    soundFirstModelIdRef.current = soundFirstModelId;
  }, [soundFirstModelId]);

  useEffect(() => applyThemePreference(theme, (resolvedTheme) => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = resolvedTheme === 'dark' ? '#4f46e5' : '#f8fafc';
  }), [theme]);

  useEffect(() => {
    selectionsRef.current = selections;
    recognizerRef.current?.setSilenceDelay(selections.stage1 === 'webspeech_std' ? 1000 : 600);
  }, [selections]);

  useEffect(() => {
    const handlePopState = () => {
      stopWorkflow();
      const nextPath = normalizePath(window.location.pathname);
      isAllInOnePageRef.current = nextPath === '/all_in_one';
      setCurrentPath(nextPath);
      if (nextPath === '/' && !WebSpeechRecognizer.isSupported()) {
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.webSpeechUnsupported);
      } else {
        setErrorMessage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stopWorkflow]);

  useEffect(() => {
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
        if (canUpdateLiveUi(modelId)) setSoundFirstLatencyMs(latencyMs);
        addCard({
          id: createCardId(),
          timestamp: new Date(),
          sourceText,
          sourceTextUnavailable: !sourceText,
          translatedText,
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
    const canUpdateLiveUi = (modelId: SoundFirstModelId) =>
      liveUiEnabledRef.current &&
      isAllInOnePageRef.current &&
      soundFirstModelIdRef.current === modelId;
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
  }, [addCard]);

  useEffect(() => {
    if (!WebSpeechRecognizer.isSupported()) return;
    const recognizer = new WebSpeechRecognizer();
    recognizer.setSilenceDelay(selectionsRef.current.stage1 === 'webspeech_std' ? 1000 : 600);

    recognizer.onStateChange = (listening) => {
      if (!isAllInOnePageRef.current) {
        setIsConnecting(false);
        setIsListening(listening);
      }
      if (!listening) setInterimText('');
    };
    recognizer.onInterimTranscript = (text) => {
      if (!isAllInOnePageRef.current) setInterimText(text);
    };
    recognizer.onError = (message) => {
      console.warn('[Web Speech] recognition error:', message);
      if (!isAllInOnePageRef.current) {
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.textFirstInit);
        setIsConnecting(false);
        setIsListening(false);
      }
    };
    recognizer.onFinalTranscript = (finalText) => {
      if (!finalText.trim() || isAllInOnePageRef.current) return;
      if (pendingPipelineJobsRef.current >= MAX_PENDING_PIPELINE_JOBS) {
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.speechTooFast);
        return;
      }
      pendingPipelineJobsRef.current += 1;
      const generation = pipelineGenerationRef.current;
      const receivedAt = performance.now();
      const speechGroupId = createCardId();
      const currentSource = sourceLangRef.current;
      const currentTarget = targetLangRef.current;
      const currentSelections = selectionsRef.current;
      const currentKey = apiKeyRef.current;

      const processTranslation = async () => {
        if (generation !== pipelineGenerationRef.current) return;
        const controller = new AbortController();
        activePipelineRequestsRef.current.add(controller);
        setInterimText('');
        setStreamingTranslation('');
        setIsTranslating(true);

        try {
          const result = await TranslationService.translateWithPipeline(
            finalText,
            currentSource.name,
            currentSource.code,
            currentTarget.name,
            currentTarget.code,
            currentKey,
            (_chunk, accumulated) => {
              if (generation === pipelineGenerationRef.current) {
                setStreamingTranslation(accumulated);
              }
            },
            (clause) => {
              if (
                generation !== pipelineGenerationRef.current ||
                currentSelections.stage3 !== 'tts_pipelined'
              ) return;
              recognizer.setMuted(true);
              SpeechService.enqueueChunk(
                clause,
                currentTarget.speechCode,
                () => {
                  clearUnmuteTimer();
                  setIsSpeaking(true);
                  recognizer.setMuted(true);
                },
                () => {
                  setIsSpeaking(SpeechService.isSpeaking());
                  scheduleRecognizerUnmute();
                },
                (error) => {
                  console.warn('[TTS] pipelined playback failed:', error);
                  setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.ttsFailed);
                },
                speechGroupId
              );
            },
            currentSelections.stage2,
            controller.signal
          );

          if (generation !== pipelineGenerationRef.current) return;
          const endToEndLatencyMs = Math.max(0, Math.round(performance.now() - receivedAt));
          const card: TranslationCard = {
            id: createCardId(),
            timestamp: new Date(),
            sourceText: finalText,
            translatedText: result.translatedText,
            sourceLang: currentSource.name,
            sourceLangCode: currentSource.code,
            targetLang: currentTarget.name,
            targetLangCode: currentTarget.speechCode,
            pipelineTag: result.engineName.replace(/^[^\s]+\s/u, ''),
            latencyMs: endToEndLatencyMs,
          };
          addCard(card);
          setPipelineStatus(
            derivePipelineStatus(
              currentSelections,
              currentKey,
              endToEndLatencyMs,
              result.engineType
            )
          );

          if (currentSelections.stage3 === 'tts_standard') {
            recognizer.setMuted(true);
            SpeechService.enqueueChunk(
              result.translatedText,
              currentTarget.speechCode,
              () => {
                clearUnmuteTimer();
                setIsSpeaking(true);
                recognizer.setMuted(true);
              },
              () => {
                setIsSpeaking(SpeechService.isSpeaking());
                scheduleRecognizerUnmute();
              },
              (error) => {
                console.warn('[TTS] sentence playback failed:', error);
                setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.ttsFailed);
              },
              speechGroupId
            );
          }
        } catch (error) {
          SpeechService.cancelGroup(speechGroupId);
          if (!controller.signal.aborted && generation === pipelineGenerationRef.current) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn('[Translation] pipeline failed:', message);
            setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.translationFailed);
          }
        } finally {
          activePipelineRequestsRef.current.delete(controller);
          if (
            generation === pipelineGenerationRef.current &&
            activePipelineRequestsRef.current.size === 0
          ) {
            setIsTranslating(false);
            setStreamingTranslation('');
            scheduleRecognizerUnmute();
          }
        }
      };

      const runQueuedTranslation = () => processTranslation().finally(() => {
        if (generation === pipelineGenerationRef.current) {
          pendingPipelineJobsRef.current = Math.max(0, pendingPipelineJobsRef.current - 1);
        }
      });
      const queued = pipelineQueueRef.current.then(runQueuedTranslation, runQueuedTranslation);
      pipelineQueueRef.current = queued.catch(() => {});
    };

    recognizerRef.current = recognizer;
    return () => {
      recognizer.stop();
      if (recognizerRef.current === recognizer) recognizerRef.current = null;
    };
  }, [addCard, clearUnmuteTimer, scheduleRecognizerUnmute]);

  useEffect(() => () => {
    cancelPipeline();
    clearUnmuteTimer();
    SpeechService.stop();
  }, [cancelPipeline, clearUnmuteTimer]);

  const handleNavigate = useCallback((path: string) => {
    stopWorkflow();
    const nextPath = normalizePath(path);
    isAllInOnePageRef.current = nextPath === '/all_in_one';
    window.history.pushState({}, '', nextPath);
    setCurrentPath(nextPath);
    if (nextPath === '/' && !WebSpeechRecognizer.isSupported()) {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.webSpeechUnsupported);
    } else {
      setErrorMessage(null);
    }
  }, [stopWorkflow]);

  const handleSelectionChange = useCallback((nextSelections: PipelineSelections) => {
    if (
      nextSelections.stage2 === 'gemini_stream' &&
      selectionsRef.current.stage2 !== 'gemini_stream' &&
      !apiKey.trim()
    ) {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.geminiApiKeyRequired);
      return;
    }
    stopWorkflow();
    setErrorMessage(null);
    try {
      localStorage.setItem(STORAGE_PIPELINE_SELECTIONS, JSON.stringify(nextSelections));
    } catch (error) {
      console.warn('[Storage] pipeline selection save failed:', error);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.savePipeline);
    }
    setSelections(nextSelections);
    setPipelineStatus(derivePipelineStatus(nextSelections, apiKey));
  }, [apiKey, stopWorkflow]);

  const handleSoundFirstModelChange = useCallback((modelId: SoundFirstModelId) => {
    if (modelId === soundFirstModelIdRef.current) return;
    const model = getSoundFirstModel(modelId);
    const hasProviderKey = model.provider === 'openai'
      ? Boolean(openAiApiKey.trim())
      : Boolean(apiKey.trim());
    if (!hasProviderKey) {
      const errors = getUiStrings(sourceLangRef.current.code).errors;
      setErrorMessage(model.provider === 'openai'
        ? errors.openAiApiKeyRequired
        : errors.geminiApiKeyRequired);
      return;
    }
    stopWorkflow();
    setErrorMessage(null);
    soundFirstModelIdRef.current = modelId;
    setSoundFirstModelId(modelId);
    try {
      localStorage.setItem(STORAGE_SOUND_FIRST_MODEL, modelId);
    } catch {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.savePipeline);
    }
  }, [apiKey, openAiApiKey, stopWorkflow]);

  const handleSaveApiKey = useCallback((
    provider: ApiKeyProvider,
    key: string,
    rememberOnDevice: boolean
  ): boolean => {
    const cleanKey = key.trim();
    const status = saveStoredProviderApiKey(provider, cleanKey, rememberOnDevice);
    const sessionSaved = status !== 'session-failed'
      && status !== 'session-and-legacy-failed';
    if (sessionSaved) {
      if (provider === 'gemini') {
        setApiKey(cleanKey);
        setRememberApiKey(status === 'legacy-cleanup-failed'
          ? rememberApiKey
          : rememberOnDevice);
      } else {
        setOpenAiApiKey(cleanKey);
        setRememberOpenAiApiKey(status === 'legacy-cleanup-failed'
          ? rememberOpenAiApiKey
          : rememberOnDevice);
      }
    }
    setErrorMessage(getApiStorageError(status, sourceLangRef.current.code));
    if (provider === 'gemini') {
      setPipelineStatus(derivePipelineStatus(selections, sessionSaved ? cleanKey : apiKey));
    }
    return status === 'success';
  }, [apiKey, rememberApiKey, rememberOpenAiApiKey, selections]);

  const handleDeleteApiKey = useCallback((provider: ApiKeyProvider): boolean => {
    stopWorkflow();
    const status = deleteStoredProviderApiKey(provider);
    const deleted = status === 'success';
    let nextGeminiSelections = selectionsRef.current;
    // Honor the user's delete intent in the running app even if a browser
    // storage backend refuses cleanup. A failed copy can only reappear after a
    // reload, which the warning below makes explicit.
    if (provider === 'gemini') {
      setApiKey('');
      setRememberApiKey(false);
      if (selectionsRef.current.stage2 === 'gemini_stream') {
        const nextSelections: PipelineSelections = {
          ...selectionsRef.current,
          stage2: 'auto',
        };
        nextGeminiSelections = nextSelections;
        selectionsRef.current = nextSelections;
        setSelections(nextSelections);
        try {
          localStorage.setItem(STORAGE_PIPELINE_SELECTIONS, JSON.stringify(nextSelections));
        } catch {
          // The key deletion remains successful even if the safe fallback
          // selection cannot be persisted.
        }
      }
    } else {
      setOpenAiApiKey('');
      setRememberOpenAiApiKey(false);
    }
    if (status === 'success') {
      setErrorMessage(null);
    } else if (status === 'legacy-cleanup-failed') {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).settings.incompleteDeleteError);
    } else if (status === 'session-failed') {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).settings.incompleteDeleteError);
    } else {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).settings.incompleteDeleteError);
    }
    if (provider === 'gemini') {
      setPipelineStatus(derivePipelineStatus(nextGeminiSelections, ''));
    }
    return deleted;
  }, [stopWorkflow]);

  const handleThemeChange = useCallback((nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    if (!saveStoredTheme(nextTheme)) {
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveTheme);
    }
  }, []);

  const handleSaveTranscript = useCallback(() => {
    if (cards.length === 0) return;
    try {
      const strings = getUiStrings(sourceLang.code);
      downloadTranscriptHtml(cards, {
        title: strings.transcript.htmlTitle,
        locale: strings.locale,
        uiLanguageCode: sourceLang.code,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Transcript] HTML export failed:', message);
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.saveHtmlFailed);
    }
  }, [cards, sourceLang.code]);

  const handleToggleListening = useCallback(async () => {
    setErrorMessage(null);
    if (isListening || isConnecting) {
      stopWorkflow();
      return;
    }
    if (sourceLang.code === targetLang.code) {
      setErrorMessage(getUiStrings(sourceLang.code).errors.chooseDifferentLanguages);
      return;
    }

    cancelPipeline();
    setIsTranslating(false);
    setStreamingTranslation('');
    clearUnmuteTimer();
    setPlayingCardId(null);
    setIsSpeaking(false);
    SpeechService.stop();

    if (isAllInOnePage) {
      const selectedModel = getSoundFirstModel(soundFirstModelId);
      const selectedApiKey = selectedModel.provider === 'openai' ? openAiApiKey : apiKey;
      if (!selectedApiKey.trim()) {
        const strings = getUiStrings(sourceLang.code);
        setErrorMessage(selectedModel.provider === 'openai'
          ? strings.errors.audioFirstNeedsOpenAiKey
          : strings.errors.audioFirstNeedsKey);
        setIsSettingsOpen(true);
        return;
      }
      const liveService = liveServicesRef.current[soundFirstModelId];
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
          !isAllInOnePageRef.current
        ) return;
        liveUiEnabledRef.current = true;
        await liveService.start(selectedApiKey, sourceLang.code, targetLang.code);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (startAttempt !== liveStartAttemptRef.current) return;
        liveUiEnabledRef.current = false;
        setIsConnecting(false);
        setIsListening(false);
        console.warn(`[${selectedModel.shortLabel}] start failed:`, error);
        setErrorMessage(getUiStrings(sourceLang.code).errors.audioFirstInit);
      }
      return;
    }

    const recognizer = recognizerRef.current;
    if (!recognizer) {
      setErrorMessage(getUiStrings(sourceLang.code).errors.textFirstInit);
      return;
    }
    if (selections.stage2 === 'auto' || selections.stage2 === 'chrome_nano') {
      BuiltInTranslator.prepare(sourceLang.code, targetLang.code);
    }
    recognizer.setSilenceDelay(selections.stage1 === 'webspeech_std' ? 1000 : 600);
    setIsConnecting(true);
    recognizer.start(sourceLang.speechCode);
  }, [
    apiKey,
    cancelPipeline,
    clearUnmuteTimer,
    isAllInOnePage,
    isConnecting,
    isListening,
    openAiApiKey,
    selections,
    soundFirstModelId,
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
    if (isAllInOnePage && (isListening || isConnecting)) stopWorkflow();
    if (!isAllInOnePage && isTranslating) {
      cancelPipeline();
      setIsTranslating(false);
      setStreamingTranslation('');
    }
    clearUnmuteTimer();
    setPlayingCardId(card.id);
    setIsSpeaking(true);
    recognizerRef.current?.setMuted(true);
    SpeechService.speak(
      card.translatedText,
      card.targetLangCode,
      () => {
        setPlayingCardId(card.id);
        setIsSpeaking(true);
        recognizerRef.current?.setMuted(true);
      },
      () => {
        setPlayingCardId(null);
        setIsSpeaking(false);
        scheduleRecognizerUnmute();
      },
      (error) => {
        setPlayingCardId(null);
        setIsSpeaking(false);
        console.warn('[TTS] transcript playback failed:', error);
        setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.ttsFailed);
      }
    );
  }, [
    cancelPipeline,
    clearUnmuteTimer,
    isAllInOnePage,
    isConnecting,
    isListening,
    isTranslating,
    scheduleRecognizerUnmute,
    stopWorkflow,
  ]);

  const handleStopCard = useCallback(() => {
    SpeechService.stop();
    clearUnmuteTimer();
    setPlayingCardId(null);
    setIsSpeaking(false);
    scheduleRecognizerUnmute();
  }, [clearUnmuteTimer, scheduleRecognizerUnmute]);

  const handleDeleteCard = useCallback((id: string) => {
    if (playingCardId === id) handleStopCard();
    historyInvalidationRef.current += 1;
    const removedCard = cards.find((card) => card.id === id);
    setCards((previous) => previous.filter((card) => card.id !== id));
    void deleteTranslationCard(id).catch((error) => {
      console.warn('[TranslationHistory] delete failed:', error);
      if (removedCard) {
        setCards((previous) => [removedCard, ...previous].sort(
          (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
        ).slice(0, MAX_VISIBLE_CARDS));
      }
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.deleteEntry);
    });
  }, [cards, handleStopCard, playingCardId]);

  const handleClearAll = useCallback(() => {
    handleStopCard();
    historyInvalidationRef.current += 1;
    const removedCards = cards;
    setCards([]);
    void clearTranslationCards().catch((error) => {
      console.warn('[TranslationHistory] clear failed:', error);
      setCards((previous) => [...removedCards, ...previous].filter(
        (card, index, all) => all.findIndex((candidate) => candidate.id === card.id) === index
      ).sort(
        (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
      ).slice(0, MAX_VISIBLE_CARDS));
      setErrorMessage(getUiStrings(sourceLangRef.current.code).errors.clearHistory);
    });
  }, [cards, handleStopCard]);

  const listeningOrConnecting = isListening || isConnecting;
  const handleDismissError = useCallback(() => setErrorMessage(null), []);

  const handleOpenSettings = useCallback(() => {
    stopWorkflow();
    setIsSettingsOpen(true);
  }, [stopWorkflow]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const view = useMemo(() => ({
      isSoundFirstPage: isAllInOnePage,
      isBillingPlanPage,
      currentPath,
      errorMessage,
      soundFirstLatencyMs,
  }), [currentPath, errorMessage, isAllInOnePage, isBillingPlanPage, soundFirstLatencyMs]);

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

  const pipeline = useMemo(() => ({
      status: pipelineStatus,
      selections,
      changeSelections: handleSelectionChange,
      isListeningOrConnecting: listeningOrConnecting,
  }), [handleSelectionChange, listeningOrConnecting, pipelineStatus, selections]);

  const soundFirst = useMemo(() => {
    const selectedModel = getSoundFirstModel(soundFirstModelId);
    const isSelectedModelConfigured = selectedModel.provider === 'openai'
      ? Boolean(openAiApiKey.trim())
      : Boolean(apiKey.trim());
    return {
      selectedModelId: soundFirstModelId,
      isSelectedModelConfigured,
      models: SOUND_FIRST_MODELS,
      changeModel: handleSoundFirstModelChange,
    };
  }, [apiKey, handleSoundFirstModelChange, openAiApiKey, soundFirstModelId]);

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
      theme,
      close: handleCloseSettings,
      saveApiKey: handleSaveApiKey,
      deleteApiKey: handleDeleteApiKey,
      changeTheme: handleThemeChange,
  }), [
    apiKey,
    handleCloseSettings,
    handleDeleteApiKey,
    handleSaveApiKey,
    handleThemeChange,
    isSettingsOpen,
    openAiApiKey,
    rememberApiKey,
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
    pipeline,
    soundFirst,
    transcript,
    settings,
    actions,
  }), [actions, activity, languages, pipeline, settings, soundFirst, transcript, view]);
}
