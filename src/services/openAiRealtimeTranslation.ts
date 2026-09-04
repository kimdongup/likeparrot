import { LiveStreamTurnAssembler } from './liveStreamTurns';
import type {
  LiveSocketCallbacks,
  LiveTranslationService,
} from './liveTranslation';

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
  private readonly turns: LiveStreamTurnAssembler;
  private closeTimer: number | null = null;
  private closeResolve: (() => void) | null = null;
  private stopPromise: Promise<void> | null = null;

  constructor(callbacks: LiveSocketCallbacks = {}) {
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
    _options?: import('./liveTranslation').LiveStartOptions
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
    this.turns.reset();
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
      this.turns.appendSource(event.delta, 'delta');
      this.callbacks.onInputTranscript?.(this.turns.sourcePreview, true);
      return;
    }
    if (event.type === 'session.output_transcript.delta' && event.delta) {
      this.turns.appendOutput(event.delta, 'delta');
      this.callbacks.onOutputTranscript?.(this.turns.outputPreview);
      this.callbacks.onAudioPlayingState?.(true);
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

  private flushTurn(): void {
    this.turns.flush();
    this.callbacks.onAudioPlayingState?.(false);
    this.callbacks.onInputTranscript?.('', false);
    this.callbacks.onOutputTranscript?.('');
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
    this.turns.reset();
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
