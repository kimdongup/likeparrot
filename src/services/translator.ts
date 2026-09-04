import { BergamotTranslator } from './bergamotTranslator';
import { BuiltInTranslator } from './builtInTranslator';
import { requestNetworkTranslation } from './networkTranslationClient';
import type { PipelineEngineType, Stage2Option } from '../types';

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
    const shouldTryBergamot = targetEngine === 'bergamot';
    const shouldTryGemini = targetEngine === 'auto' || targetEngine === 'gemini_stream';
    const shouldTryAzure = targetEngine === 'auto' || targetEngine === 'turbo_fastpath';
    const cleanKey = apiKey?.trim() ?? '';
    const azureKey = azureCredentials?.apiKey.trim() ?? '';
    const hasConfiguredNetworkAlternative = targetEngine === 'auto'
      && (Boolean(cleanKey) || Boolean(azureKey));

    if (shouldTryBrowser) {
      if (BuiltInTranslator.isBrowserTranslatorSupported()) {
        try {
          const result = await BuiltInTranslator.translateWithChromeNano(
            cleanText,
            sourceCode,
            targetCode,
            signal,
            targetEngine === 'chrome_nano' || !hasConfiguredNetworkAlternative
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

    if (shouldTryBergamot) {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        const translatedText = await BergamotTranslator.translate(
          cleanText,
          sourceCode,
          targetCode
        );
        const latencyMs = Math.round(performance.now() - startTime);
        onChunk?.(translatedText, translatedText);
        onClauseReady?.(translatedText);
        return {
          translatedText,
          engineName: 'Bergamot on-device translator',
          engineType: 'bergamot',
          latencyMs,
        };
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) throw error;
        throw new TranslationError(
          error instanceof Error ? error.message : 'Bergamot on-device translation failed.'
        );
      }
    }

    if (shouldTryGemini) {
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
    try {
      return await requestNetworkTranslation({
        engine: 'azure',
        text,
        sourceCode,
        targetCode,
        apiKey,
        region,
        signal,
      });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error;
      const allowFallback = error instanceof TranslationError
        ? error.allowFallback
        : (error as { allowFallback?: boolean }).allowFallback !== false;
      throw new TranslationError(
        error instanceof Error ? error.message : 'Azure Translator failed.',
        allowFallback
      );
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
    let clauseBuffer = '';
    try {
      const translatedText = await requestNetworkTranslation({
        engine: 'gemini',
        text,
        sourceLang,
        targetLang,
        apiKey,
        signal,
        onChunk: (chunk, accumulated) => {
          onChunk?.(chunk, accumulated);
          clauseBuffer += chunk;
          clauseBuffer = flushReadyClauses(clauseBuffer, onClauseReady, false);
        },
      });
      if (!translatedText.trim()) return null;
      flushReadyClauses(clauseBuffer, onClauseReady, true);
      return {
        translatedText,
        engineName: '🌊 Gemini 3.5 Flash-Lite (live streaming)',
        engineType: 'gemini_stream',
        latencyMs: Math.round(performance.now() - startTime),
      };
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error;
      const allowFallback = error instanceof TranslationError
        ? error.allowFallback
        : (error as { allowFallback?: boolean }).allowFallback !== false;
      throw new TranslationError(
        error instanceof Error ? error.message : 'Gemini translation failed.',
        allowFallback
      );
    }
  }
}
