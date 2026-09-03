type SpeechRecognitionType = any;

interface TranscriptToken {
  key: string;
  start: number;
  end: number;
}

const OVERLAP_FIRST_RESULT_WINDOW_MS = 2_500;

/** Pause used to group a few sentences. 600ms cuts this call’s “uh” gaps. */
export const FOLLOW_ALONG_FAST_SILENCE_MS = 1_200;
export const FOLLOW_ALONG_STABLE_SILENCE_MS = 1_500;
export const FOLLOW_ALONG_FAST_MAX_WORDS = 32;
export const FOLLOW_ALONG_STABLE_MAX_WORDS = 48;

const normalizeTranscript = (text: string): string => text
  .normalize('NFKC')
  .replace(/\s+/gu, ' ')
  .trim()
  .toLocaleLowerCase();

const getTranscriptTokens = (text: string): TranscriptToken[] => {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (
      locale?: string,
      options?: { granularity: 'word' }
    ) => {
      segment(input: string): Iterable<{
        segment: string;
        index: number;
        isWordLike?: boolean;
      }>;
    };
  }).Segmenter;

  if (Segmenter) {
    const segments = [...new Segmenter(undefined, { granularity: 'word' }).segment(text)];
    const tokens = segments
      .filter((segment) => segment.isWordLike)
      .map((segment) => ({
        key: normalizeTranscript(segment.segment),
        start: segment.index,
        end: segment.index + segment.segment.length,
      }))
      .filter((token) => Boolean(token.key));
    if (tokens.length > 1 || /\s/u.test(text)) return tokens;
  }

  const tokens: TranscriptToken[] = [];
  const wordPattern = /[\p{L}\p{M}\p{N}]+/gu;
  for (const match of text.matchAll(wordPattern)) {
    const segment = match[0];
    const start = match.index;
    tokens.push({
      key: normalizeTranscript(segment),
      start,
      end: start + segment.length,
    });
  }

  // Intl.Segmenter is absent in some older WebViews. Splitting a single
  // unspaced CJK token into code points still lets us remove a sufficiently
  // long repeated boundary without matching short, coincidental fragments.
  if (tokens.length === 1 && !/\s/u.test(text)) {
    const codePointTokens: TranscriptToken[] = [];
    for (let index = 0; index < text.length;) {
      const codePoint = String.fromCodePoint(text.codePointAt(index) ?? 0);
      const nextIndex = index + codePoint.length;
      if (/[\p{L}\p{M}\p{N}]/u.test(codePoint)) {
        codePointTokens.push({
          key: normalizeTranscript(codePoint),
          start: index,
          end: nextIndex,
        });
      }
      index = nextIndex;
    }
    return codePointTokens;
  }

  return tokens;
};

/** Remove only a meaningful, exact suffix-to-prefix overlap at a session boundary. */
const removeCrossSessionOverlap = (previousText: string, currentText: string): string => {
  const previousTokens = getTranscriptTokens(previousText);
  const currentTokens = getTranscriptTokens(currentText);
  const maximumOverlap = Math.min(previousTokens.length, currentTokens.length);
  const usesWordBoundaries = /\s/u.test(previousText) || /\s/u.test(currentText);

  for (let count = maximumOverlap; count > 0; count -= 1) {
    const previousStart = previousTokens.length - count;
    const matches = currentTokens
      .slice(0, count)
      .every((token, index) => token.key === previousTokens[previousStart + index]?.key);
    if (!matches) continue;

    const overlapLength = currentTokens
      .slice(0, count)
      .reduce((length, token) => length + [...token.key].length, 0);
    const isMeaningful = usesWordBoundaries ? count >= 2 : overlapLength >= 6;
    if (!isMeaningful) return currentText;

    return currentText
      .slice(currentTokens[count - 1].end)
      .replace(/^[\s,.;:!?\-\u2013\u2014\u2026\u3001\u3002\uFF0C\uFF01\uFF1F]+/u, '')
      .trim();
  }

  return currentText;
};

const FILLER_ONLY = /^(uh+|u[hm]+|er+|ah+|hmm+|mm+|mhm)$/iu;
const SHORT_COMPLETE_UTTERANCE = /^(hi|hello|hey|yes|yeah|yep|yup|no|nope|ok|okay|bye|goodbye|thanks|thank you|sir|right|correct|oh|bye-bye|bye bye|yeah yeah|okay okay)$/iu;

export const countSpokenWords = (text: string): number => getTranscriptTokens(text).length;

export const shouldCommitSpokenPhrase = (
  text: string,
  _mode: 'final-segment' | 'leftover' | 'restart'
): boolean => {
  const clean = text.replace(/\s+/gu, ' ').trim();
  if (!clean) return false;
  const core = clean.replace(/[.?!,…]+$/u, '').trim();
  if (!core || FILLER_ONLY.test(core)) return false;
  if (SHORT_COMPLETE_UTTERANCE.test(core)) return true;
  const words = core.split(/\s+/u).filter(Boolean);
  if (
    words.length > 0
    && words.length <= 3
    && words.every((word) => SHORT_COMPLETE_UTTERANCE.test(word.replace(/[.?!,]+$/u, '')))
  ) {
    return true;
  }
  return countSpokenWords(clean) >= 3;
};

/** Split only on real sentence enders. Never split on yeah/cuz filler turns. */
export const splitAtSentenceBoundaries = (text: string): string[] => {
  const clean = text.replace(/\s+/gu, ' ').trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.?!])\s+/u).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [clean];
};

export type TranscriptCoalesceResult =
  | { action: 'skip' }
  | { action: 'replace'; combined: string }
  | { action: 'append'; text: string };

/** Merge a new spoken phrase with the newest recent phrases (newest first). */
export const resolveTranscriptCoalesce = (
  recentNewestFirst: readonly string[],
  next: string
): TranscriptCoalesceResult => {
  const nextText = next.replace(/\s+/gu, ' ').trim();
  if (!nextText) return { action: 'skip' };
  const nextNormalized = normalizeTranscript(nextText);
  if (recentNewestFirst.length === 0) return { action: 'append', text: nextText };

  const newest = recentNewestFirst[0].replace(/\s+/gu, ' ').trim();
  const newestNormalized = normalizeTranscript(newest);
  if (nextNormalized === newestNormalized) {
    // Allow "hello" / "hello" as two turns. Skip only longer restatements.
    return countSpokenWords(nextText) <= 3
      ? { action: 'append', text: nextText }
      : { action: 'skip' };
  }
  if (
    newestNormalized.startsWith(nextNormalized)
    && countSpokenWords(nextText) <= 4
  ) {
    return { action: 'skip' };
  }
  if (nextNormalized.startsWith(newestNormalized)) {
    return { action: 'replace', combined: nextText };
  }

  for (let count = Math.min(4, recentNewestFirst.length); count >= 2; count -= 1) {
    const chronological = recentNewestFirst
      .slice(0, count)
      .slice()
      .reverse()
      .map((item) => item.replace(/\s+/gu, ' ').trim())
      .filter(Boolean)
      .join(' ');
    const joinedNormalized = normalizeTranscript(chronological);
    if (!joinedNormalized) continue;
    if (nextNormalized === joinedNormalized || joinedNormalized.startsWith(nextNormalized)) {
      return { action: 'skip' };
    }
    if (nextNormalized.startsWith(joinedNormalized)) {
      const remainder = removeCrossSessionOverlap(chronological, nextText);
      if (!remainder || countSpokenWords(remainder) <= 2) return { action: 'skip' };
      return { action: 'append', text: remainder };
    }
  }

  return { action: 'append', text: nextText };
};

export class WebSpeechRecognizer {
  private recognition: SpeechRecognitionType | null = null;
  private desiredListening = false;
  private engineActive = false;
  private silenceTimer: number | null = null;
  private restartTimer: number | null = null;
  private silenceDelayMs = FOLLOW_ALONG_FAST_SILENCE_MS;
  private maxBufferWords = FOLLOW_ALONG_FAST_MAX_WORDS;
  private phraseBuffer: string[] = [];
  private currentLanguage = 'ko-KR';
  private lastInterimText = '';
  private pendingSilenceText = '';
  private finalSegments = new Map<number, string>();
  private emittedFinalIndices = new Set<number>();
  private playbackSuspended = false;
  private generation = 0;
  private lastEmittedTranscript = '';
  private lastEmittedGeneration = 0;
  private lastEmittedAt = 0;
  private recentEmits: string[] = [];
  private readonly useMobileSingleTurn = typeof navigator !== 'undefined'
    && /Android/i.test(navigator.userAgent);

  public onInterimTranscript?: (text: string) => void;
  public onFinalTranscript?: (text: string) => void;
  public onStateChange?: (isListening: boolean) => void;
  public onError?: (error: string) => void;

  constructor() {}

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public setSilenceDelay(delayMs: number): void {
    this.silenceDelayMs = delayMs;
  }

  public setMaxBufferWords(maxWords: number): void {
    this.maxBufferWords = maxWords;
  }

  /** True while the user wants the recognizer running, including session restarts. */
  public isDesiredListening(): boolean {
    return this.desiredListening;
  }

  /** @deprecated Use suspendForPlayback() and resumeAfterPlayback(). */
  public setMuted(muted: boolean): void {
    if (muted) this.suspendForPlayback();
    else this.resumeAfterPlayback();
  }

  /**
   * Stop the native recognizer while synthesized speech is audible. Keeping it
   * running and merely ignoring result events still consumes microphone audio
   * and can feed synthesized output back into the next recognition turn.
   */
  public suspendForPlayback(): void {
    if (this.playbackSuspended) return;
    this.playbackSuspended = true;
    this.flushPhraseBuffer();
    this.engineActive = false;
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.pendingSilenceText = '';
    this.lastInterimText = '';
    this.finalSegments.clear();
    this.emittedFinalIndices.clear();
    this.onInterimTranscript?.('');

    const recognition = this.recognition;
    if (!recognition) return;
    // Detach result delivery before aborting so queued echo/results cannot enter
    // the application while playback suspension is being established.
    recognition.onresult = null;
    try {
      recognition.abort();
    } catch {}
  }

  /** Resume with a fresh native session after all synthesized audio has ended. */
  public resumeAfterPlayback(): void {
    if (!this.playbackSuspended) return;
    this.playbackSuspended = false;
    if (!this.desiredListening) return;

    this.clearRestartTimer();
    this.createRecognitionInstance(false);
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (this.desiredListening && !this.playbackSuspended) this.startCurrentInstance();
    }, this.useMobileSingleTurn ? 180 : 0);
  }

  private createRecognitionInstance(isAutomaticRestart = false): void {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;

    const previous = this.recognition;
    if (previous) {
      previous.onstart = null;
      previous.onresult = null;
      previous.onerror = null;
      previous.onspeechend = null;
      previous.onend = null;
      try {
        previous.abort();
      } catch {}
    }

    const generation = ++this.generation;
    const recognition = new Recognition();
    // Chrome for Android does not reliably keep continuous recognition alive.
    // Single-turn recognition plus a controlled restart is more stable there.
    recognition.continuous = !this.useMobileSingleTurn;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = this.currentLanguage;
    this.recognition = recognition;
    this.finalSegments.clear();
    this.emittedFinalIndices.clear();
    this.lastInterimText = '';
    this.pendingSilenceText = '';
    let sessionEnded = false;
    let firstResultAt: number | null = null;

    const session = () => ({ generation, isAutomaticRestart, firstResultAt });

    const emitSessionRemainder = () => {
      if (this.playbackSuspended || !this.desiredListening) return;
      const unpublishedFinals = [...this.finalSegments.entries()]
        .filter(([index]) => !this.emittedFinalIndices.has(index))
        .sort(([left], [right]) => left - right)
        .map(([index, text]) => {
          this.emittedFinalIndices.add(index);
          return text.trim();
        })
        .filter(Boolean);
      if (unpublishedFinals.length > 0) {
        this.emitTranscript(
          unpublishedFinals.join(' '),
          session(),
          this.useMobileSingleTurn || isAutomaticRestart ? 'restart' : 'final-segment'
        );
      }
      const leftover = (this.useMobileSingleTurn
        ? this.pendingSilenceText || this.lastInterimText
        : this.lastInterimText).trim();
      this.pendingSilenceText = '';
      this.lastInterimText = '';
      if (leftover) this.emitTranscript(leftover, session(), 'restart');
    };

    recognition.onstart = () => {
      if (!this.isCurrent(recognition, generation)) return;
      if (!this.desiredListening || this.playbackSuspended) {
        try {
          recognition.abort();
        } catch {}
        return;
      }
      this.engineActive = true;
      this.onStateChange?.(true);
    };

    recognition.onresult = (event: any) => {
      // abort() may still leave an already-queued result event behind. Never
      // let it start a new translation after the user pressed Stop.
      if (
        sessionEnded
        || !this.isCurrent(recognition, generation)
        || !this.desiredListening
        || this.playbackSuspended
      ) return;
      if (firstResultAt === null) firstResultAt = performance.now();
      this.clearSilenceTimer();
      const newlyFinal: string[] = [];
      const interimParts: string[] = [];

      for (let index = 0; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0].transcript ?? '').trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) {
          this.finalSegments.set(index, transcript);
          if (!this.emittedFinalIndices.has(index)) {
            this.emittedFinalIndices.add(index);
            newlyFinal.push(transcript);
          }
        } else {
          interimParts.push(transcript);
        }
      }

      const session = { generation, isAutomaticRestart, firstResultAt };
      const remainingInterim = interimParts.join(' ').trim();

      if (this.useMobileSingleTurn) {
        const combinedText = [this.getCombinedFinalText(), remainingInterim]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (!combinedText) return;
        this.lastInterimText = combinedText;
        this.onInterimTranscript?.(combinedText);
        return;
      }

      if (newlyFinal.length > 0) {
        this.emitTranscript(newlyFinal.join(' '), session, 'final-segment');
      }
      this.lastInterimText = remainingInterim;
      this.onInterimTranscript?.(remainingInterim);
      this.schedulePhraseBufferFlush();
    };

    recognition.onspeechend = () => {
      if (
        sessionEnded
        || !this.isCurrent(recognition, generation)
        || !this.desiredListening
        || this.playbackSuspended
        || !this.lastInterimText
      ) return;
      // Desktop follow-along keeps the session alive; the silence timer flushes
      // leftover interim. Android single-turn ends on its own.
      this.pendingSilenceText = this.lastInterimText;
    };

    recognition.onerror = (event: any) => {
      if (!this.isCurrent(recognition, generation)) return;
      const code = String(event.error ?? 'unknown');
      if (code === 'no-speech' || code === 'aborted') return;

      const terminal = [
        'not-allowed',
        'service-not-allowed',
        'audio-capture',
        'language-not-supported',
        'network',
      ];
      if (terminal.includes(code)) this.desiredListening = false;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        this.onError?.(
          'Microphone access was denied. Allow microphone access in your browser’s site settings.'
        );
      } else if (code === 'audio-capture') {
        this.onError?.('No microphone is available. Check your audio input device.');
      } else if (code === 'language-not-supported') {
        this.onError?.('This browser does not support speech recognition for the selected language.');
      } else if (code === 'network') {
        this.onError?.('The speech recognition connection was interrupted. Check your network and start again.');
      } else {
        this.onError?.(`Speech recognition error: ${code}`);
      }
    };

    recognition.onend = () => {
      if (!this.isCurrent(recognition, generation)) return;
      sessionEnded = true;
      this.engineActive = false;
      this.clearSilenceTimer();
      if (this.playbackSuspended) {
        this.pendingSilenceText = '';
        this.lastInterimText = '';
        this.finalSegments.clear();
        this.emittedFinalIndices.clear();
        return;
      }
      emitSessionRemainder();

      if (!this.desiredListening) {
        this.onStateChange?.(false);
        return;
      }

      this.restartTimer = window.setTimeout(() => {
        this.restartTimer = null;
        if (
          !this.desiredListening ||
          this.playbackSuspended ||
          !this.isCurrent(recognition, generation)
        ) return;
        this.createRecognitionInstance(true);
        this.startCurrentInstance();
      }, this.useMobileSingleTurn ? 250 : 0);
    };
  }

  private getCombinedFinalText(): string {
    let previous = '';
    return [...this.finalSegments.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text.trim())
      .filter((text) => {
        const normalized = text.replace(/\s+/g, ' ').toLocaleLowerCase();
        if (!normalized || normalized === previous) return false;
        previous = normalized;
        return true;
      })
      .join(' ')
      .trim();
  }

  private isCurrent(recognition: SpeechRecognitionType, generation: number): boolean {
    return this.recognition === recognition && this.generation === generation;
  }

  private emitTranscript(
    text: string,
    session: {
      generation: number;
      isAutomaticRestart: boolean;
      firstResultAt: number | null;
    },
    mode: 'final-segment' | 'leftover' | 'restart'
  ): void {
    let clean = text.replace(/\s+/g, ' ').trim();
    if (!clean || !this.desiredListening || this.playbackSuspended) return;
    if (!shouldCommitSpokenPhrase(clean, mode)) return;

    const recentForCoalesce = [
      ...[...this.phraseBuffer].reverse(),
      ...this.recentEmits,
    ];
    const coalesce = resolveTranscriptCoalesce(recentForCoalesce, clean);
    if (coalesce.action === 'skip') {
      this.schedulePhraseBufferFlush();
      return;
    }
    if (coalesce.action === 'replace') clean = coalesce.combined;
    else clean = coalesce.text;
    if (!clean || !shouldCommitSpokenPhrase(clean, mode === 'restart' ? 'restart' : 'final-segment')) {
      return;
    }

    const emittedAt = performance.now();
    const isImmediateAutomaticRestart = mode === 'restart'
      || (
        session.isAutomaticRestart
        && session.generation !== this.lastEmittedGeneration
        && session.firstResultAt !== null
        && session.firstResultAt - this.lastEmittedAt <= OVERLAP_FIRST_RESULT_WINDOW_MS
      );
    if (isImmediateAutomaticRestart && this.lastEmittedTranscript) {
      const stripped = removeCrossSessionOverlap(this.lastEmittedTranscript, clean);
      if (!stripped) return;
      clean = stripped;
    }

    this.lastEmittedTranscript = clean;
    this.lastEmittedGeneration = session.generation;
    this.lastEmittedAt = emittedAt;
    this.enqueueBufferedPhrase(clean, coalesce.action === 'replace');
  }

  private enqueueBufferedPhrase(text: string, replaceNewest: boolean): void {
    if (!replaceNewest) {
      const sentences = splitAtSentenceBoundaries(text);
      if (sentences.length > 1) {
        for (const sentence of sentences) this.enqueueBufferedPhrase(sentence, false);
        return;
      }
      if (
        this.phraseBuffer.length > 0
        && countSpokenWords([...this.phraseBuffer, text].join(' ')) >= this.maxBufferWords
      ) {
        this.flushPhraseBuffer();
      }
    }
    if (replaceNewest && this.phraseBuffer.length > 0) {
      this.phraseBuffer[this.phraseBuffer.length - 1] = text;
    } else {
      this.phraseBuffer.push(text);
    }
    this.schedulePhraseBufferFlush();
  }

  private schedulePhraseBufferFlush(): void {
    this.clearSilenceTimer();
    if (!this.desiredListening || this.playbackSuspended) return;
    if (this.phraseBuffer.length === 0 && !this.lastInterimText.trim()) return;
    this.silenceTimer = window.setTimeout(() => {
      this.silenceTimer = null;
      if (!this.desiredListening || this.playbackSuspended) return;
      const leftover = this.lastInterimText.trim();
      if (leftover && shouldCommitSpokenPhrase(leftover, 'final-segment')) {
        this.lastInterimText = '';
        this.onInterimTranscript?.('');
        this.enqueueBufferedPhrase(leftover, false);
      }
      this.flushPhraseBuffer();
    }, this.silenceDelayMs);
  }

  private flushPhraseBuffer(): void {
    this.clearSilenceTimer();
    const joined = this.phraseBuffer.join(' ').replace(/\s+/gu, ' ').trim();
    this.phraseBuffer = [];
    if (!joined) return;
    this.recentEmits = [joined, ...this.recentEmits].slice(0, 6);
    this.lastEmittedTranscript = joined;
    this.onFinalTranscript?.(joined);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private startCurrentInstance(attempt = 0): void {
    if (!this.desiredListening || this.playbackSuspended) return;
    try {
      this.recognition?.start();
    } catch (error) {
      console.warn('[WebSpeechRecognizer] start failed:', error);
      this.clearRestartTimer();
      if (!this.desiredListening || this.playbackSuspended) return;
      if (attempt >= 2) {
        this.desiredListening = false;
        this.onStateChange?.(false);
        this.onError?.(`Could not start speech recognition: ${String(error)}`);
        return;
      }
      this.restartTimer = window.setTimeout(() => {
        this.restartTimer = null;
        if (!this.desiredListening || this.playbackSuspended) return;
        this.createRecognitionInstance(false);
        this.startCurrentInstance(attempt + 1);
      }, this.useMobileSingleTurn ? 300 * (attempt + 1) : 150 * (attempt + 1));
    }
  }

  public setLanguage(speechCode: string): void {
    this.currentLanguage = speechCode;
    if (this.recognition) this.recognition.lang = speechCode;
    if (this.desiredListening && !this.playbackSuspended) this.restart();
  }

  public start(speechCode?: string): void {
    if (!WebSpeechRecognizer.isSupported()) {
      this.onError?.('This browser does not support the Web Speech API. Use Chrome, Safari, or Edge.');
      return;
    }
    if (speechCode) this.currentLanguage = speechCode;

    this.clearRestartTimer();
    this.clearSilenceTimer();
    this.pendingSilenceText = '';
    this.lastInterimText = '';
    this.finalSegments.clear();
    this.emittedFinalIndices.clear();
    this.playbackSuspended = false;
    this.desiredListening = true;
    this.lastEmittedTranscript = '';
    this.lastEmittedGeneration = 0;
    this.lastEmittedAt = 0;
    this.recentEmits = [];
    this.phraseBuffer = [];
    this.createRecognitionInstance(false);
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (this.desiredListening && !this.playbackSuspended) this.startCurrentInstance();
    }, this.useMobileSingleTurn ? 180 : 0);
  }

  public stop(): void {
    this.clearSilenceTimer();
    this.clearRestartTimer();
    const unpublishedFinals = [...this.finalSegments.entries()]
      .filter(([index]) => !this.emittedFinalIndices.has(index))
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text.trim())
      .filter(Boolean);
    if (unpublishedFinals.length > 0) {
      this.emitTranscript(
        unpublishedFinals.join(' '),
        { generation: this.generation, isAutomaticRestart: false, firstResultAt: null },
        'final-segment'
      );
    }
    const leftover = (this.lastInterimText || this.pendingSilenceText).trim();
    if (leftover) {
      this.emitTranscript(
        leftover,
        { generation: this.generation, isAutomaticRestart: false, firstResultAt: null },
        'restart'
      );
    }
    this.flushPhraseBuffer();
    this.desiredListening = false;
    this.engineActive = false;
    this.playbackSuspended = false;
    this.pendingSilenceText = '';
    this.lastInterimText = '';
    this.finalSegments.clear();
    this.emittedFinalIndices.clear();
    this.onInterimTranscript?.('');
    const recognition = this.recognition;
    if (recognition) {
      try {
        recognition.abort();
      } catch {}
    }
    this.onStateChange?.(false);
  }

  public restart(): void {
    if (!this.desiredListening && !this.engineActive) return;
    this.stop();
    this.start(this.currentLanguage);
  }
}
