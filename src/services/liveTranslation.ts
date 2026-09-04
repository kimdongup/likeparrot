export type LiveStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface LiveTranslationTurn {
  id: string;
  sourceText: string;
  translatedText: string;
  translationStatus: 'pending' | 'complete' | 'failed';
  sourceLanguageCode: string;
  targetLanguageCode: string;
  /** Approximate local-speech-start-to-first-output latency, not network RTT. */
  latencyMs: number;
}

export interface LiveSocketCallbacks {
  onInputTranscript?: (text: string, isInterim: boolean) => void;
  onOutputTranscript?: (text: string) => void;
  onTurnComplete?: (turn: LiveTranslationTurn) => void;
  onAudioPlayingState?: (isPlaying: boolean) => void;
  onStatusChange?: (status: LiveStatus) => void;
  onError?: (error: string) => void;
}

export interface LiveStartOptions {
  region?: string;
  resourceName?: string;
}

export interface LiveTranslationService {
  start(
    apiKey: string,
    sourceLanguageCode: string,
    targetLanguageCode: string,
    options?: LiveStartOptions
  ): Promise<void>;
  stop(): Promise<void>;
  dispose(): void;
}

export type SoundFirstModelId =
  | 'gemini-3.5-live-translate-preview'
  | 'gpt-realtime-translate'
  | 'azure-speech-live-interpreter'
  | 'azure-speech-translation';

export interface SoundFirstModelOption {
  id: SoundFirstModelId;
  provider: 'gemini' | 'openai' | 'azure';
  label: string;
  shortLabel: string;
  transcriptTag: string;
}

export const SOUND_FIRST_MODELS: readonly SoundFirstModelOption[] = [
  {
    id: 'gemini-3.5-live-translate-preview',
    provider: 'gemini',
    label: 'Gemini 3.5 Live Translate Preview',
    shortLabel: 'Gemini Live',
    transcriptTag: 'Gemini 3.5 Live Translate',
  },
  {
    id: 'gpt-realtime-translate',
    provider: 'openai',
    label: 'OpenAI GPT Realtime Translate',
    shortLabel: 'GPT Realtime',
    transcriptTag: 'OpenAI GPT Realtime Translate',
  },
  {
    id: 'azure-speech-live-interpreter',
    provider: 'azure',
    label: 'Azure Speech Live Interpreter',
    shortLabel: 'Azure Interpreter',
    transcriptTag: 'Azure Speech Live Interpreter',
  },
  {
    id: 'azure-speech-translation',
    provider: 'azure',
    label: 'Azure Speech Translation',
    shortLabel: 'Azure Speech',
    transcriptTag: 'Azure Speech Translation',
  },
] as const;

export const isSoundFirstModelId = (value: unknown): value is SoundFirstModelId =>
  SOUND_FIRST_MODELS.some((model) => model.id === value);

export const getSoundFirstModel = (id: SoundFirstModelId): SoundFirstModelOption =>
  SOUND_FIRST_MODELS.find((model) => model.id === id) ?? SOUND_FIRST_MODELS[0];
