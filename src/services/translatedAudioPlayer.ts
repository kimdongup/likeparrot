/**
 * Plays translated speech through Web Audio so Chrome does not abort
 * SpeechRecognition the way window.speechSynthesis does.
 */
export class TranslatedAudioPlayer {
  private static context: AudioContext | null = null;
  private static nextTime = 0;
  private static active = 0;
  private static generation = 0;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContextCtor();
      this.nextTime = 0;
    }
    return this.context;
  }

  public static async enqueue(
    data: ArrayBuffer,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: unknown) => void
  ): Promise<void> {
    const context = this.getContext();
    if (!context) {
      onError?.(new Error('Web Audio playback is unavailable.'));
      onEnd?.();
      return;
    }
    const generation = this.generation;
    try {
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation) {
        onEnd?.();
        return;
      }
      const audioBuffer = await context.decodeAudioData(data.slice(0));
      if (generation !== this.generation) {
        onEnd?.();
        return;
      }
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      const now = context.currentTime;
      if (this.nextTime < now) this.nextTime = now + 0.02;
      const startAt = this.nextTime;
      this.nextTime += audioBuffer.duration;
      this.active += 1;
      onStart?.();
      await new Promise<void>((resolve, reject) => {
        source.onended = () => resolve();
        try {
          source.start(startAt);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      onError?.(error);
    } finally {
      this.active = Math.max(0, this.active - 1);
      if (generation === this.generation) onEnd?.();
    }
  }

  public static stop(): void {
    this.generation += 1;
    this.active = 0;
    if (this.context && this.context.state !== 'closed') {
      this.nextTime = this.context.currentTime;
    }
  }

  public static isSpeaking(): boolean {
    return this.active > 0;
  }
}
