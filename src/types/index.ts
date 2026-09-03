export type TranslationStatus = 'pending' | 'complete' | 'failed';

export type TranslationFailureReason =
  | 'interrupted'
  | 'translation_failed'
  | 'cancelled';

export type TranscriptInputMethod =
  | 'desktop_web_speech'
  | 'keyboard_text'
  | 'live_audio';

export interface TranslationCard {
  id: string;
  timestamp: Date;
  sourceText: string;
  sourceTextUnavailable?: boolean;
  translatedText: string;
  /** Missing on records created before source-first persistence was added. */
  translationStatus?: TranslationStatus;
  translationFailureReason?: TranslationFailureReason;
  translationFailureDetail?: string;
  inputMethod?: TranscriptInputMethod;
  workflowId?: string;
  sourceLang: string;
  sourceLangCode?: string;
  targetLang: string;
  targetLangCode: string;
  isPlaying?: boolean;
  pipelineTag?: string;
  latencyMs?: number;
}

export interface LanguageOption {
  code: string;
  speechCode: string; // e.g. ko-KR, en-US, ja-JP
  name: string;
  nativeName: string;
  flag: string;
}

export type PipelineEngineType =
  | 'chrome_nano'
  | 'gemini_stream'
  | 'gemini_live_ws'
  | 'network_fallback'
  | 'turbo_fastpath';

export type Stage1Option = 'webspeech_fast' | 'webspeech_std';
export type Stage2Option =
  | 'auto'
  | 'chrome_nano'
  | 'gemini_stream'
  | 'turbo_fastpath';
export type Stage3Option = 'tts_pipelined' | 'tts_standard';

export interface PipelineSelections {
  stage1: Stage1Option;
  stage2: Stage2Option;
  stage3: Stage3Option;
}

export interface PipelineStatus {
  engineType: PipelineEngineType;
  latencyMs: number;
}
