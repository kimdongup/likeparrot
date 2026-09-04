import { LiveStreamTurnAssembler } from './liveStreamTurns';
import type {
  LiveSocketCallbacks,
  LiveStartOptions,
  LiveTranslationService,
} from './liveTranslation';

export type AzureSpeechLiveMode = 'live-interpreter' | 'speech-translation';

const TARGET_VOICES: Record<string, string> = {
  ko: 'ko-KR-SunHiNeural',
  en: 'en-US-JennyNeural',
  ja: 'ja-JP-NanamiNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  es: 'es-ES-ElviraNeural',
  fr: 'fr-FR-DeniseNeural',
  de: 'de-DE-KatjaNeural',
  vi: 'vi-VN-HoaiMyNeural',
};

const SOURCE_LOCALES: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  'zh-TW': 'zh-TW',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  vi: 'vi-VN',
};

const toSpeechTarget = (languageCode: string): string => {
  if (languageCode === 'zh-TW') return 'zh-Hant';
  if (languageCode === 'zh') return 'zh-Hans';
  return languageCode.split('-')[0] ?? languageCode;
};

const toSpeechLocale = (languageCode: string): string =>
  SOURCE_LOCALES[languageCode] ?? languageCode;

const pickTranslation = (
  translations: { languages: string[]; get: (key: string, fallback?: string) => string } | undefined,
  targetCode: string
): string => {
  if (!translations) return '';
  const candidates = [toSpeechTarget(targetCode), targetCode, toSpeechLocale(targetCode)];
  for (const key of candidates) {
    const value = translations.get(key, '')?.trim();
    if (value) return value;
  }
  const first = translations.languages[0];
  return first ? translations.get(first, '').trim() : '';
};

const playWavBuffer = (buffer: ArrayBuffer): Promise<void> => new Promise((resolve, reject) => {
  if (buffer.byteLength === 0) {
    resolve();
    return;
  }
  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  const audio = new Audio(url);
  audio.setAttribute('playsinline', '');
  const finish = (error?: unknown) => {
    URL.revokeObjectURL(url);
    if (error) reject(error instanceof Error ? error : new Error(String(error)));
    else resolve();
  };
  audio.onended = () => finish();
  audio.onerror = () => finish(new Error('Azure translated audio playback failed.'));
  void audio.play().catch(finish);
});

export class AzureSpeechLiveTranslationService implements LiveTranslationService {
  private callbacks: LiveSocketCallbacks;
  private generation = 0;
  private isStopping = false;
  private recognizer: {
    stopContinuousRecognitionAsync: (cb?: () => void, err?: (error: string) => void) => void;
    close: () => void;
  } | null = null;
  private sourceLanguageCode = '';
  private targetLanguageCode = '';
  private readonly turns: LiveStreamTurnAssembler;
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingAudio = false;
  private playbackGeneration = 0;
  private readonly mode: AzureSpeechLiveMode;

  constructor(mode: AzureSpeechLiveMode, callbacks: LiveSocketCallbacks = {}) {
    this.mode = mode;
    this.callbacks = callbacks;
    this.turns = new LiveStreamTurnAssembler((turn) => {
      this.callbacks.onTurnComplete?.({
        ...turn,
        sourceLanguageCode: this.sourceLanguageCode,
        targetLanguageCode: this.targetLanguageCode,
      });
      this.callbacks.onInputTranscript?.(this.turns.sourcePreview, Boolean(this.turns.sourcePreview));
      this.callbacks.onOutputTranscript?.(this.turns.outputPreview);
    });
  }

  public setCallbacks(callbacks: LiveSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async start(
    apiKey: string,
    sourceLanguageCode: string,
    targetLanguageCode: string,
    options: LiveStartOptions = {}
  ): Promise<void> {
    const cleanKey = apiKey.trim();
    const region = options.region?.trim().toLowerCase() ?? '';
    if (!cleanKey) throw new Error('An Azure Speech API key is required.');
    if (!region) throw new Error('An Azure Speech region is required.');
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture requires a supported browser and HTTPS.');
    }

    await this.stop();
    const generation = ++this.generation;
    this.isStopping = false;
    this.sourceLanguageCode = sourceLanguageCode;
    this.targetLanguageCode = targetLanguageCode;
    this.turns.reset();
    this.callbacks.onStatusChange?.('connecting');

    const sdk = await import('microsoft-cognitiveservices-speech-sdk');
    if (generation !== this.generation) throw new DOMException('Start cancelled', 'AbortError');

    const target = toSpeechTarget(targetLanguageCode);
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const translationConfig = this.mode === 'live-interpreter'
      ? sdk.SpeechTranslationConfig.fromEndpoint(
        new URL(
          options.resourceName?.trim()
            ? `https://${options.resourceName.trim()}.cognitiveservices.azure.com/stt/speech/universal/v2`
            : `wss://${region}.stt.speech.microsoft.com/speech/universal/v2`
        ),
        cleanKey
      )
      : sdk.SpeechTranslationConfig.fromSubscription(cleanKey, region);
    translationConfig.addTargetLanguage(target);

    let recognizer;
    if (this.mode === 'live-interpreter') {
      translationConfig.voiceName = 'personal-voice';
      const autoDetect = sdk.AutoDetectSourceLanguageConfig.fromOpenRange();
      recognizer = sdk.TranslationRecognizer.FromConfig(translationConfig, autoDetect, audioConfig);
    } else {
      translationConfig.speechRecognitionLanguage = toSpeechLocale(sourceLanguageCode);
      translationConfig.voiceName = TARGET_VOICES[targetLanguageCode] ?? TARGET_VOICES.en;
      recognizer = new sdk.TranslationRecognizer(translationConfig, audioConfig);
    }

    this.recognizer = recognizer;
    const ResultReason = sdk.ResultReason;
    const CancellationReason = sdk.CancellationReason;

    recognizer.recognizing = (_sender, event) => {
      if (generation !== this.generation || this.isStopping) return;
      const source = event.result.text?.trim() ?? '';
      const translated = pickTranslation(event.result.translations, targetLanguageCode);
      if (source) {
        this.turns.appendSource(source, 'snapshot');
        this.callbacks.onInputTranscript?.(this.turns.sourcePreview, true);
      }
      if (translated) {
        this.turns.appendOutput(translated, 'snapshot', false);
        this.callbacks.onOutputTranscript?.(this.turns.outputPreview);
      }
    };

    recognizer.recognized = (_sender, event) => {
      if (generation !== this.generation || this.isStopping) return;
      if (event.result.reason === ResultReason.TranslatedSpeech ||
        event.result.reason === ResultReason.RecognizedSpeech) {
        const source = event.result.text?.trim() ?? '';
        const translated = pickTranslation(event.result.translations, targetLanguageCode);
        if (source) this.turns.appendSource(source, 'snapshot');
        if (translated) this.turns.appendOutput(translated, 'snapshot');
        if (source) this.callbacks.onInputTranscript?.(this.turns.sourcePreview, false);
        if (translated) this.callbacks.onOutputTranscript?.(this.turns.outputPreview);
        this.turns.completeUtterance();
      }
    };

    recognizer.synthesizing = (_sender, event) => {
      if (generation !== this.generation || this.isStopping) return;
      const audio = event.result.audio;
      if (!audio || audio.byteLength === 0) return;
      this.turns.noteOutput();
      this.audioQueue.push(audio);
      void this.pumpAudio(generation);
    };

    recognizer.canceled = (_sender, event) => {
      if (generation !== this.generation) return;
      if (event.reason === CancellationReason.Error) {
        this.callbacks.onStatusChange?.('error');
        this.callbacks.onError?.(event.errorDetails || 'Azure Speech translation was canceled.');
      } else if (!this.isStopping) {
        this.callbacks.onStatusChange?.('disconnected');
      }
    };

    recognizer.sessionStarted = () => {
      if (generation !== this.generation || this.isStopping) return;
      this.callbacks.onStatusChange?.('connected');
    };

    await new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(
        () => resolve(),
        (error) => reject(new Error(String(error)))
      );
    });
    if (generation !== this.generation) {
      await this.stop();
      throw new DOMException('Start cancelled', 'AbortError');
    }
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.generation += 1;
    this.turns.flush();
    this.audioQueue = [];
    this.playbackGeneration += 1;
    const recognizer = this.recognizer;
    this.recognizer = null;
    if (recognizer) {
      await new Promise<void>((resolve) => {
        try {
          recognizer.stopContinuousRecognitionAsync(
            () => {
              try { recognizer.close(); } catch { /* already closed */ }
              resolve();
            },
            () => {
              try { recognizer.close(); } catch { /* already closed */ }
              resolve();
            }
          );
        } catch {
          try { recognizer.close(); } catch { /* already closed */ }
          resolve();
        }
      });
    }
    this.turns.reset();
    this.callbacks.onAudioPlayingState?.(false);
    this.callbacks.onStatusChange?.('disconnected');
  }

  public dispose(): void {
    void this.stop();
  }

  private async pumpAudio(generation: number): Promise<void> {
    if (this.isPlayingAudio) return;
    this.isPlayingAudio = true;
    this.callbacks.onAudioPlayingState?.(true);
    const playbackGeneration = this.playbackGeneration;
    try {
      while (
        this.audioQueue.length > 0 &&
        generation === this.generation &&
        playbackGeneration === this.playbackGeneration
      ) {
        const buffer = this.audioQueue.shift();
        if (!buffer) break;
        await playWavBuffer(buffer);
      }
    } catch (error) {
      if (generation === this.generation && !this.isStopping) {
        this.callbacks.onError?.(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (playbackGeneration === this.playbackGeneration) {
        this.isPlayingAudio = false;
        if (this.audioQueue.length === 0) this.callbacks.onAudioPlayingState?.(false);
        else void this.pumpAudio(generation);
      }
    }
  }

}
