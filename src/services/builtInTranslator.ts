/** Browser-native Translator API plus a bounded network fallback cache. */

const NETWORK_TIMEOUT_MS = 2_500;
const MAX_MEMORY_CACHE_ENTRIES = 200;

interface BrowserTranslatorInstance {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy?: () => void;
}

interface BrowserTranslatorFactory {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
    signal?: AbortSignal;
  }): Promise<BrowserTranslatorInstance>;
}

const getTranslatorFactory = (): BrowserTranslatorFactory | null => {
  const factory = (globalThis as typeof globalThis & {
    Translator?: Partial<BrowserTranslatorFactory>;
  }).Translator;
  return typeof factory?.create === 'function' && typeof factory.availability === 'function'
    ? factory as BrowserTranslatorFactory
    : null;
};

export const toChromeLanguageCode = (languageCode: string): string => {
  const normalized = languageCode.toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-Hant';
  if (normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh';
  return languageCode.split('-')[0].toLowerCase();
};

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError');
  }
};

const awaitWithAbort = <T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return operation;
  throwIfAborted(signal);

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
    };
    const cleanup = () => signal.removeEventListener('abort', handleAbort);
    signal.addEventListener('abort', handleAbort, { once: true });
    operation.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
};

export class BuiltInTranslator {
  private static translatorCache = new Map<string, Promise<BrowserTranslatorInstance>>();
  private static localMemoryCache = new Map<string, string>();

  public static isChromeNanoSupported(): boolean {
    return typeof window !== 'undefined' && getTranslatorFactory() !== null;
  }

  public static getEngineName(): { name: string; isNano: boolean } {
    if (this.isChromeNanoSupported()) {
      return { name: 'Chrome built-in Translator', isNano: true };
    }
    return { name: 'Network translation fallback', isNano: false };
  }

  /**
   * Start creating/downloading the language pack from a user gesture. The
   * translation path reuses this promise, so the first utterance is not blocked
   * by duplicate model creation.
   */
  public static prepare(sourceCode: string, targetCode: string): void {
    const factory = getTranslatorFactory();
    if (!factory) return;
    const sourceLanguage = toChromeLanguageCode(sourceCode);
    const targetLanguage = toChromeLanguageCode(targetCode);
    if (sourceLanguage === targetLanguage) return;
    const cacheKey = `${sourceLanguage}|${targetLanguage}`;
    if (this.translatorCache.has(cacheKey)) return;

    const promise = factory.create({ sourceLanguage, targetLanguage });
    this.translatorCache.set(cacheKey, promise);
    void promise.catch(() => {
      if (this.translatorCache.get(cacheKey) === promise) {
        this.translatorCache.delete(cacheKey);
      }
    });
  }

  public static async translateWithChromeNano(
    text: string,
    sourceCode: string,
    targetCode: string,
    signal?: AbortSignal,
    waitForDownload = false
  ): Promise<string | null> {
    const factory = getTranslatorFactory();
    if (!factory) return null;
    throwIfAborted(signal);

    const sourceLanguage = toChromeLanguageCode(sourceCode);
    const targetLanguage = toChromeLanguageCode(targetCode);
    if (sourceLanguage === targetLanguage) return text.trim();
    const cacheKey = `${sourceLanguage}|${targetLanguage}`;

    try {
      const availability = await factory.availability({ sourceLanguage, targetLanguage });
      throwIfAborted(signal);
      if (availability === 'unavailable' || availability === 'no') return null;
      if (!waitForDownload && availability !== 'available' && availability !== 'readily') {
        return null;
      }

      let translatorPromise = this.translatorCache.get(cacheKey);
      if (!translatorPromise) {
        translatorPromise = factory.create({ sourceLanguage, targetLanguage, signal });
        this.translatorCache.set(cacheKey, translatorPromise);
        const createdPromise = translatorPromise;
        void createdPromise.catch(() => {
          if (this.translatorCache.get(cacheKey) === createdPromise) {
            this.translatorCache.delete(cacheKey);
          }
        });
      }

      // A prepare() promise may be shared and cannot be retroactively aborted.
      // Race the caller against it so Stop immediately releases the pipeline.
      const translator = await awaitWithAbort(translatorPromise, signal);
      throwIfAborted(signal);
      const translated = await translator.translate(text, { signal });
      throwIfAborted(signal);
      return typeof translated === 'string' && translated.trim() ? translated.trim() : null;
    } catch (error) {
      if (signal?.aborted) throw error;
      this.translatorCache.delete(cacheKey);
      console.warn('[BuiltInTranslator] Chrome translation failed:', error);
      return null;
    }
  }

  /**
   * Best-effort network fallback for BYOK-free use. These endpoints are not a
   * browser-native/offline engine, so callers must label the result accordingly.
   */
  public static async translateUniversalFastPath(
    text: string,
    targetCode: string,
    sourceCode: string = 'auto',
    signal?: AbortSignal
  ): Promise<string | null> {
    const cleanText = text.trim();
    if (!cleanText) return '';
    throwIfAborted(signal);

    const simpleTarget = this.toNetworkLanguageCode(targetCode);
    const simpleSource = this.toNetworkLanguageCode(sourceCode);
    const memoryKey = `${simpleSource}|${simpleTarget}|${cleanText}`;
    const cached = this.localMemoryCache.get(memoryKey);
    if (cached !== undefined) {
      this.localMemoryCache.delete(memoryKey);
      this.localMemoryCache.set(memoryKey, cached);
      return cached;
    }

    const urls: string[] = [];
    const deadlineAt = performance.now() + NETWORK_TIMEOUT_MS;
    if (import.meta.env.DEV) {
      urls.push(
        `/api/translate?client=gtx&sl=${encodeURIComponent(simpleSource)}` +
          `&tl=${encodeURIComponent(simpleTarget)}&dt=t&dj=1&q=${encodeURIComponent(cleanText)}`
      );
    }
    urls.push(
      'https://translate.googleapis.com/translate_a/single' +
        `?client=gtx&sl=${encodeURIComponent(simpleSource)}` +
        `&tl=${encodeURIComponent(simpleTarget)}&dt=t&dj=1&q=${encodeURIComponent(cleanText)}`
    );

    for (const url of urls) {
      const remainingMs = Math.max(0, deadlineAt - performance.now());
      if (remainingMs <= 0) break;
      try {
        const { response, data } = await this.fetchJsonWithTimeout(url, signal, remainingMs);
        if (!response.ok) continue;
        const sentences = data?.sentences;
        if (!Array.isArray(sentences)) continue;
        const result = sentences.map((sentence: { trans?: string }) => sentence.trans ?? '').join('').trim();
        if (result) {
          this.remember(memoryKey, result);
          return result;
        }
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }

    // Last-resort third-party fallback. It is intentionally attempted only
    // after the faster Google endpoint and is bounded by the same deadline.
    try {
      const remainingMs = Math.max(0, deadlineAt - performance.now());
      if (remainingMs <= 0) return null;
      const sourcePair = simpleSource === 'auto' ? 'ko' : simpleSource;
      const url =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}` +
        `&langpair=${encodeURIComponent(sourcePair)}|${encodeURIComponent(simpleTarget)}`;
      const { response, data } = await this.fetchJsonWithTimeout(url, signal, remainingMs);
      if (response.ok) {
        const translated = data?.responseData?.translatedText;
        if (typeof translated === 'string' && translated.trim()) {
          const result = translated.trim();
          this.remember(memoryKey, result);
          return result;
        }
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn('[BuiltInTranslator] Network fallback failed:', error);
    }

    return null;
  }

  private static toNetworkLanguageCode(languageCode: string): string {
    const normalized = languageCode.toLowerCase();
    if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-TW';
    if (normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN';
    return languageCode === 'auto' ? 'auto' : languageCode.split('-')[0].toLowerCase();
  }

  private static remember(key: string, value: string): void {
    this.localMemoryCache.set(key, value);
    while (this.localMemoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
      const oldestKey = this.localMemoryCache.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.localMemoryCache.delete(oldestKey);
    }
  }

  private static async fetchJsonWithTimeout(
    url: string,
    parentSignal?: AbortSignal,
    timeoutMs = NETWORK_TIMEOUT_MS
  ): Promise<{ response: Response; data: any }> {
    throwIfAborted(parentSignal);
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(parentSignal?.reason);
    parentSignal?.addEventListener('abort', forwardAbort, { once: true });
    const timeoutId = window.setTimeout(
      () => controller.abort(new DOMException('Translation request timed out', 'TimeoutError')),
      timeoutMs
    );

    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = response.ok ? await response.json() : null;
      return { response, data };
    } finally {
      window.clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', forwardAbort);
    }
  }
}
