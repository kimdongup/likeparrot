import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { WebSpeechRecognizer } from '../services/speechRecognition';
import { TranslationService } from '../services/translator';
import { SpeechService } from '../services/speechSynthesis';
import { BuiltInTranslator } from '../services/builtInTranslator';
import { GeminiLiveSocketService } from '../services/geminiLiveSocket';
import { downloadTranscriptHtml } from '../services/transcriptExport';
import {
  applyThemePreference,
  deleteStoredApiKey,
  readStoredApiKey,
  readStoredTheme,
  saveStoredApiKey,
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
import type { PreferenceStorageStatus, ThemePreference } from '../services/preferences';

export interface LikeParrotController {
  view: {
    isSoundFirstPage: boolean;
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
    isFirstRun: boolean;
    apiKey: string;
    rememberApiKey: boolean;
    theme: ThemePreference;
    close: () => void;
    continueWithoutKey: () => void;
    saveApiKey: (apiKey: string, rememberOnDevice: boolean) => boolean;
    deleteApiKey: () => boolean;
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
const MAX_VISIBLE_CARDS = 500;
const MAX_PENDING_PIPELINE_JOBS = 3;

const defaultSelections: PipelineSelections = {
  stage1: 'webspeech_fast',
  stage2: 'auto',
  stage3: 'tts_pipelined',
};

const normalizePath = (path: string): string => path.replace(/\/+$/u, '') || '/';

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

const getApiStorageError = (status: PreferenceStorageStatus): string | null => {
  if (status === 'session-and-legacy-failed') {
    return 'Could not store the API key for this tab or remove the previous device copy. Check your browser site-data settings.';
  }
  if (status === 'session-failed') {
    return 'Could not store the API key for this tab. You will need to enter it again after refreshing.';
  }
  if (status === 'legacy-cleanup-failed') {
    return 'The API key is active in this tab, but the device-storage preference could not be saved. Check your browser site-data settings.';
  }
  return null;
};

const derivePipelineStatus = (
  selections: PipelineSelections,
  apiKey: string,
  latencyMs = 0,
  actualEngine?: { name: string; type: PipelineEngineType }
): PipelineStatus => {
  const stt = selections.stage1 === 'webspeech_fast'
    ? 'Web Speech API (600ms fast endpoint detection)'
    : 'Web Speech API (1000ms stable endpoint detection)';

  let engine = '🤖 Automatic routing';
  let engineType: PipelineEngineType = 'network_fallback';
  if (selections.stage2 === 'chrome_nano') {
    engine = '⚡ Chrome built-in Translator';
    engineType = 'chrome_nano';
  } else if (selections.stage2 === 'gemini_stream') {
    engine = '🌊 Gemini 3.5 Flash-Lite (live streaming)';
    engineType = 'gemini_stream';
  } else if (selections.stage2 === 'turbo_fastpath') {
    engine = '🌐 Network translation fallback';
    engineType = 'network_fallback';
  } else if (BuiltInTranslator.isChromeNanoSupported()) {
    engineType = 'chrome_nano';
  } else if (apiKey) {
    engineType = 'gemini_stream';
  }

  if (actualEngine) {
    engine = actualEngine.name;
    engineType = actualEngine.type;
  }

  return {
    stt,
    engine,
    engineType,
    tts: selections.stage3 === 'tts_pipelined'
      ? '🔊 Queue completed phrases when streaming is available'
      : '🔊 Speak after the complete sentence (standard TTS)',
    latencyMs,
    isStreaming: engineType === 'gemini_stream',
    isLiveWs: false,
  };
};

const createCardId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useLikeParrotController(): LikeParrotController {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const isAllInOnePage = currentPath === '/all_in_one';

  const [initialApiKeyRead] = useState(readStoredApiKey);
  const [apiKey, setApiKey] = useState(initialApiKeyRead.apiKey);
  const [rememberApiKey, setRememberApiKey] = useState(initialApiKeyRead.persistent);
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);
  const [selections, setSelections] = useState<PipelineSelections>(getStoredSelections);
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !initialApiKeyRead.apiKey);
  const [isFirstRunSettings, setIsFirstRunSettings] = useState(() => !initialApiKeyRead.apiKey);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (!isAllInOnePage && !WebSpeechRecognizer.isSupported()) {
      return 'This browser does not support the Web Speech API used by Text First. Try Audio First instead.';
    }
    return getApiStorageError(initialApiKeyRead.status);
  });

  const [sourceLang, setSourceLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const [targetLang, setTargetLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[1]);
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
    derivePipelineStatus(getStoredSelections(), initialApiKeyRead.apiKey)
  );

  const recognizerRef = useRef<WebSpeechRecognizer | null>(null);
  const liveSocketRef = useRef<GeminiLiveSocketService | null>(null);
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const apiKeyRef = useRef(apiKey);
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
      setErrorMessage('Could not save the transcript on this device. Check storage space and browser permissions.');
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
    void liveSocketRef.current?.stop();
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
          setErrorMessage('Could not load transcripts stored on this device. Check browser storage permissions.');
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
  }, [sourceLang]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stopWorkflow]);

  useEffect(() => {
    const canUpdateLiveUi = () =>
      liveUiEnabledRef.current && isAllInOnePageRef.current;
    const liveService = new GeminiLiveSocketService({
      onInputTranscript: (text) => {
        if (canUpdateLiveUi()) setInterimText(text);
      },
      onOutputTranscript: (text) => {
        if (!canUpdateLiveUi()) return;
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
        // A graceful stop can deliver its final card after the user has already
        // changed the selectors. Use the language snapshot carried by that Live
        // session instead of whichever values happen to be selected now.
        const currentSource = SUPPORTED_LANGUAGES.find(
          (language) => language.code === sourceLanguageCode
        ) ?? sourceLangRef.current;
        const currentTarget = SUPPORTED_LANGUAGES.find(
          (language) => language.code === targetLanguageCode
        ) ?? targetLangRef.current;
        if (canUpdateLiveUi()) setSoundFirstLatencyMs(latencyMs);
        addCard({
          id: createCardId(),
          timestamp: new Date(),
          sourceText: sourceText || '(Source transcript unavailable)',
          translatedText,
          sourceLang: currentSource.name,
          sourceLangCode: currentSource.code,
          targetLang: currentTarget.name,
          targetLangCode: currentTarget.speechCode,
          pipelineTag: 'Gemini 3.5 Live Translate',
          latencyMs,
        });
      },
      onAudioPlayingState: (playing) => {
        if (canUpdateLiveUi()) setIsSpeaking(playing);
      },
      onStatusChange: (status) => {
        if (!canUpdateLiveUi()) return;
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
        if (canUpdateLiveUi()) setErrorMessage(message);
      },
    });
    liveSocketRef.current = liveService;
    return () => {
      liveService.dispose();
      if (liveSocketRef.current === liveService) liveSocketRef.current = null;
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
      if (!isAllInOnePageRef.current) {
        setErrorMessage(message);
        setIsConnecting(false);
        setIsListening(false);
      }
    };
    recognizer.onFinalTranscript = (finalText) => {
      if (!finalText.trim() || isAllInOnePageRef.current) return;
      if (pendingPipelineJobsRef.current >= MAX_PENDING_PIPELINE_JOBS) {
        setErrorMessage('Speech arrived too quickly. Wait for the current translation to finish, then try again.');
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
                (error) => setErrorMessage(`TTS playback error: ${String(error)}`),
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
            derivePipelineStatus(currentSelections, currentKey, endToEndLatencyMs, {
              name: result.engineName,
              type: result.engineType,
            })
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
              (error) => setErrorMessage(`TTS playback error: ${String(error)}`),
              speechGroupId
            );
          }
        } catch (error) {
          SpeechService.cancelGroup(speechGroupId);
          if (!controller.signal.aborted && generation === pipelineGenerationRef.current) {
            const message = error instanceof Error ? error.message : String(error);
            setErrorMessage(`Translation failed: ${message}`);
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
      setErrorMessage('This browser does not support the Web Speech API used by Text First. Try Audio First instead.');
    } else {
      setErrorMessage(null);
    }
  }, [stopWorkflow]);

  const handleSelectionChange = useCallback((nextSelections: PipelineSelections) => {
    stopWorkflow();
    try {
      localStorage.setItem(STORAGE_PIPELINE_SELECTIONS, JSON.stringify(nextSelections));
    } catch (error) {
      console.warn('[Storage] pipeline selection save failed:', error);
      setErrorMessage('Could not save the pipeline settings in this browser.');
    }
    setSelections(nextSelections);
    setPipelineStatus(derivePipelineStatus(nextSelections, apiKey));
  }, [apiKey, stopWorkflow]);

  const handleSaveApiKey = useCallback((key: string, rememberOnDevice: boolean): boolean => {
    const cleanKey = key.trim();
    const status = saveStoredApiKey(cleanKey, rememberOnDevice);
    const sessionSaved = status !== 'session-failed'
      && status !== 'session-and-legacy-failed';
    if (sessionSaved) {
      setApiKey(cleanKey);
      setRememberApiKey(status === 'legacy-cleanup-failed'
        ? rememberApiKey
        : rememberOnDevice);
      setIsFirstRunSettings(false);
    }
    setErrorMessage(getApiStorageError(status));
    setPipelineStatus(derivePipelineStatus(selections, sessionSaved ? cleanKey : apiKey));
    return status === 'success';
  }, [apiKey, rememberApiKey, selections]);

  const handleDeleteApiKey = useCallback((): boolean => {
    stopWorkflow();
    const status = deleteStoredApiKey();
    const deleted = status === 'success';
    // Honor the user's delete intent in the running app even if a browser
    // storage backend refuses cleanup. A failed copy can only reappear after a
    // reload, which the warning below makes explicit.
    setApiKey('');
    setRememberApiKey(false);
    if (status === 'success') {
      setErrorMessage(null);
    } else if (status === 'legacy-cleanup-failed') {
      setErrorMessage('The API key is no longer active in this tab, but its device copy could not be removed. It may reappear after a refresh until you clear this site’s data.');
    } else if (status === 'session-failed') {
      setErrorMessage('The API key is no longer active, but its tab copy could not be removed. It may reappear after refreshing this tab.');
    } else {
      setErrorMessage('The API key is no longer active, but its browser copy could not be removed. Clear this site’s data manually.');
    }
    setPipelineStatus(derivePipelineStatus(selections, ''));
    return deleted;
  }, [selections, stopWorkflow]);

  const handleThemeChange = useCallback((nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    if (!saveStoredTheme(nextTheme)) {
      setErrorMessage('The theme is active for this page, but the preference could not be saved in your browser.');
    }
  }, []);

  const handleSaveTranscript = useCallback(() => {
    if (cards.length === 0) return;
    try {
      downloadTranscriptHtml(cards, {
        title: 'LikeParrot Translation Transcript',
        locale: 'en',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Could not save the transcript HTML: ${message}`);
    }
  }, [cards]);

  const handleToggleListening = useCallback(async () => {
    setErrorMessage(null);
    if (isListening || isConnecting) {
      stopWorkflow();
      return;
    }
    if (sourceLang.code === targetLang.code) {
      setErrorMessage('Choose different source and target languages.');
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
      if (!apiKey.trim()) {
        setErrorMessage('Audio First requires a Gemini API key. Add one in Settings.');
        setIsFirstRunSettings(true);
        setIsSettingsOpen(true);
        return;
      }
      const liveService = liveSocketRef.current;
      if (!liveService) {
        setErrorMessage('Could not initialize the Audio First engine. Refresh the page and try again.');
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
        await liveService.start(apiKey, sourceLang.code, targetLang.code);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (startAttempt !== liveStartAttemptRef.current) return;
        liveUiEnabledRef.current = false;
        setIsConnecting(false);
        setIsListening(false);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    const recognizer = recognizerRef.current;
    if (!recognizer) {
      setErrorMessage('Could not initialize the Text First speech recognizer in this browser.');
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
    selections,
    sourceLang,
    stopWorkflow,
    targetLang,
  ]);

  const handleSourceLangChange = useCallback((language: LanguageOption) => {
    sourceLangRef.current = language;
    setSourceLang(language);
    recognizerRef.current?.setLanguage(language.speechCode);
  }, []);

  const handleTargetLangChange = useCallback((language: LanguageOption) => {
    targetLangRef.current = language;
    setTargetLang(language);
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
        setErrorMessage(`TTS playback error: ${String(error)}`);
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
      setErrorMessage('Could not delete this transcript entry from device storage. Try again.');
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
      setErrorMessage('Could not clear transcript history from device storage. Try again.');
    });
  }, [cards, handleStopCard]);

  const listeningOrConnecting = isListening || isConnecting;
  const handleDismissError = useCallback(() => setErrorMessage(null), []);

  const handleOpenSettings = useCallback(() => {
    stopWorkflow();
    setIsFirstRunSettings(false);
    setIsSettingsOpen(true);
  }, [stopWorkflow]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setIsFirstRunSettings(false);
  }, []);

  const handleContinueWithoutKey = useCallback(() => {
    setIsSettingsOpen(false);
    setIsFirstRunSettings(false);
    if (isAllInOnePage) handleNavigate('/');
  }, [handleNavigate, isAllInOnePage]);

  const view = useMemo(() => ({
      isSoundFirstPage: isAllInOnePage,
      errorMessage,
      soundFirstLatencyMs,
  }), [errorMessage, isAllInOnePage, soundFirstLatencyMs]);

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
      isFirstRun: isFirstRunSettings,
      apiKey,
      rememberApiKey,
      theme,
      close: handleCloseSettings,
      continueWithoutKey: handleContinueWithoutKey,
      saveApiKey: handleSaveApiKey,
      deleteApiKey: handleDeleteApiKey,
      changeTheme: handleThemeChange,
  }), [
    apiKey,
    handleCloseSettings,
    handleContinueWithoutKey,
    handleDeleteApiKey,
    handleSaveApiKey,
    handleThemeChange,
    isFirstRunSettings,
    isSettingsOpen,
    rememberApiKey,
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
    transcript,
    settings,
    actions,
  }), [actions, activity, languages, pipeline, settings, transcript, view]);
}
