export interface TranslationCard {
  id: string;
  timestamp: Date;
  sourceText: string;
  translatedText: string;
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
  stt: string;
  engine: string;
  engineType: PipelineEngineType;
  tts: string;
  latencyMs: number;
  isStreaming: boolean;
  isLiveWs: boolean;
}
