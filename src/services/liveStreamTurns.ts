import type { LiveTranslationTurn } from './liveTranslation';

const SENTENCE_QUIET_MS = 800;
const PHRASE_QUIET_MS = 1_400;
const SOURCE_CATCHUP_MS = 450;
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

/**
 * Pairs streaming source text with the translated text/audio that arrives
 * alongside it, and commits utterance-sized cards instead of one session blob.
 */
export class LiveStreamTurnAssembler {
  private sourceText = '';
  private outputText = '';
  private committedSource = '';
  private committedOutput = '';
  private speechStartedAt = 0;
  private firstOutputAt = 0;
  private quietTimer: number | null = null;
  private catchupTimer: number | null = null;
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
    return Boolean(this.sourceText.trim() || this.outputText.trim());
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
      this.scheduleCommit(SOURCE_CATCHUP_MS, ready.prefix, ready.rest);
      return;
    }
    this.scheduleCommit(endsWithSentence(this.outputText) ? SENTENCE_QUIET_MS : PHRASE_QUIET_MS);
  }

  public completeUtterance(): void {
    if (!this.hasBufferedData()) return;
    this.scheduleCommit(this.sourceText.trim() ? 0 : SOURCE_CATCHUP_MS);
  }

  public flush(): void {
    this.clearTimers();
    this.commit(this.outputText, '');
  }

  public reset(): void {
    this.clearTimers();
    this.sourceText = '';
    this.outputText = '';
    this.committedSource = '';
    this.committedOutput = '';
    this.speechStartedAt = 0;
    this.firstOutputAt = 0;
  }

  public dispose(): void {
    this.reset();
  }

  private scheduleCommit(delayMs: number, prefix = '', rest = ''): void {
    this.clearTimers();
    const run = () => {
      this.catchupTimer = null;
      this.quietTimer = null;
      if (prefix) this.commit(prefix, rest);
      else this.commit(this.outputText, '');
    };
    if (delayMs <= 0) {
      run();
      return;
    }
    const timer = window.setTimeout(run, delayMs);
    if (prefix) this.catchupTimer = timer;
    else this.quietTimer = timer;
  }

  private commit(outputSlice: string, remainder: string): void {
    const translatedText = outputSlice.trim();
    const sourceText = this.sourceText.trim();
    if (!translatedText && !sourceText) {
      this.speechStartedAt = 0;
      this.firstOutputAt = 0;
      return;
    }
    if (!translatedText) return;
    const latencyMs = this.speechStartedAt && this.firstOutputAt
      ? Math.max(0, Math.round(this.firstOutputAt - this.speechStartedAt))
      : 0;
    this.emitTurn({ sourceText, translatedText, latencyMs });
    this.committedSource = `${this.committedSource}${this.committedSource && sourceText ? ' ' : ''}${sourceText}`.trim();
    this.committedOutput = `${this.committedOutput}${this.committedOutput && translatedText ? ' ' : ''}${translatedText}`.trim();
    this.sourceText = '';
    this.outputText = remainder.trim();
    this.speechStartedAt = this.outputText ? performance.now() : 0;
    this.firstOutputAt = this.outputText ? performance.now() : 0;
  }

  private clearTimers(): void {
    if (this.quietTimer !== null) window.clearTimeout(this.quietTimer);
    if (this.catchupTimer !== null) window.clearTimeout(this.catchupTimer);
    this.quietTimer = null;
    this.catchupTimer = null;
  }
}
