import { synthesizeAzureSpeech } from './azureSpeechTts';
import { TranslatedAudioPlayer } from './translatedAudioPlayer';

interface SpeechQueueItem {
  text: string;
  langCode: string;
  generation: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
  groupId?: string;
}

export class SpeechService {
  private static speechQueue: SpeechQueueItem[] = [];
  private static isQueueRunning = false;
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static generation = 0;
  private static pendingTimer: number | null = null;
  private static queueResumeTimer: number | null = null;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static activeQueueItem: SpeechQueueItem | null = null;
  private static finishActiveQueueItem: (() => void) | null = null;
  private static watchdogTimer: number | null = null;
  private static azureSpeechKey = '';
  private static azureSpeechRegion = '';
  private static queueProcessing = false;

  public static configureAzureSpeech(apiKey: string, region: string): void {
    this.azureSpeechKey = apiKey.trim();
    this.azureSpeechRegion = region.trim();
  }

  static {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const refreshVoices = () => {
        SpeechService.cachedVoices = window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      refreshVoices();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.speechSynthesis.paused) {
          try {
            window.speechSynthesis.resume();
          } catch {}
        }
      });
    }
  }

  private static getVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.cachedVoices.length === 0) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices;
  }

  private static findMatchingVoice(langCode: string): SpeechSynthesisVoice | undefined {
    const normalizedCode = langCode.replace('_', '-').toLowerCase();
    const baseLanguage = normalizedCode.split('-')[0];
    const voices = this.getVoices();

    return voices.find((voice) => voice.lang.replace('_', '-').toLowerCase() === normalizedCode) ??
      voices.find((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith(`${baseLanguage}-`));
  }

  private static clearWatchdog(): void {
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private static armWatchdog(text: string, onTimeout: () => void): void {
    this.clearWatchdog();
    // Keep the fallback conservative enough not to cut off a legitimate long
    // utterance. Some mobile engines omit end/error entirely, so the queue still
    // needs a finite upper bound.
    const timeoutMs = Math.min(180_000, Math.max(10_000, text.length * 300 + 5_000));
    this.watchdogTimer = window.setTimeout(() => {
      this.watchdogTimer = null;
      onTimeout();
    }, timeoutMs);
  }

  public static speak(
    text: string,
    langCode: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: unknown) => void
  ): void {
    const cleanText = text.trim();
    this.stop();
    if (!cleanText) {
      onEnd?.();
      return;
    }
    this.speechQueue.push({
      text: cleanText,
      langCode,
      generation: this.generation,
      onStart,
      onEnd,
      onError,
    });
    this.processQueue();
  }

  public static enqueueChunk(
    text: string,
    langCode: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: unknown) => void,
    groupId?: string
  ): void {
    const cleanText = text.trim();
    if (!cleanText) return;
    const item: SpeechQueueItem = {
      text: cleanText,
      langCode,
      generation: this.generation,
      onStart,
      onEnd,
      onError,
      groupId,
    };
    this.speechQueue.push(item);
    this.processQueue();
  }

  private static processQueue(): void {
    if (this.queueProcessing) return;
    void this.processQueueAsync();
  }

  private static async processQueueAsync(): Promise<void> {
    if (this.queueProcessing) return;
    this.queueProcessing = true;
    this.isQueueRunning = true;
    try {
      while (this.speechQueue.length > 0) {
        const item = this.speechQueue.shift();
        if (!item) break;
        if (item.generation !== this.generation) continue;
        this.activeQueueItem = item;
        await this.playItem(item);
        this.activeQueueItem = null;
      }
    } finally {
      this.queueProcessing = false;
      this.isQueueRunning = this.speechQueue.length > 0;
      this.activeQueueItem = null;
      this.finishActiveQueueItem = null;
      if (this.speechQueue.length > 0) this.processQueue();
    }
  }

  /**
   * Prefer Azure Speech → AudioContext so listening can continue. Fall back to
   * device speechSynthesis only when no Speech credentials are saved.
   */
  private static async playItem(item: SpeechQueueItem): Promise<void> {
    if (this.azureSpeechKey && this.azureSpeechRegion) {
      try {
        const audio = await synthesizeAzureSpeech(
          item.text,
          item.langCode,
          this.azureSpeechKey,
          this.azureSpeechRegion
        );
        if (item.generation !== this.generation) {
          item.onEnd?.();
          return;
        }
        await TranslatedAudioPlayer.enqueue(
          audio,
          item.onStart,
          item.onEnd,
          item.onError
        );
        return;
      } catch (error) {
        if (item.generation !== this.generation) {
          item.onEnd?.();
          return;
        }
        console.warn('[Speech] Azure Speech TTS failed, using device voice:', error);
      }
    }
    await this.playWithDeviceVoice(item);
  }

  private static playWithDeviceVoice(item: SpeechQueueItem): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        const error = new Error('This browser does not support text-to-speech.');
        item.onError?.(error);
        item.onEnd?.();
        resolve();
        return;
      }
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        const utterance = this.createUtterance(item.text, item.langCode, 1.05);
        this.activeUtterance = utterance;
        let completed = false;
        const finish = (error?: unknown) => {
          if (completed) return;
          completed = true;
          if (item.generation !== this.generation) {
            resolve();
            return;
          }
          this.clearWatchdog();
          this.activeUtterance = null;
          this.finishActiveQueueItem = null;
          const speechError = typeof error === 'object' && error !== null && 'error' in error
            ? String((error as { error?: unknown }).error ?? '')
            : '';
          if (error && speechError !== 'canceled' && speechError !== 'interrupted') {
            item.onError?.(error);
          }
          item.onEnd?.();
          resolve();
        };
        this.finishActiveQueueItem = () => finish();
        utterance.onstart = () => {
          if (item.generation === this.generation) item.onStart?.();
        };
        utterance.onend = () => finish();
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => finish(event);
        this.armWatchdog(item.text, () => {
          try {
            window.speechSynthesis.cancel();
          } catch {}
          finish(new Error('TTS did not report completion. Moving to the next phrase.'));
        });
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        this.clearWatchdog();
        this.activeUtterance = null;
        item.onError?.(error);
        item.onEnd?.();
        resolve();
      }
    });
  }

  /** Remove only the queued/playing audio produced by one translation request. */
  public static cancelGroup(groupId: string): void {
    if (!groupId) return;
    this.speechQueue = this.speechQueue.filter((item) => item.groupId !== groupId);
    if (this.activeQueueItem?.groupId !== groupId) return;

    const finish = this.finishActiveQueueItem;
    // Complete our bookkeeping first, then cancel. The deferred queue resume
    // avoids Chromium discarding a new utterance queued in cancel()'s task.
    finish?.();
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  private static createUtterance(
    text: string,
    langCode: string,
    rate: number
  ): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = 1;
    const voice = this.findMatchingVoice(langCode);
    if (voice) utterance.voice = voice;
    return utterance;
  }

  public static stop(): void {
    this.generation += 1;
    this.speechQueue = [];
    this.isQueueRunning = false;
    this.queueProcessing = false;
    this.activeUtterance = null;
    this.activeQueueItem = null;
    this.finishActiveQueueItem = null;
    TranslatedAudioPlayer.stop();
    this.clearWatchdog();
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.queueResumeTimer !== null) {
      window.clearTimeout(this.queueResumeTimer);
      this.queueResumeTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public static isSpeaking(): boolean {
    return Boolean(
      this.pendingTimer !== null ||
        this.queueResumeTimer !== null ||
        this.activeUtterance ||
        this.isQueueRunning ||
        this.speechQueue.length > 0 ||
        TranslatedAudioPlayer.isSpeaking() ||
        (typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          window.speechSynthesis.speaking)
    );
  }
}
