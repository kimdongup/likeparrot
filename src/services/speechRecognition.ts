type SpeechRecognitionType = any;

export class WebSpeechRecognizer {
  private recognition: SpeechRecognitionType | null = null;
  private desiredListening = false;
  private engineActive = false;
  private silenceTimer: number | null = null;
  private restartTimer: number | null = null;
  private silenceDelayMs = 600;
  private currentLanguage = 'ko-KR';
  private lastInterimText = '';
  private pendingSilenceText = '';
  private isMuted = false;
  private generation = 0;

  public onInterimTranscript?: (text: string) => void;
  public onFinalTranscript?: (text: string) => void;
  public onStateChange?: (isListening: boolean) => void;
  public onError?: (error: string) => void;

  constructor() {
    this.createRecognitionInstance();
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public setSilenceDelay(delayMs: number): void {
    this.silenceDelayMs = delayMs;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.clearSilenceTimer();
      this.pendingSilenceText = '';
      this.lastInterimText = '';
      this.onInterimTranscript?.('');
    }
  }

  private createRecognitionInstance(): void {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;

    const previous = this.recognition;
    if (previous) {
      previous.onstart = null;
      previous.onresult = null;
      previous.onerror = null;
      previous.onend = null;
      try {
        previous.abort();
      } catch {}
    }

    const generation = ++this.generation;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = this.currentLanguage;
    this.recognition = recognition;

    recognition.onstart = () => {
      if (!this.isCurrent(recognition, generation)) return;
      if (!this.desiredListening) {
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
      if (!this.isCurrent(recognition, generation) || !this.desiredListening || this.isMuted) return;
      this.clearSilenceTimer();
      let interim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0].transcript ?? '').trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) {
          this.pendingSilenceText = '';
          this.emitFinal(transcript);
        } else {
          interim += `${interim ? ' ' : ''}${transcript}`;
        }
      }

      const cleanInterim = interim.trim();
      if (!cleanInterim) return;
      this.lastInterimText = cleanInterim;
      this.onInterimTranscript?.(cleanInterim);
      this.silenceTimer = window.setTimeout(() => {
        if (!this.lastInterimText || this.isMuted || !this.desiredListening) return;
        this.pendingSilenceText = this.lastInterimText;
        // Asking the engine to stop produces its canonical final result. If it
        // does not, onend emits pendingSilenceText exactly once as a fallback.
        try {
          recognition.stop();
        } catch {
          this.emitPendingSilenceText();
        }
      }, this.silenceDelayMs);
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
      this.engineActive = false;
      this.emitPendingSilenceText();

      if (!this.desiredListening) {
        this.onStateChange?.(false);
        return;
      }

      this.restartTimer = window.setTimeout(() => {
        this.restartTimer = null;
        if (!this.desiredListening || !this.isCurrent(recognition, generation)) return;
        this.createRecognitionInstance();
        this.startCurrentInstance();
      }, 80);
    };
  }

  private isCurrent(recognition: SpeechRecognitionType, generation: number): boolean {
    return this.recognition === recognition && this.generation === generation;
  }

  private emitFinal(text: string): void {
    const clean = text.trim();
    if (!clean || !this.desiredListening || this.isMuted) return;
    this.pendingSilenceText = '';
    this.lastInterimText = '';
    this.clearSilenceTimer();
    this.onInterimTranscript?.('');
    this.onFinalTranscript?.(clean);
  }

  private emitPendingSilenceText(): void {
    const pending = this.pendingSilenceText.trim();
    this.pendingSilenceText = '';
    if (pending && !this.isMuted) this.emitFinal(pending);
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

  private startCurrentInstance(): void {
    try {
      this.recognition?.start();
    } catch (error) {
      console.warn('[WebSpeechRecognizer] start failed:', error);
      this.clearRestartTimer();
      this.restartTimer = window.setTimeout(() => {
        this.restartTimer = null;
        if (!this.desiredListening) return;
        this.createRecognitionInstance();
        try {
          this.recognition?.start();
        } catch (retryError) {
          this.desiredListening = false;
          this.onStateChange?.(false);
          this.onError?.(`Could not start speech recognition: ${String(retryError)}`);
        }
      }, 150);
    }
  }

  public setLanguage(speechCode: string): void {
    this.currentLanguage = speechCode;
    if (this.recognition) this.recognition.lang = speechCode;
    if (this.desiredListening) this.restart();
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
    this.isMuted = false;
    this.desiredListening = true;
    this.createRecognitionInstance();
    this.startCurrentInstance();
  }

  public stop(): void {
    this.desiredListening = false;
    this.engineActive = false;
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.pendingSilenceText = '';
    this.lastInterimText = '';
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
