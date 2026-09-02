/**
 * Gemini Live Translation WebSocket client.
 *
 * Input:  mono, little-endian PCM16 at 16 kHz
 * Output: mono, little-endian PCM16 at 24 kHz
 */

import type {
  LiveSocketCallbacks,
  LiveTranslationService,
  LiveTranslationTurn,
} from './liveTranslation';

export type {
  LiveSocketCallbacks,
  LiveStatus,
  LiveTranslationTurn,
} from './liveTranslation';

const LIVE_TRANSLATION_MODEL = 'models/gemini-3.5-live-translate-preview';
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const INPUT_CHUNK_SAMPLES = 1_600; // 100 ms, per the Live Translation guide
// About five 100ms JSON/base64 audio messages. Beyond this, stale audio hurts
// a translation experience more than dropping the congested interval.
const MAX_WEBSOCKET_BUFFER_BYTES = 20 * 1024;
const CONNECT_TIMEOUT_MS = 12_000;
const INPUT_TRANSCRIPT_GRACE_MS = 300;
const STOP_MINIMUM_DRAIN_MS = 400;
const STOP_DRAIN_TIMEOUT_MS = 3_000;

interface AudioContextConstructor {
  new (options?: AudioContextOptions): AudioContext;
}

interface LiveTranscription {
  text?: string;
  languageCode?: string;
}

interface LiveServerContent {
  modelTurn?: {
    parts?: Array<{
      text?: string;
      inlineData?: { data?: string; mimeType?: string };
    }>;
  };
  inputTranscription?: LiveTranscription;
  interimInputTranscription?: LiveTranscription;
  outputTranscription?: LiveTranscription;
  turnComplete?: boolean;
  generationComplete?: boolean;
  interrupted?: boolean;
}

interface LiveServerMessage {
  setupComplete?: Record<string, never>;
  serverContent?: LiveServerContent;
  goAway?: { timeLeft?: string };
  sessionResumptionUpdate?: { resumable?: boolean; newHandle?: string };
}

interface LiveSetupMessage {
  setup: {
    model: string;
    generationConfig: {
      responseModalities: ['AUDIO'];
      translationConfig: {
        targetLanguageCode: string;
        echoTargetLanguage: boolean;
      };
    };
    inputAudioTranscription: Record<string, never>;
    outputAudioTranscription: Record<string, never>;
    sessionResumption: { handle?: string };
    contextWindowCompression: { slidingWindow: Record<string, never> };
  };
}

/** Build the raw v1beta wire payload without mixing setup and generation fields. */
const buildLiveSetupMessage = (
  targetLanguageCode: string,
  resumeHandle: string | null
): LiveSetupMessage => ({
  setup: {
    model: LIVE_TRANSLATION_MODEL,
    generationConfig: {
      responseModalities: ['AUDIO'],
      translationConfig: {
        targetLanguageCode: toLiveLanguageCode(targetLanguageCode),
        echoTargetLanguage: false,
      },
    },
    // The raw WebSocket schema places transcription controls on setup itself.
    // Putting them in generationConfig closes the socket with code 1007.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
  },
});

interface PendingCompletedTurn extends LiveTranslationTurn {
  hasFinalInput: boolean;
  claimedInputStartedAt: number;
  timerId: number | null;
}

const getAudioContextConstructor = (): AudioContextConstructor => {
  const AudioCtx = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;

  if (!AudioCtx) {
    throw new Error('This browser does not support real-time audio processing.');
  }

  return AudioCtx;
};

/** Normalize app language codes to the BCP-47 values accepted by Live Translation. */
const toLiveLanguageCode = (languageCode: string): string => {
  if (languageCode === 'zh-TW' || languageCode.toLowerCase() === 'zh-hant') return 'zh-Hant';
  if (languageCode === 'zh-CN' || languageCode === 'zh' || languageCode.toLowerCase() === 'zh-hans') {
    return 'zh-Hans';
  }
  return languageCode.split('-')[0].toLowerCase();
};

/**
 * Transcription messages can be deltas or revised snapshots. Merge both forms
 * without duplicating the already displayed prefix.
 */
const mergeTranscript = (previous: string, incoming: string): string => {
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

const transcriptsLikelyMatch = (left: string, right: string): boolean => {
  const compact = (value: string) => value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '');
  const first = compact(left);
  const second = compact(right);
  if (!first || !second) return false;
  if (first.startsWith(second) || second.startsWith(first)) return true;

  const minLength = Math.min(first.length, second.length);
  let commonPrefix = 0;
  while (commonPrefix < minLength && first[commonPrefix] === second[commonPrefix]) {
    commonPrefix += 1;
  }
  return commonPrefix >= Math.max(3, Math.ceil(minLength * 0.6));
};

export class GeminiLiveSocketService implements LiveTranslationService {
  private ws: WebSocket | null = null;
  private inputContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private pendingInput = new Int16Array(0);
  private resampleCarry: number | null = null;
  private resamplePosition = 0;
  private resampleInputRate = 0;
  private workletFlushPromise: Promise<void> | null = null;
  private workletFlushResolve: (() => void) | null = null;
  private workletFlushTimer: number | null = null;

  private isConnected = false;
  private isSetupDone = false;
  private isRecording = false;
  private audioStreamEndSent = false;
  private intentionalClose = false;
  private connectionGeneration = 0;
  private openAttempt = 0;
  private startRequestSerial = 0;
  private pendingConnectionReject: ((error: Error) => void) | null = null;
  private sessionApiKey = '';
  private sessionSourceLanguageCode = '';
  private sessionTargetLanguageCode = '';
  private sessionResumptionHandle: string | null = null;
  private sessionCurrentlyResumable = false;
  private resumptionUpdateSerial = 0;
  private isReconnecting = false;
  private reconnectRequested = false;
  private goAwayReconnectTimer: number | null = null;
  private goAwayDeadlineAt = 0;

  private isStopping = false;
  private stopDrainArmed = false;
  private stopArmedCompletionSerial = 0;
  private stopNeedsNewCompletion = true;
  private stopMinimumDrainElapsed = false;
  private drainCompletionSeen = false;
  private completionSerial = 0;
  private terminalTurnCompleteDebt = 0;
  private stopMinimumDrainTimer: number | null = null;
  private stopDrainTimer: number | null = null;
  private stopPromise: Promise<void> | null = null;
  private resolveStop: (() => void) | null = null;

  private nextPlayTime = 0;
  private playbackSources = new Set<AudioBufferSourceNode>();

  private currentInputText = '';
  private currentInterimInput = '';
  private currentOutputText = '';
  private deferredInputText = '';
  private deferredInputIsFinal = false;
  private deferredInputAt = 0;
  private turnInputAt = 0;
  private firstOutputAt = 0;
  private lastPotentialSpeechAt = 0;
  private lastServerCompletionAt = 0;
  // Local VAD can run ahead of independently delivered transcriptions. A
  // terminal event must never consume this marker: only a transcript routed to
  // the active turn can attribute it. Stop's hard deadline is the final guard.
  private unattributedSpeechStartedAt = 0;
  private pendingCompletedTurn: PendingCompletedTurn | null = null;
  // Input transcription has no turn id and may arrive independently of output
  // completion. Once a completed turn is missing its final input, keep a
  // routing tombstone. If new speech overlaps that uncertainty, drop all input
  // text until a fresh (non-resumed) session creates an unambiguous boundary.
  private orphanInputAwaitingFinal = false;
  private dropInputUntilFreshSession = false;
  private freshSessionRequested = false;

  private callbacks: LiveSocketCallbacks;

  constructor(callbacks: LiveSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: LiveSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getIsActive(): boolean {
    return this.isConnected && this.isSetupDone && this.isRecording;
  }

  /** Start one low-latency speech-to-speech translation session. */
  public async start(
    apiKey: string,
    sourceLanguageCode: string,
    targetLanguageCode: string
  ): Promise<void> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      throw new Error('A Gemini API key is required. Add one in Settings.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone input is unavailable. Make sure this page is using HTTPS.');
    }

    const startRequest = ++this.startRequestSerial;
    if (this.stopPromise) await this.stopPromise;
    if (startRequest !== this.startRequestSerial) {
      throw new DOMException('Live connection start was superseded', 'AbortError');
    }
    const attempt = ++this.openAttempt;
    this.sessionApiKey = cleanKey;
    this.sessionSourceLanguageCode = sourceLanguageCode;
    this.sessionTargetLanguageCode = targetLanguageCode;
    this.sessionResumptionHandle = null;
    this.isReconnecting = false;
    try {
      await this.openSession(cleanKey, targetLanguageCode, null);
    } catch (error) {
      if (attempt === this.openAttempt) this.cleanup(false);
      throw error;
    }
  }

  private async openSession(
    cleanKey: string,
    targetLanguageCode: string,
    resumeHandle: string | null,
    preserveTurn = false,
    preservePlayback = preserveTurn
  ): Promise<void> {

    this.cleanup(false, true, preserveTurn, preservePlayback);
    this.sessionCurrentlyResumable = false;
    this.intentionalClose = false;
    const generation = ++this.connectionGeneration;
    this.callbacks.onStatusChange?.('connecting');

    try {
      const AudioCtx = getAudioContextConstructor();

      // Create/resume playback while the start button's user activation is fresh.
      const reusablePlaybackContext = this.playbackContext?.state !== 'closed'
        ? this.playbackContext
        : null;
      let playbackContext = reusablePlaybackContext;
      if (!playbackContext) {
        try {
          playbackContext = new AudioCtx({ sampleRate: OUTPUT_SAMPLE_RATE });
        } catch {
          // Safari and some embedded browsers reject an explicit output rate;
          // their AudioContext transparently resamples the 24 kHz PCM buffer.
          playbackContext = new AudioCtx();
        }
      }
      this.playbackContext = playbackContext;
      if (playbackContext.state === 'suspended') {
        await playbackContext.resume();
      }
      if (generation !== this.connectionGeneration) {
        if (playbackContext.state !== 'closed') void playbackContext.close();
        throw new DOMException('Live connection was stopped', 'AbortError');
      }
      // A resumed socket may share an AudioContext with PCM buffers that are
      // already scheduled. Preserve their queue position so resumed chunks do
      // not overlap audio that is still playing.
      this.nextPlayTime = reusablePlaybackContext
        ? Math.max(this.nextPlayTime, playbackContext.currentTime)
        : playbackContext.currentTime;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== this.connectionGeneration) {
        for (const track of mediaStream.getTracks()) track.stop();
        throw new DOMException('Live connection was stopped', 'AbortError');
      }
      this.mediaStream = mediaStream;

      const endpoint =
        'wss://generativelanguage.googleapis.com/ws/' +
        'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
      const ws = new WebSocket(`${endpoint}?key=${encodeURIComponent(cleanKey)}`);
      this.ws = ws;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settleResolve = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          if (this.pendingConnectionReject === settleReject) this.pendingConnectionReject = null;
          resolve();
        };
        const settleReject = (error: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          if (this.pendingConnectionReject === settleReject) this.pendingConnectionReject = null;
          reject(error);
        };
        this.pendingConnectionReject = settleReject;

        const timeoutId = window.setTimeout(() => {
          settleReject(new Error('Gemini Live timed out. Check your network connection and API key.'));
          this.cleanup(false, true, preserveTurn, preservePlayback);
        }, CONNECT_TIMEOUT_MS);

        ws.onopen = () => {
          if (generation !== this.connectionGeneration) return;
          this.isConnected = true;

          ws.send(JSON.stringify(buildLiveSetupMessage(targetLanguageCode, resumeHandle)));
        };

        ws.onmessage = async (event: MessageEvent) => {
          if (generation !== this.connectionGeneration) return;
          try {
            const raw = typeof event.data === 'string'
              ? event.data
              : event.data instanceof Blob
                ? await event.data.text()
                : '';
            if (!raw || generation !== this.connectionGeneration) return;

            const message = JSON.parse(raw) as LiveServerMessage;
            const resumptionUpdate = message.sessionResumptionUpdate;
            if (resumptionUpdate) {
              this.resumptionUpdateSerial += 1;
              this.sessionCurrentlyResumable = Boolean(resumptionUpdate.resumable);
              if (resumptionUpdate.resumable && resumptionUpdate.newHandle) {
                this.sessionResumptionHandle = resumptionUpdate.newHandle;
              }
            }
            if (message.setupComplete) {
              this.isSetupDone = true;
              await this.startMicStreaming(generation);
              if (generation !== this.connectionGeneration || !this.getIsActive()) return;
              this.callbacks.onStatusChange?.('connected');
              settleResolve();
              return;
            }

            if (message.goAway) {
              this.reconnectRequested = true;
              this.scheduleGoAwayReconnect(message.goAway.timeLeft);
            }
            this.handleServerMessage(message);
            if (generation === this.connectionGeneration) this.maybeFinishLifecycle();
          } catch (error) {
            if (generation !== this.connectionGeneration || this.intentionalClose) return;
            console.warn('[GeminiLiveSocket] Message handling error:', error);
            if (!settled) {
              const connectionError = error instanceof Error ? error : new Error(String(error));
              settleReject(connectionError);
            }
          }
        };

        ws.onerror = () => {
          if (generation !== this.connectionGeneration || this.intentionalClose) return;
          // The following close event carries the API close code and reason.
          // Keep the promise pending so that diagnostic detail is not replaced
          // by the browser's generic WebSocket error event.
          if (this.sessionResumptionHandle) return;
          this.callbacks.onStatusChange?.('error');
        };

        ws.onclose = (event) => {
          if (generation !== this.connectionGeneration) return;
          const wasIntentional = this.intentionalClose;
          this.isConnected = false;
          this.isSetupDone = false;
          this.isRecording = false;
          this.stopInputCapture();

          if (this.isStopping) {
            this.callbacks.onStatusChange?.('disconnected');
            this.flushCurrentTurnImmediately(false);
            this.cleanup(false);
            return;
          }
          const canResume = !wasIntentional && !this.isStopping && Boolean(
            this.sessionApiKey &&
            this.sessionTargetLanguageCode &&
            this.sessionResumptionHandle &&
            this.sessionCurrentlyResumable &&
            this.terminalTurnCompleteDebt === 0
          );
          if (canResume) {
            this.reconnectRequested = false;
            this.cleanup(false, true, true, true);
            this.reconnectRequested = true;
            this.reconnectSession();
          } else if (!wasIntentional) {
            this.callbacks.onStatusChange?.('disconnected');
            const suffix = event.reason ? `: ${event.reason}` : ` (code ${event.code})`;
            const error = new Error(`Gemini Live disconnected${suffix}`);
            this.callbacks.onError?.(error.message);
            settleReject(error);
          } else if (!settled) {
            this.callbacks.onStatusChange?.('disconnected');
            settleReject(new Error('Gemini Live disconnected before setup completed.'));
          } else {
            this.callbacks.onStatusChange?.('disconnected');
          }
          if (!canResume) {
            this.flushCurrentTurnImmediately(false);
            this.cleanup(false);
          }
        };
      });
    } catch (error) {
      if (generation === this.connectionGeneration) {
        this.cleanup(false, true, preserveTurn, preservePlayback);
        this.callbacks.onStatusChange?.('error');
      }
      throw error;
    }
  }

  /** Capture microphone audio and send exact 100 ms PCM16 chunks. */
  private async startMicStreaming(generation: number): Promise<void> {
    const mediaStream = this.mediaStream;
    const socket = this.ws;
    if (!mediaStream || !socket || socket.readyState !== WebSocket.OPEN) return;

    const AudioCtx = getAudioContextConstructor();
    let inputContext: AudioContext;
    try {
      inputContext = new AudioCtx({ sampleRate: INPUT_SAMPLE_RATE });
    } catch {
      inputContext = new AudioCtx();
    }

    const ownsConnection = () =>
      generation === this.connectionGeneration &&
      this.mediaStream === mediaStream &&
      this.ws === socket &&
      this.isConnected &&
      this.isSetupDone;
    const abortStaleSetup = () => {
      if (inputContext.state !== 'closed') void inputContext.close();
      throw new DOMException('Live microphone setup was superseded', 'AbortError');
    };

    if (inputContext.state === 'suspended') {
      try {
        await inputContext.resume();
      } catch (error) {
        void inputContext.close().catch(() => {});
        throw error;
      }
    }
    if (!ownsConnection()) abortStaleSetup();

    const inputSource = inputContext.createMediaStreamSource(mediaStream);
    const silentGain = inputContext.createGain();
    silentGain.gain.value = 0;
    let workletNode: AudioWorkletNode | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;

    const disposeLocalNodes = () => {
      if (workletNode) {
        workletNode.port.onmessage = null;
        workletNode.port.close();
        try { workletNode.disconnect(); } catch {}
      }
      if (scriptProcessor) {
        scriptProcessor.onaudioprocess = null;
        try { scriptProcessor.disconnect(); } catch {}
      }
      try { inputSource.disconnect(); } catch {}
      try { silentGain.disconnect(); } catch {}
      if (inputContext.state !== 'closed') void inputContext.close();
    };

    const consumeSamples = (channel: Float32Array) => {
      if (!ownsConnection() || socket.readyState !== WebSocket.OPEN) return;
      if (socket.bufferedAmount > MAX_WEBSOCKET_BUFFER_BYTES) {
        this.pendingInput = new Int16Array(0);
        this.resetResampler();
        return;
      }
      let energy = 0;
      for (let index = 0; index < channel.length; index += 1) {
        energy += channel[index] * channel[index];
      }
      const rms = Math.sqrt(energy / Math.max(1, channel.length));
      // Keep the normal VAD conservative, but remember quieter speech so Stop
      // does not close the socket after only the minimum 400 ms drain.
      if (rms >= 0.004) this.lastPotentialSpeechAt = performance.now();
      if (rms >= 0.012) this.markLocalSpeech();
      const resampled = this.resample(channel, inputContext.sampleRate);
      this.appendInput(this.floatTo16BitPCM(resampled));
    };

    try {
      await inputContext.audioWorklet.addModule('/audio-capture-worklet.js');
      if (!ownsConnection()) abortStaleSetup();
      workletNode = new AudioWorkletNode(
        inputContext,
        'likeparrot-audio-capture',
        { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }
      );
      workletNode.port.onmessage = (event: MessageEvent<
        ArrayBuffer | { type?: string; data?: ArrayBuffer }
      >) => {
        if (event.data instanceof ArrayBuffer) {
          consumeSamples(new Float32Array(event.data));
          return;
        }
        if (event.data?.type === 'flushed') {
          if (event.data.data?.byteLength) consumeSamples(new Float32Array(event.data.data));
          this.resolveWorkletFlush();
        }
      };
    } catch (error) {
      if (!ownsConnection()) {
        disposeLocalNodes();
        throw new DOMException('Live microphone setup was superseded', 'AbortError');
      }
      console.warn('[GeminiLiveSocket] AudioWorklet unavailable, using fallback:', error);
      if (workletNode) {
        workletNode.port.onmessage = null;
        workletNode.port.close();
        workletNode.disconnect();
        workletNode = null;
      }
      scriptProcessor = inputContext.createScriptProcessor(2048, 1, 1);
      scriptProcessor.onaudioprocess = (event) => {
        consumeSamples(event.inputBuffer.getChannelData(0));
      };
    }

    if (!ownsConnection()) {
      disposeLocalNodes();
      throw new DOMException('Live microphone setup was superseded', 'AbortError');
    }
    this.pendingInput = new Int16Array(0);
    this.resetResampler();
    this.inputContext = inputContext;
    this.inputSource = inputSource;
    this.silentGain = silentGain;
    this.audioWorkletNode = workletNode;
    this.scriptProcessor = scriptProcessor;

    if (workletNode) {
      inputSource.connect(workletNode);
      workletNode.connect(silentGain);
    } else if (scriptProcessor) {
      inputSource.connect(scriptProcessor);
      scriptProcessor.connect(silentGain);
    }
    silentGain.connect(inputContext.destination);
    this.isRecording = true;
  }

  private appendInput(chunk: Int16Array): void {
    if (chunk.length === 0) return;

    const combined = new Int16Array(this.pendingInput.length + chunk.length);
    combined.set(this.pendingInput);
    combined.set(chunk, this.pendingInput.length);
    this.pendingInput = combined;

    while (this.pendingInput.length >= INPUT_CHUNK_SAMPLES) {
      this.sendAudioChunk(this.pendingInput.slice(0, INPUT_CHUNK_SAMPLES));
      this.pendingInput = this.pendingInput.slice(INPUT_CHUNK_SAMPLES);
    }
  }

  private sendAudioChunk(pcm: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupDone) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: this.arrayBufferToBase64(pcm.buffer),
            mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
          },
        },
      })
    );
  }

  private sendAudioStreamEnd(): void {
    if (
      this.audioStreamEndSent ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.isSetupDone
    ) return;
    try {
      this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      this.audioStreamEndSent = true;
    } catch {}
  }

  private handleServerMessage(message: LiveServerMessage): void {
    const content = message.serverContent;
    if (!content) return;

    const outputTranscript = content.outputTranscription?.text;
    const hasOutputPart = Boolean(
      outputTranscript?.trim() ||
      content.modelTurn?.parts?.some((part) => part.text?.trim() || part.inlineData?.data)
    );
    const generationEnded = Boolean(content.interrupted || content.generationComplete);
    const debtlessTurnComplete = Boolean(
      content.turnComplete && !generationEnded && this.terminalTurnCompleteDebt === 0
    );
    if (
      this.hasUnresolvedCompletedInput() &&
      (hasOutputPart || generationEnded || debtlessTurnComplete)
    ) {
      // This message proves that a new turn has begun before the prior turn's
      // input could be attributed. Enter the barrier before routing any input
      // carried by the same message.
      this.enterAmbiguousInputBarrier();
    }

    const interimInput = content.interimInputTranscription?.text;
    if (interimInput?.trim()) this.routeInputTranscription(interimInput, false);

    const finalInput = content.inputTranscription?.text;
    if (finalInput?.trim()) this.routeInputTranscription(finalInput, true);

    if (outputTranscript?.trim()) {
      this.markFirstOutput();
      this.currentOutputText = mergeTranscript(this.currentOutputText, outputTranscript);
      this.callbacks.onOutputTranscript?.(this.currentOutputText);
    }

    for (const part of content.modelTurn?.parts ?? []) {
      if (part.text && !outputTranscript) {
        this.markFirstOutput();
        this.currentOutputText = mergeTranscript(this.currentOutputText, part.text);
        this.callbacks.onOutputTranscript?.(this.currentOutputText);
      }
      if (part.inlineData?.data) {
        this.markFirstOutput();
        if (!this.isStopping) this.playAudioChunk(part.inlineData.data);
      }
    }

    if (generationEnded) {
      this.lastServerCompletionAt = performance.now();
      if (content.interrupted) this.clearPlaybackQueue();
      this.terminalTurnCompleteDebt += 1;
      this.completionSerial += 1;
      this.drainCompletionSeen = true;
      this.freezeCurrentTurn(false);
      if (this.dropInputUntilFreshSession && !this.hasActiveTurnData()) {
        // A target-language echo can end without output. This terminal belongs
        // to the new ambiguous turn, so consume its local marker and allow the
        // pending fresh-session boundary to proceed after turnComplete.
        this.unattributedSpeechStartedAt = 0;
        this.turnInputAt = 0;
      }
      this.maybeFinishLifecycle();
    }
    if (content.turnComplete) {
      this.lastServerCompletionAt = performance.now();
      this.drainCompletionSeen = true;
      if (this.terminalTurnCompleteDebt > 0) {
        this.terminalTurnCompleteDebt -= 1;
      } else {
        this.completionSerial += 1;
        if (!this.pendingCompletedTurn && this.hasActiveTurnData()) {
          this.freezeCurrentTurn(false);
        }
        if (this.dropInputUntilFreshSession && !this.hasActiveTurnData()) {
          this.unattributedSpeechStartedAt = 0;
          this.turnInputAt = 0;
        }
      }
      this.maybeFinishLifecycle();
    }
  }

  private routeInputTranscription(incoming: string, isFinal: boolean): void {
    const text = incoming.trim();
    if (!text) return;
    if (this.dropInputUntilFreshSession || this.orphanInputAwaitingFinal) return;

    const pending = this.pendingCompletedTurn;
    const activeReference = mergeTranscript(this.currentInputText, this.currentInterimInput);
    const deferredReference = this.deferredInputText;
    const matchesActive = Boolean(
      activeReference && transcriptsLikelyMatch(activeReference, text)
    );
    const matchesPending = Boolean(
      pending?.sourceText && transcriptsLikelyMatch(pending.sourceText, text)
    );
    const matchesDeferred = Boolean(
      deferredReference && transcriptsLikelyMatch(deferredReference, text)
    );

    // An already-separated next-input slot has priority unless this message is
    // an unambiguous late revision of the active or just-completed turn.
    if (deferredReference) {
      if (matchesPending && !matchesActive && !matchesDeferred && pending) {
        this.attachPendingInput(pending, text, isFinal);
      } else if (matchesActive && !matchesPending && !matchesDeferred) {
        this.attachActiveInput(text, isFinal, false);
      } else if (!(matchesActive && matchesDeferred) && !(matchesPending && matchesDeferred)) {
        this.deferInput(text, isFinal);
      }
      return;
    }

    if (pending) {
      if (!pending.sourceText && pending.claimedInputStartedAt) {
        // New local speech after an output-only turn makes this transcript
        // fundamentally ambiguous: it can be late input for the completed turn
        // or first input for the next one. With no protocol turn id, dropping
        // the source fragment is safer than merging two saved cards.
        if (!this.unattributedSpeechStartedAt) {
          this.attachPendingInput(pending, text, isFinal);
        }
        return;
      }
      if (matchesPending && !matchesActive) {
        this.attachPendingInput(pending, text, isFinal);
      } else if (matchesActive && !matchesPending) {
        this.attachActiveInput(text, isFinal, false);
      } else if (!matchesActive && !matchesPending) {
        if (this.unattributedSpeechStartedAt) {
          // Final-only next turns are valid. Keep them out of the prior card,
          // then promote after the completed turn's short transcript grace.
          this.deferInput(text, isFinal);
        } else if (!activeReference && !pending.hasFinalInput) {
          this.attachPendingInput(pending, text, isFinal);
        }
      }
      return;
    }

    if (activeReference || this.currentOutputText) {
      if (matchesActive || !this.unattributedSpeechStartedAt) {
        this.attachActiveInput(text, isFinal, false);
      } else if (activeReference) {
        // Local VAD saw new speech while an older turn still owns the active
        // buffers. Preserve this transcript in a separate slot.
        this.deferInput(text, isFinal);
      }
      return;
    }

    this.attachActiveInput(text, isFinal, true);
  }

  private enterAmbiguousInputBarrier(): void {
    this.dropInputUntilFreshSession = true;
    this.freshSessionRequested = true;
    this.currentInputText = '';
    this.currentInterimInput = '';
    this.deferredInputText = '';
    this.deferredInputIsFinal = false;
    this.deferredInputAt = 0;
    this.callbacks.onInputTranscript?.('', false);
  }

  private hasUnresolvedCompletedInput(): boolean {
    return this.orphanInputAwaitingFinal || Boolean(
      this.pendingCompletedTurn && !this.pendingCompletedTurn.hasFinalInput
    );
  }

  private attachPendingInput(
    pending: PendingCompletedTurn,
    text: string,
    isFinal: boolean
  ): void {
    pending.sourceText = mergeTranscript(pending.sourceText, text);
    if (isFinal) pending.hasFinalInput = true;
  }

  private attachActiveInput(text: string, isFinal: boolean, bindsLocalSpeech: boolean): void {
    this.markActiveTranscript(bindsLocalSpeech);
    if (isFinal) {
      this.currentInputText = mergeTranscript(this.currentInputText, text);
      this.currentInterimInput = '';
      this.callbacks.onInputTranscript?.(this.currentInputText, false);
      return;
    }
    this.currentInterimInput = text;
    this.callbacks.onInputTranscript?.(
      mergeTranscript(this.currentInputText, this.currentInterimInput),
      true
    );
  }

  private deferInput(text: string, isFinal: boolean): void {
    if (!this.deferredInputAt) {
      this.deferredInputAt = this.unattributedSpeechStartedAt || performance.now();
    }
    this.deferredInputText = mergeTranscript(this.deferredInputText, text);
    this.deferredInputIsFinal ||= isFinal;
  }

  private promoteDeferredInput(): void {
    if (!this.deferredInputText || this.currentInputText || this.currentInterimInput) return;
    const text = this.deferredInputText;
    const isFinal = this.deferredInputIsFinal;
    const startedAt = this.deferredInputAt || this.unattributedSpeechStartedAt;
    this.deferredInputText = '';
    this.deferredInputIsFinal = false;
    this.deferredInputAt = 0;
    this.unattributedSpeechStartedAt = 0;
    if (!this.turnInputAt) this.turnInputAt = startedAt || performance.now();
    this.attachActiveInput(text, isFinal, false);
  }

  private markLocalSpeech(): void {
    const now = performance.now();
    if (!this.unattributedSpeechStartedAt) {
      this.unattributedSpeechStartedAt = now;
    }
    if (this.hasUnresolvedCompletedInput()) this.enterAmbiguousInputBarrier();
    if (!this.turnInputAt) this.turnInputAt = now;
    if (!this.isStopping) this.drainCompletionSeen = false;
  }

  private markActiveTranscript(bindLocalSpeech: boolean): void {
    const locallyObservedAt = this.unattributedSpeechStartedAt;
    if (bindLocalSpeech) this.unattributedSpeechStartedAt = 0;
    if (!this.isStopping) this.drainCompletionSeen = false;
    if (!this.turnInputAt) {
      this.turnInputAt = bindLocalSpeech && locallyObservedAt
        ? locallyObservedAt
        : performance.now();
    }
  }

  private markFirstOutput(): void {
    if (!this.firstOutputAt) this.firstOutputAt = performance.now();
  }

  private hasActiveTurnData(): boolean {
    return Boolean(this.currentInputText || this.currentInterimInput || this.currentOutputText);
  }

  private hasTurnData(): boolean {
    return this.hasActiveTurnData() ||
      Boolean(this.pendingCompletedTurn) ||
      Boolean(this.unattributedSpeechStartedAt) ||
      Boolean(this.deferredInputText);
  }

  private freezeCurrentTurn(runLifecycle = true): void {
    if (!this.hasActiveTurnData()) {
      if (runLifecycle) this.maybeFinishLifecycle();
      return;
    }
    if (this.pendingCompletedTurn) this.flushPendingCompletedTurn(false);

    const sourceText = (this.currentInputText || this.currentInterimInput).trim();
    const translatedText = this.currentOutputText.trim();
    const latencyMs = this.turnInputAt && this.firstOutputAt
      ? Math.max(0, Math.round(this.firstOutputAt - this.turnInputAt))
      : 0;
    // If output completed before its independent input transcription arrived,
    // the pending turn claims the local speech marker. A marker left after a
    // sourced turn instead belongs to possible follow-up speech.
    const claimedInputStartedAt = !sourceText && !this.deferredInputText
      ? this.unattributedSpeechStartedAt
      : 0;
    if (claimedInputStartedAt) this.unattributedSpeechStartedAt = 0;

    this.pendingCompletedTurn = {
      sourceText,
      translatedText,
      sourceLanguageCode: this.sessionSourceLanguageCode,
      targetLanguageCode: this.sessionTargetLanguageCode,
      latencyMs,
      hasFinalInput: Boolean(this.currentInputText),
      claimedInputStartedAt,
      timerId: null,
    };

    this.currentInputText = '';
    this.currentInterimInput = '';
    this.currentOutputText = '';
    this.turnInputAt = this.unattributedSpeechStartedAt;
    this.firstOutputAt = 0;
    if (!this.pendingCompletedTurn.hasFinalInput && this.unattributedSpeechStartedAt) {
      this.enterAmbiguousInputBarrier();
    }
    this.callbacks.onInputTranscript?.('', false);
    this.callbacks.onOutputTranscript?.('');

    this.pendingCompletedTurn.timerId = window.setTimeout(
      () => this.flushPendingCompletedTurn(),
      INPUT_TRANSCRIPT_GRACE_MS
    );
  }

  private flushPendingCompletedTurn(runLifecycle = true): void {
    const pending = this.pendingCompletedTurn;
    if (!pending) {
      if (runLifecycle) this.maybeFinishLifecycle();
      return;
    }
    this.pendingCompletedTurn = null;
    if (pending.timerId !== null) window.clearTimeout(pending.timerId);

    if (!pending.hasFinalInput) {
      this.orphanInputAwaitingFinal = true;
      this.freshSessionRequested = true;
      if (
        this.unattributedSpeechStartedAt ||
        this.deferredInputText ||
        this.currentInputText ||
        this.currentInterimInput ||
        this.currentOutputText
      ) {
        this.enterAmbiguousInputBarrier();
      }
    }
    if (pending.sourceText || pending.translatedText) {
      this.callbacks.onTurnComplete?.({
        sourceText: pending.sourceText,
        translatedText: pending.translatedText,
        sourceLanguageCode: pending.sourceLanguageCode,
        targetLanguageCode: pending.targetLanguageCode,
        latencyMs: pending.latencyMs,
      });
    }
    this.promoteDeferredInput();
    if (runLifecycle) this.maybeFinishLifecycle();
  }

  private flushCurrentTurnImmediately(runLifecycle = true): void {
    if (this.hasActiveTurnData()) this.freezeCurrentTurn(false);
    this.flushPendingCompletedTurn(false);
    this.promoteDeferredInput();
    if (this.hasActiveTurnData()) this.freezeCurrentTurn(false);
    this.flushPendingCompletedTurn(runLifecycle);
  }

  private maybeFinishLifecycle(): void {
    if (this.hasTurnData()) return;
    if (
      this.isStopping &&
      this.stopDrainArmed &&
      this.drainCompletionSeen &&
      (this.stopNeedsNewCompletion
        ? this.completionSerial > this.stopArmedCompletionSerial
        : this.stopMinimumDrainElapsed)
    ) {
      this.cleanup(true);
      return;
    }
    if (
      this.freshSessionRequested &&
      !this.intentionalClose &&
      !this.isStopping &&
      !this.hasTurnData() &&
      this.terminalTurnCompleteDebt === 0
    ) {
      this.reconnectFreshSession();
      return;
    }
    if (
      this.reconnectRequested &&
      !this.hasTurnData() &&
      this.playbackSources.size === 0 &&
      this.terminalTurnCompleteDebt === 0 &&
      this.sessionCurrentlyResumable
    ) this.reconnectSession();
  }

  private scheduleGoAwayReconnect(timeLeft?: string): void {
    if (this.goAwayReconnectTimer !== null) {
      window.clearTimeout(this.goAwayReconnectTimer);
      this.goAwayReconnectTimer = null;
    }
    this.goAwayDeadlineAt = 0;
    if (!timeLeft) return;
    const match = /^(\d+(?:\.\d+)?)s$/u.exec(timeLeft.trim());
    if (!match) return;
    const timeLeftMs = Number(match[1]) * 1_000;
    this.goAwayDeadlineAt = performance.now() + timeLeftMs;
    const delayMs = Math.max(0, timeLeftMs - 750);
    this.goAwayReconnectTimer = window.setTimeout(() => {
      this.goAwayReconnectTimer = null;
      void this.handleGoAwayDeadline();
    }, delayMs);
  }

  private async handleGoAwayDeadline(): Promise<void> {
    if (!this.reconnectRequested || this.intentionalClose || this.isStopping) return;
    const generation = this.connectionGeneration;
    const resumptionSerialBeforeDrain = this.resumptionUpdateSerial;
    await this.flushWorkletInput();
    if (
      generation !== this.connectionGeneration ||
      !this.reconnectRequested ||
      this.intentionalClose ||
      this.isStopping
    ) return;

    this.isRecording = false;
    this.stopInputCapture();
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
    if (this.pendingInput.length > 0) {
      this.sendAudioChunk(this.pendingInput);
      this.pendingInput = new Int16Array(0);
    }
    if (this.ws?.readyState === WebSocket.OPEN && this.isSetupDone) {
      // Any prior handle predates the just-flushed tail. Wait for a fresh safe
      // update instead of assuming that old handle acknowledges these bytes.
      this.sessionCurrentlyResumable = false;
      this.sendAudioStreamEnd();
    }

    const hasFreshSafeHandle = await this.waitForFreshResumptionHandle(
      generation,
      resumptionSerialBeforeDrain
    );
    if (
      generation !== this.connectionGeneration ||
      !this.reconnectRequested ||
      this.intentionalClose ||
      this.isStopping
    ) return;
    if (hasFreshSafeHandle) {
      this.reconnectSession();
      return;
    }

    // The server did not provide a handle that safely includes the in-flight
    // generation. End this socket before its deadline; onclose records the
    // partial buffers and reports a reconnectable error instead of using a
    // stale handle and silently losing content.
    try {
      this.ws?.close(4001, 'goAway without safe resumption handle');
    } catch {}
  }

  private async waitForFreshResumptionHandle(
    generation: number,
    previousSerial: number
  ): Promise<boolean> {
    while (
      generation === this.connectionGeneration &&
      this.reconnectRequested &&
      !this.intentionalClose &&
      !this.isStopping
    ) {
      if (
        this.resumptionUpdateSerial > previousSerial &&
        this.sessionCurrentlyResumable &&
        this.sessionResumptionHandle &&
        this.terminalTurnCompleteDebt === 0
      ) return true;

      const remainingMs = this.goAwayDeadlineAt - performance.now() - 100;
      if (remainingMs <= 0) return false;
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, Math.min(25, remainingMs));
      });
    }
    return false;
  }

  private playAudioChunk(base64Pcm: string): void {
    const context = this.playbackContext;
    if (!context || context.state === 'closed') return;

    try {
      if (context.state === 'suspended') void context.resume();
      const bytes = this.base64ToUint8Array(base64Pcm);
      const sampleCount = Math.floor(bytes.byteLength / 2);
      const samples = new Float32Array(sampleCount);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = view.getInt16(index * 2, true) / 32_768;
      }

      const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      this.playbackSources.add(source);

      const now = context.currentTime;
      if (this.nextPlayTime < now) this.nextPlayTime = now + 0.015;
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
      this.callbacks.onAudioPlayingState?.(true);

      source.onended = () => {
        this.playbackSources.delete(source);
        source.disconnect();
        if (this.playbackSources.size === 0) {
          this.callbacks.onAudioPlayingState?.(false);
          this.maybeFinishLifecycle();
        }
      };
    } catch (error) {
      console.warn('[GeminiLiveSocket] Audio playback error:', error);
    }
  }

  private clearPlaybackQueue(): void {
    for (const source of this.playbackSources) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.playbackSources.clear();
    if (this.playbackContext?.state !== 'closed') {
      this.nextPlayTime = this.playbackContext?.currentTime ?? 0;
    }
    this.callbacks.onAudioPlayingState?.(false);
  }

  /** Stop the microphone immediately, then drain the final server turn(s). */
  public stop(): Promise<void> {
    this.startRequestSerial += 1;
    this.openAttempt += 1;
    if (this.stopPromise) return this.stopPromise;
    this.intentionalClose = true;
    this.reconnectRequested = false;

    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.isSetupDone
    ) {
      this.flushCurrentTurnImmediately();
      this.cleanup(true);
      return Promise.resolve();
    }

    this.isStopping = true;
    this.stopDrainArmed = false;
    this.stopArmedCompletionSerial = this.completionSerial;
    this.stopMinimumDrainElapsed = false;
    this.drainCompletionSeen = false;
    this.isRecording = false;
    this.clearPlaybackQueue();
    this.stopPromise = new Promise<void>((resolve) => {
      this.resolveStop = resolve;
    });
    void this.beginStopDrain();
    return this.stopPromise;
  }

  /** Immediate teardown for component disposal; no final network turn is awaited. */
  public dispose(): void {
    this.startRequestSerial += 1;
    this.openAttempt += 1;
    this.intentionalClose = true;
    this.reconnectRequested = false;
    this.cleanup(false);
  }

  private async beginStopDrain(): Promise<void> {
    await this.flushWorkletInput();
    if (!this.isStopping) return;
    this.stopInputCapture();

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }

    if (this.pendingInput.length > 0) {
      this.sendAudioChunk(this.pendingInput);
      this.pendingInput = new Int16Array(0);
    }
    this.sendAudioStreamEnd();
    this.stopArmedCompletionSerial = this.completionSerial;
    this.stopNeedsNewCompletion = Boolean(
      this.hasActiveTurnData() ||
      this.unattributedSpeechStartedAt ||
      this.deferredInputText ||
      this.lastPotentialSpeechAt > this.lastServerCompletionAt
    );
    this.stopDrainArmed = true;
    if (!this.stopNeedsNewCompletion) {
      this.stopMinimumDrainTimer = window.setTimeout(() => {
        this.stopMinimumDrainTimer = null;
        if (!this.isStopping) return;
        this.stopMinimumDrainElapsed = true;
        this.drainCompletionSeen = true;
        this.maybeFinishLifecycle();
      }, STOP_MINIMUM_DRAIN_MS);
    }

    this.stopDrainTimer = window.setTimeout(() => {
      this.stopDrainTimer = null;
      if (!this.isStopping) return;
      this.drainCompletionSeen = true;
      this.flushCurrentTurnImmediately(false);
      this.unattributedSpeechStartedAt = 0;
      this.turnInputAt = 0;
      if (this.isStopping) this.cleanup(true);
    }, STOP_DRAIN_TIMEOUT_MS);

    this.maybeFinishLifecycle();
  }

  private flushWorkletInput(): Promise<void> {
    if (this.workletFlushPromise) return this.workletFlushPromise;
    const node = this.audioWorkletNode;
    if (!node) return Promise.resolve();
    this.inputSource?.disconnect();
    this.inputSource = null;

    let resolvePromise: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    this.workletFlushPromise = promise;
    this.workletFlushResolve = resolvePromise;
    this.workletFlushTimer = window.setTimeout(() => this.resolveWorkletFlush(), 150);
    try {
      node.port.postMessage({ type: 'flush' });
    } catch {
      this.resolveWorkletFlush();
    }
    return promise;
  }

  private resolveWorkletFlush(): void {
    if (this.workletFlushTimer !== null) {
      window.clearTimeout(this.workletFlushTimer);
      this.workletFlushTimer = null;
    }
    const resolve = this.workletFlushResolve;
    this.workletFlushPromise = null;
    this.workletFlushResolve = null;
    resolve?.();
  }

  private reconnectSession(): void {
    if (
      this.intentionalClose ||
      this.isStopping ||
      this.isReconnecting ||
      !this.sessionApiKey ||
      !this.sessionTargetLanguageCode ||
      !this.sessionResumptionHandle ||
      !this.sessionCurrentlyResumable ||
      this.terminalTurnCompleteDebt > 0
    ) return;

    const apiKey = this.sessionApiKey;
    const targetLanguageCode = this.sessionTargetLanguageCode;
    const resumeHandle = this.sessionResumptionHandle;
    const attempt = ++this.openAttempt;
    this.isReconnecting = true;
    this.reconnectRequested = false;

    void this.openSession(apiKey, targetLanguageCode, resumeHandle, true)
      .then(() => {
        if (attempt === this.openAttempt) {
          this.isReconnecting = false;
          this.maybeFinishLifecycle();
        }
      })
      .catch((error) => {
        if (attempt !== this.openAttempt) return;
        this.isReconnecting = false;
        this.flushCurrentTurnImmediately(false);
        this.cleanup(false);
        this.callbacks.onStatusChange?.('error');
        this.callbacks.onError?.(
          `Could not reconnect the Gemini Live session: ${error instanceof Error ? error.message : String(error)}`
        );
      });
  }

  /**
   * Create a non-resumed boundary after input transcription became impossible
   * to attribute safely. Existing output audio keeps playing while the old
   * microphone/socket are replaced.
   */
  private reconnectFreshSession(): void {
    if (
      this.intentionalClose ||
      this.isStopping ||
      this.isReconnecting ||
      !this.sessionApiKey ||
      !this.sessionTargetLanguageCode ||
      this.hasTurnData() ||
      this.terminalTurnCompleteDebt > 0
    ) return;

    const apiKey = this.sessionApiKey;
    const targetLanguageCode = this.sessionTargetLanguageCode;
    const attempt = ++this.openAttempt;
    this.isReconnecting = true;
    this.reconnectRequested = false;
    this.sessionResumptionHandle = null;
    this.sessionCurrentlyResumable = false;

    void this.openSession(apiKey, targetLanguageCode, null, false, true)
      .then(() => {
        if (attempt === this.openAttempt) {
          this.isReconnecting = false;
          this.maybeFinishLifecycle();
        }
      })
      .catch((error) => {
        if (attempt !== this.openAttempt) return;
        this.isReconnecting = false;
        this.flushCurrentTurnImmediately(false);
        this.cleanup(false);
        this.callbacks.onStatusChange?.('error');
        this.callbacks.onError?.(
          `Could not reset the input transcription boundary: ${error instanceof Error ? error.message : String(error)}`
        );
      });
  }

  private cleanup(
    notify: boolean,
    preserveSession = false,
    preserveTurn = false,
    preservePlayback = false
  ): void {
    const pendingReject = this.pendingConnectionReject;
    this.pendingConnectionReject = null;
    pendingReject?.(new DOMException('Live connection was stopped', 'AbortError'));
    this.connectionGeneration += 1;
    this.isRecording = false;
    this.isConnected = false;
    this.isSetupDone = false;
    this.audioStreamEndSent = false;
    this.stopInputCapture();
    this.resolveWorkletFlush();

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close(1000, 'client stop');
      } catch {}
    }

    if (!preservePlayback) {
      this.clearPlaybackQueue();
      if (this.playbackContext) {
        if (this.playbackContext.state !== 'closed') void this.playbackContext.close();
        this.playbackContext = null;
      }
    }

    this.pendingInput = new Int16Array(0);
    this.resetResampler();
    if (!preserveTurn) {
      const pendingTurnTimer = this.pendingCompletedTurn?.timerId;
      if (pendingTurnTimer != null) window.clearTimeout(pendingTurnTimer);
      this.pendingCompletedTurn = null;
      this.currentInputText = '';
      this.currentInterimInput = '';
      this.currentOutputText = '';
      this.deferredInputText = '';
      this.deferredInputIsFinal = false;
      this.deferredInputAt = 0;
      this.turnInputAt = 0;
      this.firstOutputAt = 0;
      this.lastPotentialSpeechAt = 0;
      this.lastServerCompletionAt = 0;
      this.unattributedSpeechStartedAt = 0;
      this.orphanInputAwaitingFinal = false;
      this.dropInputUntilFreshSession = false;
      this.freshSessionRequested = false;
      this.terminalTurnCompleteDebt = 0;
      this.completionSerial = 0;
    }
    if (this.stopDrainTimer !== null) {
      window.clearTimeout(this.stopDrainTimer);
      this.stopDrainTimer = null;
    }
    if (this.stopMinimumDrainTimer !== null) {
      window.clearTimeout(this.stopMinimumDrainTimer);
      this.stopMinimumDrainTimer = null;
    }
    if (this.goAwayReconnectTimer !== null) {
      window.clearTimeout(this.goAwayReconnectTimer);
      this.goAwayReconnectTimer = null;
    }
    this.goAwayDeadlineAt = 0;
    this.isStopping = false;
    this.stopDrainArmed = false;
    this.stopArmedCompletionSerial = 0;
    this.stopNeedsNewCompletion = true;
    this.stopMinimumDrainElapsed = false;
    this.drainCompletionSeen = false;

    const resolveStop = this.resolveStop;
    this.resolveStop = null;
    this.stopPromise = null;
    resolveStop?.();

    if (!preserveSession) {
      this.sessionApiKey = '';
      this.sessionSourceLanguageCode = '';
      this.sessionTargetLanguageCode = '';
      this.sessionResumptionHandle = null;
      this.sessionCurrentlyResumable = false;
      this.resumptionUpdateSerial = 0;
      this.isReconnecting = false;
      this.reconnectRequested = false;
    }
    if (notify) this.callbacks.onStatusChange?.('disconnected');
  }

  private stopInputCapture(): void {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.onmessage = null;
      this.audioWorkletNode.port.close();
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    this.inputSource?.disconnect();
    this.inputSource = null;
    this.silentGain?.disconnect();
    this.silentGain = null;
    if (this.inputContext) {
      if (this.inputContext.state !== 'closed') void this.inputContext.close();
      this.inputContext = null;
    }
  }

  private resample(input: Float32Array, inputRate: number): Float32Array {
    if (inputRate === INPUT_SAMPLE_RATE) {
      this.resetResampler();
      return new Float32Array(input);
    }
    if (this.resampleInputRate !== inputRate) {
      this.resetResampler();
      this.resampleInputRate = inputRate;
    }

    const combined = new Float32Array(input.length + (this.resampleCarry === null ? 0 : 1));
    let position = 0;
    if (this.resampleCarry !== null) {
      combined[0] = this.resampleCarry;
      combined.set(input, 1);
      position = this.resamplePosition;
    } else {
      combined.set(input);
    }

    const ratio = inputRate / INPUT_SAMPLE_RATE;
    const samples: number[] = [];
    while (position < combined.length - 1) {
      const leftIndex = Math.floor(position);
      const rightIndex = leftIndex + 1;
      const fraction = position - leftIndex;
      samples.push(combined[leftIndex] * (1 - fraction) + combined[rightIndex] * fraction);
      position += ratio;
    }

    this.resampleCarry = combined[combined.length - 1] ?? this.resampleCarry;
    this.resamplePosition = position - Math.max(0, combined.length - 1);
    return Float32Array.from(samples);
  }

  private resetResampler(): void {
    this.resampleCarry = null;
    this.resamplePosition = 0;
    this.resampleInputRate = 0;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index]));
      output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.byteLength; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
}
