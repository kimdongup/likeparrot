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

interface CachedBrowserTranslator {
  instancePromise: Promise<BrowserTranslatorInstance>;
  readyPromise: Promise<void>;
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
  private static translatorCache = new Map<string, CachedBrowserTranslator>();

  private static cacheTranslator(
    cacheKey: string,
    instancePromise: Promise<BrowserTranslatorInstance>
  ): CachedBrowserTranslator {
    const entry: CachedBrowserTranslator = {
      instancePromise,
      readyPromise: instancePromise.then(() => undefined),
    };
    this.translatorCache.set(cacheKey, entry);
    // Keep the returned readiness promise observable by callers while also
    // preventing an ignored prepare() call from producing an unhandled rejection.
    void entry.readyPromise.catch(() => {
      if (this.translatorCache.get(cacheKey) === entry) {
        this.translatorCache.delete(cacheKey);
      }
    });
    return entry;
  }

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
  public static prepare(sourceCode: string, targetCode: string): Promise<void> {
    if (!this.isEligibleDesktopBrowser()) return Promise.resolve();
    const factory = getTranslatorFactory();
    if (!factory) return Promise.resolve();
    const sourceLanguage = toChromeLanguageCode(sourceCode);
    const targetLanguage = toChromeLanguageCode(targetCode);
    if (sourceLanguage === targetLanguage) return Promise.resolve();
    const cacheKey = `${sourceLanguage}|${targetLanguage}`;
    const cached = this.translatorCache.get(cacheKey);
    if (cached) return cached.readyPromise;

    // This call must remain synchronous with the user's Start gesture: Chrome
    // rejects creation of a downloadable language model outside user activation.
    // Do not attach a caller AbortSignal; stopping one translation must not cancel
    // the shared platform download needed by the next utterance.
    return this.cacheTranslator(
      cacheKey,
      factory.create({ sourceLanguage, targetLanguage })
    ).readyPromise;
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
      const isImmediatelyAvailable = availability === 'available' || availability === 'readily';
      let cached = this.translatorCache.get(cacheKey);

      if (!cached) {
        if (availability === 'unavailable' || availability === 'no') return null;
        // A downloadable/downloading model may only be created from prepare(),
        // while user activation is still live. Never attempt that creation from
        // the later speech-result callback.
        if (!isImmediatelyAvailable) return null;
        cached = this.cacheTranslator(
          cacheKey,
          factory.create({ sourceLanguage, targetLanguage })
        );
      } else if (!waitForDownload && !isImmediatelyAvailable) {
        // Automatic routing can move on to a configured network engine instead
        // of waiting. When no such engine exists, its caller opts into waiting
        // for this already user-gesture-started preparation promise.
        return null;
      }

      // A prepare() promise may be shared and cannot be retroactively aborted.
      // Race the caller against it so Stop immediately releases the pipeline.
      const translator = await awaitWithAbort(cached.instancePromise, signal);
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
