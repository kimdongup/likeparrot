export type LiveStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface LiveTranslationTurn {
  sourceText: string;
  translatedText: string;
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

export interface LiveTranslationService {
  start(
    apiKey: string,
    sourceLanguageCode: string,
    targetLanguageCode: string
  ): Promise<void>;
  stop(): Promise<void>;
  dispose(): void;
}

export type SoundFirstModelId =
  | 'gemini-3.5-live-translate-preview'
  | 'gpt-realtime-translate';

export interface SoundFirstModelOption {
  id: SoundFirstModelId;
  provider: 'gemini' | 'openai';
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
] as const;

export const isSoundFirstModelId = (value: unknown): value is SoundFirstModelId =>
  SOUND_FIRST_MODELS.some((model) => model.id === value);

export const getSoundFirstModel = (id: SoundFirstModelId): SoundFirstModelOption =>
  SOUND_FIRST_MODELS.find((model) => model.id === id) ?? SOUND_FIRST_MODELS[0];
