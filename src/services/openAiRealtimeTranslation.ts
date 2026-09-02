import type {
  LiveSocketCallbacks,
  LiveTranslationService,
} from './liveTranslation';

const TURN_QUIET_MS = 1_400;
// Source transcription is an independently billed/modelled stream and can
// trail translated output. Give it a little longer before saving a turn so a
// transient lag does not create a translation card with a missing source.
const SOURCE_TRANSCRIPT_GRACE_MS = 3_000;
// Translation sessions can emit a final transcript/audio tail after
// `session.close`. Keep a bounded drain window instead of dropping it
// immediately; the server normally answers with `session.closed` sooner.
const CLOSE_DRAIN_MS = 10_000;

interface TranslationServerEvent {
  type?: string;
  delta?: string;
  error?: { message?: string };
}

interface ClientSecretResponse {
  value?: string;
  message?: string;
  error?: { message?: string };
}

const appendDelta = (previous: string, delta: string): string => `${previous}${delta}`;

export class OpenAIRealtimeTranslationService implements LiveTranslationService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sourceStream: MediaStream | null = null;
  private translatedAudio: HTMLAudioElement | null = null;
  private callbacks: LiveSocketCallbacks;
  private generation = 0;
  private isStopping = false;
  private sourceLanguageCode = '';
  private targetLanguageCode = '';
  private sourceText = '';
  private outputText = '';
  private speechStartedAt = 0;
  private firstOutputAt = 0;
  private turnTimer: number | null = null;
  private closeTimer: number | null = null;
  private closeResolve: (() => void) | null = null;
  private stopPromise: Promise<void> | null = null;

  constructor(callbacks: LiveSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: LiveSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async start(
    apiKey: string,
    sourceLanguageCode: string,
    targetLanguageCode: string
  ): Promise<void> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) throw new Error('An OpenAI API key is required.');
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC microphone input requires a supported browser and HTTPS.');
    }

    await this.stop();
    const generation = ++this.generation;
    this.isStopping = false;
    this.sourceLanguageCode = sourceLanguageCode;
    this.targetLanguageCode = targetLanguageCode;
    this.resetTurn();
    this.callbacks.onStatusChange?.('connecting');

    try {
      // Ask for microphone permission before minting the 60-second client
      // secret. A first-time permission prompt can otherwise outlive the token.
      const sourceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== this.generation) {
        for (const track of sourceStream.getTracks()) track.stop();
        throw new DOMException('Start cancelled', 'AbortError');
      }
      this.sourceStream = sourceStream;

      const secretResponse = await fetch('/api/openai-translation-session', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          sourceLanguage: sourceLanguageCode,
          targetLanguage: targetLanguageCode,
        }),
      });
      const secretBody = await secretResponse.json().catch(() => ({})) as ClientSecretResponse;
      if (!secretResponse.ok || !secretBody.value) {
        throw new Error(
          secretBody.error?.message ?? secretBody.message ?? `OpenAI session failed (${secretResponse.status}).`
        );
      }
      if (generation !== this.generation) throw new DOMException('Start cancelled', 'AbortError');

      const peerConnection = new RTCPeerConnection();
      this.peerConnection = peerConnection;
      const sourceTrack = sourceStream.getAudioTracks()[0];
      if (!sourceTrack) throw new Error('No microphone audio track is available.');
      peerConnection.addTrack(sourceTrack, sourceStream);

      const translatedAudio = new Audio();
      translatedAudio.autoplay = true;
      translatedAudio.setAttribute('playsinline', '');
      this.translatedAudio = translatedAudio;
      peerConnection.ontrack = ({ streams }) => {
        if (generation !== this.generation || !streams[0]) return;
        translatedAudio.srcObject = streams[0];
        void translatedAudio.play().catch(() => {
          // Transcript output remains usable, but surface the browser policy
          // failure instead of leaving the user with unexplained silence.
          if (generation === this.generation && !this.isStopping) {
            this.callbacks.onError?.('The browser blocked translated audio playback.');
          }
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (generation !== this.generation || this.isStopping) return;
        if (peerConnection.connectionState === 'connected') {
          this.callbacks.onStatusChange?.('connected');
        } else if (peerConnection.connectionState === 'failed') {
          this.callbacks.onStatusChange?.('error');
          this.callbacks.onError?.('The OpenAI WebRTC connection failed.');
          // A failed peer connection does not reliably close its local media
          // tracks. Invalidate callbacks and release the microphone now.
          this.generation += 1;
          this.cleanup(false);
        } else if (peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'closed') {
          this.callbacks.onStatusChange?.('disconnected');
        }
      };

      const dataChannel = peerConnection.createDataChannel('oai-events');
      this.dataChannel = dataChannel;
      dataChannel.onerror = () => {
        if (generation !== this.generation || this.isStopping) return;
        this.callbacks.onStatusChange?.('error');
        this.callbacks.onError?.('The OpenAI transcript channel failed.');
        this.generation += 1;
        this.cleanup(false);
      };
      dataChannel.onclose = () => {
        if (this.isStopping) {
          this.finishClose();
          return;
        }
        if (generation !== this.generation) return;
        this.callbacks.onStatusChange?.('error');
        this.callbacks.onError?.('The OpenAI transcript channel closed unexpectedly.');
        this.generation += 1;
        this.cleanup(false);
      };
      dataChannel.onmessage = ({ data }) => {
        if (generation !== this.generation || typeof data !== 'string') return;
        try {
          this.handleServerEvent(JSON.parse(data) as TranslationServerEvent);
        } catch (error) {
          console.warn('[OpenAI Realtime] invalid server event:', error);
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime/translations/calls',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretBody.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );
      if (!sdpResponse.ok) {
        const message = (await sdpResponse.text()).slice(0, 500);
        throw new Error(message || `OpenAI WebRTC negotiation failed (${sdpResponse.status}).`);
      }
      if (generation !== this.generation) throw new DOMException('Start cancelled', 'AbortError');
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: await sdpResponse.text(),
      });
      if (peerConnection.connectionState === 'connected') {
        this.callbacks.onStatusChange?.('connected');
      }
    } catch (error) {
      if (generation === this.generation) {
        this.cleanup(false);
        this.callbacks.onStatusChange?.('error');
      }
      throw error;
    }
  }

  private handleServerEvent(event: TranslationServerEvent): void {
    if (event.type === 'session.input_transcript.delta' && event.delta) {
      if (!this.speechStartedAt) this.speechStartedAt = performance.now();
      this.sourceText = appendDelta(this.sourceText, event.delta);
      this.callbacks.onInputTranscript?.(this.sourceText, true);
      // Output deltas define the translated turn boundary. Resetting the quiet
      // timer on source-only deltas can commit a card before its translation
      // arrives on a slower connection.
      if (this.outputText) this.scheduleTurnFlush();
      return;
    }
    if (event.type === 'session.output_transcript.delta' && event.delta) {
      if (!this.speechStartedAt) this.speechStartedAt = performance.now();
      if (!this.firstOutputAt) this.firstOutputAt = performance.now();
      this.outputText = appendDelta(this.outputText, event.delta);
      this.callbacks.onOutputTranscript?.(this.outputText);
      this.callbacks.onAudioPlayingState?.(true);
      this.scheduleTurnFlush();
      return;
    }
    if (event.type === 'error') {
      this.callbacks.onError?.(event.error?.message ?? 'OpenAI Realtime returned an error.');
      return;
    }
    if (event.type === 'session.closed') {
      this.flushTurn();
      this.finishClose();
    }
  }

  private scheduleTurnFlush(): void {
    if (this.turnTimer !== null) window.clearTimeout(this.turnTimer);
    const delayMs = this.sourceText.trim()
      ? TURN_QUIET_MS
      : SOURCE_TRANSCRIPT_GRACE_MS;
    this.turnTimer = window.setTimeout(() => {
      this.turnTimer = null;
      this.flushTurn();
    }, delayMs);
  }

  private flushTurn(): void {
    if (this.turnTimer !== null) {
      window.clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    const translatedText = this.outputText.trim();
    const sourceText = this.sourceText.trim();
    if (translatedText) {
      const latencyMs = this.speechStartedAt && this.firstOutputAt
        ? Math.max(0, Math.round(this.firstOutputAt - this.speechStartedAt))
        : 0;
      this.callbacks.onTurnComplete?.({
        sourceText,
        translatedText,
        sourceLanguageCode: this.sourceLanguageCode,
        targetLanguageCode: this.targetLanguageCode,
        latencyMs,
      });
    }
    this.callbacks.onAudioPlayingState?.(false);
    this.callbacks.onInputTranscript?.('', false);
    this.callbacks.onOutputTranscript?.('');
    this.resetTurn();
  }

  private resetTurn(): void {
    this.sourceText = '';
    this.outputText = '';
    this.speechStartedAt = 0;
    this.firstOutputAt = 0;
  }

  public async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.stopPromise = this.performStop().finally(() => {
      this.stopPromise = null;
    });
    return this.stopPromise;
  }

  private async performStop(): Promise<void> {
    if (!this.peerConnection && !this.sourceStream && !this.dataChannel) {
      this.generation += 1;
      this.cleanup(true);
      return;
    }
    const closingGeneration = this.generation;
    this.isStopping = true;
    for (const track of this.sourceStream?.getTracks() ?? []) track.stop();

    if (this.dataChannel?.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify({ type: 'session.close' }));
        await new Promise<void>((resolve) => {
          this.closeResolve = resolve;
          this.closeTimer = window.setTimeout(() => this.finishClose(), CLOSE_DRAIN_MS);
        });
      } catch {
        // Closing the peer connection below is the hard fallback.
      }
    }
    this.flushTurn();
    if (this.generation === closingGeneration) this.generation += 1;
    this.cleanup(true);
  }

  private finishClose(): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    const resolve = this.closeResolve;
    this.closeResolve = null;
    resolve?.();
  }

  private cleanup(notify: boolean): void {
    if (this.turnTimer !== null) window.clearTimeout(this.turnTimer);
    this.turnTimer = null;
    this.finishClose();
    if (this.dataChannel) {
      this.dataChannel.onclose = null;
      this.dataChannel.onerror = null;
      this.dataChannel.onmessage = null;
    }
    this.dataChannel?.close();
    this.peerConnection?.close();
    for (const track of this.sourceStream?.getTracks() ?? []) track.stop();
    if (this.translatedAudio) {
      this.translatedAudio.pause();
      this.translatedAudio.srcObject = null;
    }
    this.dataChannel = null;
    this.peerConnection = null;
    this.sourceStream = null;
    this.translatedAudio = null;
    this.isStopping = false;
    this.callbacks.onAudioPlayingState?.(false);
    if (notify) this.callbacks.onStatusChange?.('disconnected');
  }

  public dispose(): void {
    void this.stop();
  }
}
