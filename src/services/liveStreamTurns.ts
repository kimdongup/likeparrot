import type { TranslationStatus } from '../types';
import type { LiveTranslationTurn } from './liveTranslation';

const SOURCE_SENTENCE_QUIET_MS = 400;
const SOURCE_PHRASE_QUIET_MS = 800;
const OUTPUT_SENTENCE_QUIET_MS = 500;
const OUTPUT_PHRASE_QUIET_MS = 900;
const MAX_COMMIT_SENTENCES = 3;
const SENTENCE_BREAK = /[.!?。！？…]["')\]]*\s+/u;

export type LiveTranscriptMode = 'delta' | 'merge' | 'snapshot';

export type LiveStreamTurnPayload = Omit<
  LiveTranslationTurn,
  'sourceLanguageCode' | 'targetLanguageCode'
>;

/**
 * Transcription chunks may be append-only deltas, revised snapshots of the
 * current utterance, or growing snapshots of the whole session. Merge without
 * duplicating an already displayed prefix.
 */
export const mergeLiveTranscript = (previous: string, incoming: string): string => {
  const next = incoming.trim();
  if (!next) return previous;
  if (!previous) return next;
  if (next === previous || previous.endsWith(next)) return previous;
  if (next.startsWith(previous)) return next;

  const maxOverlap = Math.min(previous.length, next.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (previous.slice(-overlap) === next.slice(0, overlap)) {
      return `${previous}${next.slice(overlap)}`;
    }
  }

  const needsSpace = /^\s/u.test(incoming) || (
    /[\p{Script=Latin}\p{N}]$/u.test(previous) &&
    /^[\p{Script=Latin}\p{N}]/u.test(next)
  );
  return `${previous}${needsSpace ? ' ' : ''}${next}`;
};

const endsWithSentence = (text: string): boolean =>
  /[.!?。！？…]["')\]]*\s*$/u.test(text.trim());

const applyIncoming = (
  previous: string,
  incoming: string,
  mode: LiveTranscriptMode,
  committedPrefix: string
): string => {
  const raw = incoming.trim();
  if (!raw) return previous;
  if (mode === 'delta') return `${previous}${incoming}`;
  if (mode === 'snapshot') {
    if (committedPrefix && raw.startsWith(committedPrefix)) {
      return raw.slice(committedPrefix.length).trimStart();
    }
    return raw;
  }
  if (committedPrefix && raw.startsWith(committedPrefix)) {
    return raw.slice(committedPrefix.length).trimStart();
  }
  return mergeLiveTranscript(previous, incoming);
};

const takeReadyPrefix = (text: string): { prefix: string; rest: string } => {
  const matches = [...text.matchAll(new RegExp(SENTENCE_BREAK, 'gu'))];
  if (matches.length === 0) return { prefix: '', rest: text };
  const cutIndex = matches.length >= MAX_COMMIT_SENTENCES
    ? MAX_COMMIT_SENTENCES - 1
    : matches.length - 1;
  const cut = matches[cutIndex];
  const splitAt = (cut.index ?? 0) + cut[0].length;
  const rest = text.slice(splitAt).trim();
  if (!rest && matches.length < MAX_COMMIT_SENTENCES) return { prefix: '', rest: text };
  return { prefix: text.slice(0, splitAt).trim(), rest };
};

const createTurnId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `live-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Two-lane live transcript ledger: source cards are committed as soon as
 * speech is recognizable. Translated text is attached later, in order.
 */
export class LiveStreamTurnAssembler {
  private sourceText = '';
  private outputText = '';
  private committedSource = '';
  private committedOutput = '';
  private pendingIds: string[] = [];
  private speechStartedAt = 0;
  private firstOutputAt = 0;
  private sourceQuietTimer: number | null = null;
  private outputQuietTimer: number | null = null;
  private readonly emitTurn: (turn: LiveStreamTurnPayload) => void;

  constructor(emitTurn: (turn: LiveStreamTurnPayload) => void) {
    this.emitTurn = emitTurn;
  }

  public get sourcePreview(): string {
    return this.sourceText.trim();
  }

  public get outputPreview(): string {
    return this.outputText.trim();
  }

  public hasBufferedData(): boolean {
    return Boolean(this.sourceText.trim() || this.outputText.trim() || this.pendingIds.length > 0);
  }

  public noteSpeech(): void {
    if (!this.speechStartedAt) this.speechStartedAt = performance.now();
  }

  public noteOutput(): void {
    this.noteSpeech();
    if (!this.firstOutputAt) this.firstOutputAt = performance.now();
  }

  public appendSource(incoming: string, mode: LiveTranscriptMode = 'merge'): void {
    this.noteSpeech();
    this.sourceText = applyIncoming(this.sourceText, incoming, mode, this.committedSource);
    const ready = takeReadyPrefix(this.sourceText);
    if (ready.prefix) {
      this.scheduleSourceFreeze(0, ready.prefix, ready.rest);
      return;
    }
    this.scheduleSourceFreeze(
      endsWithSentence(this.sourceText) ? SOURCE_SENTENCE_QUIET_MS : SOURCE_PHRASE_QUIET_MS
    );
  }

  public appendOutput(
    incoming: string,
    mode: LiveTranscriptMode = 'merge',
    armCommit = true
  ): void {
    this.noteOutput();
    this.outputText = applyIncoming(this.outputText, incoming, mode, this.committedOutput);
    if (!armCommit) return;
    const ready = takeReadyPrefix(this.outputText);
    if (ready.prefix) {
      this.scheduleOutputAttach(0, ready.prefix, ready.rest);
      return;
    }
    this.scheduleOutputAttach(
      endsWithSentence(this.outputText) ? OUTPUT_SENTENCE_QUIET_MS : OUTPUT_PHRASE_QUIET_MS
    );
  }

  public completeUtterance(): void {
    this.freezeOpenSource();
    this.attachReadyOutput(this.outputText, '');
  }

  public flush(): void {
    this.clearTimers();
    this.freezeOpenSource();
    this.attachReadyOutput(this.outputText, '');
    this.abandonUnmatchedSources();
  }

  public reset(): void {
    this.clearTimers();
    this.sourceText = '';
    this.outputText = '';
    this.committedSource = '';
    this.committedOutput = '';
    this.pendingIds = [];
    this.speechStartedAt = 0;
    this.firstOutputAt = 0;
  }

  public dispose(): void {
    this.reset();
  }

  private scheduleSourceFreeze(delayMs: number, prefix = '', rest = ''): void {
    if (this.sourceQuietTimer !== null) window.clearTimeout(this.sourceQuietTimer);
    const run = () => {
      this.sourceQuietTimer = null;
      if (prefix) {
        this.sourceText = prefix;
        this.freezeOpenSource();
        this.sourceText = rest;
        return;
      }
      this.freezeOpenSource();
    };
    if (delayMs <= 0) {
      run();
      return;
    }
    this.sourceQuietTimer = window.setTimeout(run, delayMs);
  }

  private freezeOpenSource(): void {
    const sourceText = this.sourceText.trim();
    if (sourceText) {
      const id = createTurnId();
      this.emitTurn({
        id,
        sourceText,
        translatedText: '',
        translationStatus: 'pending',
        latencyMs: 0,
      });
      this.pendingIds.push(id);
      this.committedSource = `${this.committedSource}${this.committedSource ? ' ' : ''}${sourceText}`.trim();
    }
    this.sourceText = '';
    this.speechStartedAt = 0;
  }

  private scheduleOutputAttach(delayMs: number, prefix = '', rest = ''): void {
    if (this.outputQuietTimer !== null) window.clearTimeout(this.outputQuietTimer);
    const run = () => {
      this.outputQuietTimer = null;
      if (prefix) this.attachReadyOutput(prefix, rest);
      else this.attachReadyOutput(this.outputText, '');
    };
    if (delayMs <= 0) {
      run();
      return;
    }
    this.outputQuietTimer = window.setTimeout(run, delayMs);
  }

  private attachReadyOutput(outputSlice: string, remainder: string): void {
    const translatedText = outputSlice.trim();
    if (!translatedText) return;
    this.freezeOpenSource();
    const id = this.pendingIds.shift();
    const latencyMs = this.speechStartedAt && this.firstOutputAt
      ? Math.max(0, Math.round(this.firstOutputAt - this.speechStartedAt))
      : 0;
    if (id) {
      this.emitTurn({
        id,
        sourceText: '',
        translatedText,
        translationStatus: 'complete',
        latencyMs,
      });
    } else {
      this.emitTurn({
        id: createTurnId(),
        sourceText: '',
        translatedText,
        translationStatus: 'complete',
        latencyMs,
      });
    }
    this.committedOutput = `${this.committedOutput}${this.committedOutput ? ' ' : ''}${translatedText}`.trim();
    this.outputText = remainder.trim();
    this.firstOutputAt = this.outputText ? performance.now() : 0;
    this.speechStartedAt = this.outputText ? performance.now() : 0;
  }

  private abandonUnmatchedSources(): void {
    const leftover = this.pendingIds.splice(0);
    for (const id of leftover) {
      this.emitTurn({
        id,
        sourceText: '',
        translatedText: '',
        translationStatus: 'failed' as TranslationStatus,
        latencyMs: 0,
      });
    }
  }

  private clearTimers(): void {
    if (this.sourceQuietTimer !== null) window.clearTimeout(this.sourceQuietTimer);
    if (this.outputQuietTimer !== null) window.clearTimeout(this.outputQuietTimer);
    this.sourceQuietTimer = null;
    this.outputQuietTimer = null;
  }
}
