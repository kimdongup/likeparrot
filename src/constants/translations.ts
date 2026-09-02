export interface UiStrings {
  subtitle: string;
  allInOneSubtitle: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  startListening: string;
  stopListening: string;
  micListeningHint: string;
  micIdleHint: string;
  waiting: string;
  connecting: string;
  listening: string;
  speaking: string;
  allInOneBtn: string;
  standardBtn: string;
  keyBtn: string;
  cardsTitle: string;
  clearAll: string;
  emptyCards: string;
  emptyHint: string;
  interimHint: string;
  streamingHint: string;
  stage1Title: string;
  stage2Title: string;
  stage3Title: string;
  pipelineBoardTitle: string;
}

/**
 * Interface copy is intentionally independent from the spoken language.
 * Speech and transcript elements set their own `lang` attributes separately.
 */
export const ENGLISH_UI_STRINGS: UiStrings = {
  subtitle: 'Text First: transcribe speech, then translate with your selected engine',
  allInOneSubtitle: 'Audio First: stream translated speech while you talk and save the transcript',
  sourceLangLabel: 'Language I speak',
  targetLangLabel: 'Translate to',
  startListening: 'Start Live Translation',
  stopListening: 'Stop Live Translation',
  micListeningHint: 'Microphone on — speak naturally.',
  micIdleHint: 'Tap Start, then speak naturally.',
  waiting: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening…',
  speaking: 'Speaking…',
  allInOneBtn: 'Audio First',
  standardBtn: 'Text First',
  keyBtn: 'Settings',
  cardsTitle: 'Translation Transcript',
  clearAll: 'Clear all',
  emptyCards: 'No transcript yet',
  emptyHint: 'Start translation and speak to record the source and translation here.',
  interimHint: 'Recognizing speech…',
  streamingHint: 'Streaming translation…',
  stage1Title: 'Stage 1: Voice Input (STT)',
  stage2Title: 'Stage 2: Translation Engine',
  stage3Title: 'Stage 3: Voice Output (TTS)',
  pipelineBoardTitle: 'LIVE PIPELINE Dashboard',
};

export const getUiStrings = (_languageCode?: string): UiStrings => ENGLISH_UI_STRINGS;
