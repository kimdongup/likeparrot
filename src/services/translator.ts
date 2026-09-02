import { BuiltInTranslator } from './builtInTranslator';
import type { PipelineEngineType, Stage2Option } from '../types';

const FAST_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_REQUEST_TIMEOUT_MS = 10_000;
const AZURE_REQUEST_TIMEOUT_MS = 8_000;

export interface AzureTranslatorCredentials {
  apiKey: string;
  region?: string;
}

export interface TranslationResult {
  translatedText: string;
  engineName: string;
  engineType: PipelineEngineType;
  latencyMs: number;
}

export class TranslationError extends Error {
  public readonly allowFallback: boolean;

  constructor(message: string, allowFallback = false) {
    super(message);
    this.name = 'TranslationError';
    this.allowFallback = allowFallback;
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError');
  }
};

/**
 * Emits complete, non-overlapping clauses while retaining an unfinished tail.
 * Sentence terminators are preferred; a comma is used only for a long clause.
 */
const flushReadyClauses = (
  buffer: string,
  emit: ((clause: string) => void) | undefined,
  force: boolean
): string => {
  if (!emit) return buffer;
  let remaining = buffer;

  while (remaining) {
    const sentenceBoundary = remaining.search(/[.!?。！？\n]/u);
    let boundary = sentenceBoundary >= 0 ? sentenceBoundary + 1 : -1;

    if (boundary < 0 && remaining.length >= 80) {
      const commaBoundary = Math.max(
        remaining.lastIndexOf(',', 80),
        remaining.lastIndexOf('，', 80),
        remaining.lastIndexOf('、', 80),
        remaining.lastIndexOf(';', 80),
        remaining.lastIndexOf('；', 80)
      );
      if (commaBoundary >= 20) boundary = commaBoundary + 1;
    }

    if (boundary < 0) break;
    const clause = remaining.slice(0, boundary).trim();
    remaining = remaining.slice(boundary).trimStart();
    if (clause) emit(clause);
  }

  if (force && remaining.trim()) {
    emit(remaining.trim());
    return '';
  }
  return remaining;
};

export class TranslationService {
  /** Execute the selected STT-independent translation stage. */
  public static async translateWithPipeline(
    text: string,
    sourceLang: string,
    sourceCode: string,
    targetLang: string,
    targetCode: string,
    apiKey?: string,
    azureCredentials?: AzureTranslatorCredentials,
    onChunk?: (chunk: string, fullText: string) => void,
    onClauseReady?: (clause: string) => void,
    targetEngine: Stage2Option = 'auto',
    signal?: AbortSignal
  ): Promise<TranslationResult> {
    const startTime = performance.now();
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        translatedText: '',
        engineName: 'None',
        engineType: 'network_fallback',
        latencyMs: 0,
      };
    }
    throwIfAborted(signal);

    const shouldTryBrowser = targetEngine === 'auto' || targetEngine === 'chrome_nano';
    const shouldTryGemini = targetEngine === 'auto' || targetEngine === 'gemini_stream';
    const shouldTryAzure = targetEngine === 'auto' || targetEngine === 'turbo_fastpath';

    if (shouldTryBrowser) {
      if (BuiltInTranslator.isBrowserTranslatorSupported()) {
        try {
          const result = await BuiltInTranslator.translateWithChromeNano(
            cleanText,
            sourceCode,
            targetCode,
            signal,
            targetEngine === 'chrome_nano'
          );
          if (result) {
            const latencyMs = Math.round(performance.now() - startTime);
            onChunk?.(result, result);
            onClauseReady?.(result);
            return {
              translatedText: result,
              engineName: '⚡ Browser built-in Translator',
              engineType: 'chrome_nano',
              latencyMs,
            };
          }
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) throw error;
          console.warn('[Translator] Browser Translator error:', error);
        }
      }

      if (targetEngine === 'chrome_nano') {
        throw new TranslationError(
          'Browser on-device translation is unavailable here. Use Automatic, Gemini Flash-Lite, or Azure Translator.'
        );
      }
    }

    if (shouldTryGemini) {
      const cleanKey = apiKey?.trim() ?? '';
      if (!cleanKey && targetEngine === 'gemini_stream') {
        throw new TranslationError('Gemini translation requires an API key.');
      }

      if (cleanKey) {
        try {
          const result = await this.translateWithGemini(
            cleanText,
            sourceLang,
            targetLang,
            cleanKey,
            startTime,
            onChunk,
            onClauseReady,
            signal
          );
          if (result) return result;
          if (targetEngine === 'gemini_stream') {
            throw new TranslationError('Gemini returned no translation. Please speak again.');
          }
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) throw error;
          if (
            targetEngine === 'gemini_stream' ||
            (error instanceof TranslationError && !error.allowFallback)
          ) throw error;
          console.warn('[Translator] Gemini translation failed, trying Azure Translator:', error);
        }
      }
    }

    if (shouldTryAzure) {
      const azureKey = azureCredentials?.apiKey.trim() ?? '';
      if (!azureKey && targetEngine === 'turbo_fastpath') {
        throw new TranslationError('Azure Translator requires an API key.');
      }
      if (azureKey) {
        try {
          const translatedText = await this.translateWithAzure(
            cleanText,
            sourceCode,
            targetCode,
            azureKey,
            azureCredentials?.region,
            signal
          );
          onChunk?.(translatedText, translatedText);
          onClauseReady?.(translatedText);
          return {
            translatedText,
            engineName: '🌐 Azure AI Translator',
            engineType: 'network_fallback',
            latencyMs: Math.round(performance.now() - startTime),
          };
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) throw error;
          if (targetEngine === 'turbo_fastpath') throw error;
          console.warn('[Translator] Azure Translator failed:', error);
        }
      }
    }

    throw new TranslationError(
      'No translation engine is available. Configure a Gemini or Azure Translator API key.'
    );
  }

  private static async translateWithAzure(
    text: string,
    sourceCode: string,
    targetCode: string,
    apiKey: string,
    region?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const requestController = new AbortController();
    const forwardAbort = () => requestController.abort(signal?.reason);
    signal?.addEventListener('abort', forwardAbort, { once: true });
    const timeoutId = window.setTimeout(
      () => requestController.abort(new DOMException('Azure request timed out', 'TimeoutError')),
      AZURE_REQUEST_TIMEOUT_MS
    );
    if (signal?.aborted) forwardAbort();

    try {
      const query = new URLSearchParams({
        from: sourceCode,
        to: targetCode,
      });
      if (region?.trim()) query.set('region', region.trim());
      const response = await fetch(`/api/azure-translate?${query.toString()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: requestController.signal,
        body: JSON.stringify([{ Text: text }]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof payload?.message === 'string' ? `: ${payload.message}` : '';
        throw new TranslationError(
          `Azure Translator request failed (${response.status})${detail}`,
          true
        );
      }
      const translatedText = typeof payload?.translatedText === 'string'
        ? payload.translatedText.trim()
        : '';
      if (!translatedText) {
        throw new TranslationError('Azure Translator returned no translation.', true);
      }
      return translatedText;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (requestController.signal.aborted) {
        throw new TranslationError('The Azure Translator request timed out.', true);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  private static async translateWithGemini(
    text: string,
    sourceLang: string,
    targetLang: string,
    apiKey: string,
    startTime: number,
    onChunk?: (chunk: string, fullText: string) => void,
    onClauseReady?: (clause: string) => void,
    signal?: AbortSignal
  ): Promise<TranslationResult | null> {
    // AbortSignal.any() is absent in older Safari versions that still support
    // the rest of this app. Combine the caller and deadline manually.
    const requestController = new AbortController();
    let timedOut = false;
    const forwardAbort = () => requestController.abort(signal?.reason);
    signal?.addEventListener('abort', forwardAbort, { once: true });
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      requestController.abort(new DOMException('Gemini request timed out', 'TimeoutError'));
    }, GEMINI_REQUEST_TIMEOUT_MS);
    if (signal?.aborted) forwardAbort();
    const requestSignal = requestController.signal;

    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${FAST_GEMINI_MODEL}` +
        ':streamGenerateContent?alt=sse';
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: requestSignal,
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text:
                    `Translate spoken ${sourceLang} directly into natural, conversational ${targetLang}. ` +
                    'Return only the translation with no notes, labels, quotation marks, or explanation.',
                },
              ],
            },
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              maxOutputTokens: 512,
              thinkingConfig: { thinkingLevel: 'minimal' },
            },
          }),
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        if (timedOut) {
          throw new TranslationError('The Gemini translation request timed out.', true);
        }
        throw error;
      }

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body?.error?.message ? `: ${body.error.message}` : '';
        } catch {}
        throw new TranslationError(`Gemini translation request failed (${response.status})${detail}`, true);
      }
      if (!response.body) throw new TranslationError('The Gemini streaming response has no body.', true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulated = '';
      let clauseBuffer = '';
      let finishReason: string | null = null;

      const handleEventLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const payload = trimmed.slice(5).trimStart();
        if (!payload || payload === '[DONE]') return;

        try {
          const data = JSON.parse(payload);
          const candidate = data?.candidates?.[0];
          if (typeof candidate?.finishReason === 'string') finishReason = candidate.finishReason;
          const parts = candidate?.content?.parts;
          if (!Array.isArray(parts)) return;
          const textPart = parts
            .map((part: { text?: string; thought?: boolean }) => (part.thought ? '' : part.text ?? ''))
            .join('');
          if (!textPart) return;

          accumulated += textPart;
          clauseBuffer += textPart;
          onChunk?.(textPart, accumulated);
          clauseBuffer = flushReadyClauses(clauseBuffer, onClauseReady, false);
        } catch {
          // A malformed event is ignored; the next complete SSE event remains usable.
        }
      };

      try {
        while (true) {
          throwIfAborted(requestSignal);
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split(/\r?\n/u);
          sseBuffer = lines.pop() ?? '';
          for (const line of lines) handleEventLine(line);
        }
        sseBuffer += decoder.decode();
        if (sseBuffer.trim()) handleEventLine(sseBuffer);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (timedOut) {
          throw new TranslationError(
            accumulated.trim()
              ? 'The Gemini translation stream timed out mid-response. Please speak again.'
              : 'The Gemini translation request timed out.',
            !accumulated.trim()
          );
        }
        if (isAbortError(error)) throw error;
        if (accumulated.trim()) {
          throw new TranslationError('The Gemini translation stream ended mid-response. Please speak again.');
        }
        throw error;
      } finally {
        reader.releaseLock();
      }

      if (finishReason !== 'STOP') {
        const reasonLabel = finishReason ?? 'response ended early';
        throw new TranslationError(
          `Gemini translation did not complete normally (${reasonLabel}). Please speak again.`,
          !accumulated.trim()
        );
      }

      const translatedText = accumulated.trim();
      if (!translatedText) return null;
      flushReadyClauses(clauseBuffer, onClauseReady, true);

      return {
        translatedText,
        engineName: '🌊 Gemini 3.5 Flash-Lite (live streaming)',
        engineType: 'gemini_stream',
        latencyMs: Math.round(performance.now() - startTime),
      };
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }
}
