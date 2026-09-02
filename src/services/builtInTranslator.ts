/** Browser-native Translator API with runtime capability detection. */

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

  private static isEligibleDesktopBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent;
    const isFirefox = /Firefox|FxiOS/i.test(userAgent);
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
    if (isFirefox || isMobile) return false;

    // Chrome and Edge currently expose the standardized Translator API.
    // Desktop Safari is intentionally included as a future-capable route, but
    // is used only if WebKit actually exposes the API at runtime.
    return /Chrome|Chromium|Edg|Safari/i.test(userAgent);
  }

  public static isBrowserTranslatorSupported(): boolean {
    return typeof window !== 'undefined'
      && this.isEligibleDesktopBrowser()
      && getTranslatorFactory() !== null;
  }

  /** @deprecated Use the vendor-neutral capability check. */
  public static isChromeNanoSupported(): boolean {
    return this.isBrowserTranslatorSupported();
  }

  public static getEngineName(): { name: string; isNano: boolean } {
    if (this.isBrowserTranslatorSupported()) {
      return { name: 'Browser built-in Translator', isNano: true };
    }
    return { name: 'Network translation fallback', isNano: false };
  }

  /**
   * Start creating/downloading the language pack from a user gesture. The
   * translation path reuses this promise, so the first utterance is not blocked
   * by duplicate model creation.
   */
  public static prepare(sourceCode: string, targetCode: string): void {
    if (!this.isEligibleDesktopBrowser()) return;
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
    if (!this.isEligibleDesktopBrowser()) return null;
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

}
