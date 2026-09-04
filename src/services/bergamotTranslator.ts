import {
  LatencyOptimisedTranslator,
  TranslatorBacking,
} from '@browsermt/bergamot-translator/translator.js';

const MODELS_JSON_URL = '/api/bergamot-models/db/models.json';
const MODELS_BASE_URL = '/api/bergamot-models';
const MODEL_CACHE_NAME = 'likeparrot-bergamot-models-v1';
const WORKER_URL = '/bergamot/translator-worker.js';
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TRANSLATE_TIMEOUT_MS = 90_000;

interface FirefoxModelFile {
  path: string;
}

interface FirefoxModelVariant {
  architecture?: string;
  releaseStatus?: string | null;
  sourceLanguage?: string;
  targetLanguage?: string;
  files: {
    model?: FirefoxModelFile;
    lexicalShortlist?: FirefoxModelFile;
    vocab?: FirefoxModelFile;
    srcVocab?: FirefoxModelFile;
    trgVocab?: FirefoxModelFile;
  };
}

interface FirefoxModelsIndex {
  baseUrl: string;
  models: Record<string, FirefoxModelVariant[]>;
}

interface BergamotRegistryEntry {
  from: string;
  to: string;
  variant: FirefoxModelVariant;
  baseUrl: string;
}

const toBergamotLanguage = (languageCode: string): string => {
  const normalized = languageCode.trim().replaceAll('_', '-').toLowerCase();
  if (normalized === 'zh-tw' || normalized.startsWith('zh-tw-')
    || normalized === 'zh-hant' || normalized.startsWith('zh-hant-')) {
    return 'zh_hant';
  }
  if (normalized === 'zh' || normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) {
    return 'zh';
  }
  return normalized.split('-')[0] ?? normalized;
};

const splitPairKey = (key: string): { from: string; to: string } => {
  const separator = key.lastIndexOf('-');
  if (separator <= 0) return { from: key, to: key };
  return { from: key.slice(0, separator), to: key.slice(separator + 1) };
};

const variantScore = (variant: FirefoxModelVariant): number => {
  const architecture = variant.architecture ?? '';
  const status = (variant.releaseStatus ?? '').toLowerCase();
  let score = 0;
  if (architecture === 'base-memory') score += 100;
  else if (architecture === 'tiny') score += 80;
  else if (architecture === 'base') score += 40;
  if (status.includes('android')) score += 10;
  else if (status.includes('release')) score += 5;
  return score;
};

const pickVariant = (variants: readonly FirefoxModelVariant[]): FirefoxModelVariant | null => {
  if (variants.length === 0) return null;
  return [...variants].sort((left, right) => variantScore(right) - variantScore(left))[0];
};

const gunzipIfNeeded = async (buffer: ArrayBuffer, path: string): Promise<ArrayBuffer> => {
  if (!path.endsWith('.gz')) return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).arrayBuffer();
};

const fetchCachedBuffer = async (url: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
  const cache = typeof caches === 'undefined' ? null : await caches.open(MODEL_CACHE_NAME);
  const cached = cache ? await cache.match(url) : undefined;
  if (cached?.ok) return cached.arrayBuffer();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(new DOMException('Bergamot model download timed out', 'TimeoutError')),
    DOWNLOAD_TIMEOUT_MS
  );
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });
  if (signal?.aborted) forwardAbort();
  try {
    const response = await fetch(url, { credentials: 'omit', signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Could not download Bergamot model (${response.status}).`);
    }
    const clone = response.clone();
    const buffer = await response.arrayBuffer();
    void cache?.put(url, clone).catch(() => undefined);
    return buffer;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }
};

class FirefoxBergamotBacking extends TranslatorBacking {
  constructor() {
    super({
      pivotLanguage: 'en',
      downloadTimeout: DOWNLOAD_TIMEOUT_MS,
      cacheSize: 256,
    });
  }

  public async loadWorker(): Promise<{
    worker: Worker;
    exports: Record<string, (...args: unknown[]) => Promise<unknown>>;
  }> {
    const worker = new Worker(WORKER_URL);
    let serial = 0;
    const pending = new Map<number, {
      accept: (value: unknown) => void;
      reject: (error: Error) => void;
    }>();
    const call = (name: string, ...args: unknown[]) => new Promise((accept, reject) => {
      const id = ++serial;
      pending.set(id, { accept, reject });
      worker.postMessage({ id, name, args });
    });

    worker.addEventListener('message', (event: MessageEvent) => {
      const { id, result, error } = event.data as {
        id?: number;
        result?: unknown;
        error?: { message?: string; stack?: string };
      };
      if (typeof id !== 'number' || !pending.has(id)) return;
      const request = pending.get(id);
      pending.delete(id);
      if (!request) return;
      if (error) {
        request.reject(Object.assign(new Error(error.message ?? 'Bergamot worker error'), error));
        return;
      }
      request.accept(result);
    });
    worker.addEventListener('error', (event) => {
      this.onerror(event.error instanceof Error ? event.error : new Error(event.message));
    });
    await call('initialize', this.options);
    return {
      worker,
      exports: new Proxy({}, {
        get(_target, name) {
          if (name === 'then') return undefined;
          return (...args: unknown[]) => call(String(name), ...args);
        },
      }) as Record<string, (...args: unknown[]) => Promise<unknown>>,
    };
  }

  public async loadModelRegistery(): Promise<BergamotRegistryEntry[]> {
    const response = await fetch(MODELS_JSON_URL, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Could not load Bergamot model registry (${response.status}).`);
    }
    const index = await response.json() as FirefoxModelsIndex;
    const entries: BergamotRegistryEntry[] = [];
    for (const [pairKey, variants] of Object.entries(index.models ?? {})) {
      const variant = pickVariant(variants);
      if (!variant) continue;
      const { from, to } = splitPairKey(pairKey);
      entries.push({ from, to, variant, baseUrl: MODELS_BASE_URL });
    }
    return entries;
  }

  public async loadTranslationModel(
    { from, to }: { from: string; to: string },
    options?: { signal?: AbortSignal }
  ): Promise<{
    model: ArrayBuffer;
    shortlist: ArrayBuffer;
    vocabs: ArrayBuffer[];
    qualityModel?: ArrayBuffer;
    config: Record<string, unknown>;
  }> {
    const entries = await this.registry as BergamotRegistryEntry[];
    const entry = entries.find((model) => model.from === from && model.to === to);
    if (!entry) throw new Error(`No Bergamot model for ${from} → ${to}.`);
    const files = entry.variant.files;
    const modelPath = files.model?.path;
    const shortlistPath = files.lexicalShortlist?.path;
    if (!modelPath || !shortlistPath) {
      throw new Error(`Bergamot model files are incomplete for ${from} → ${to}.`);
    }

    const loadFile = async (path: string): Promise<ArrayBuffer> => {
      const buffer = await fetchCachedBuffer(`${entry.baseUrl}/${path}`, options?.signal);
      return gunzipIfNeeded(buffer, path);
    };

    const model = await loadFile(modelPath);
    const shortlist = await loadFile(shortlistPath);
    const vocabs: ArrayBuffer[] = [];
    if (files.vocab?.path) vocabs.push(await loadFile(files.vocab.path));
    else if (files.srcVocab?.path && files.trgVocab?.path) {
      vocabs.push(await loadFile(files.srcVocab.path), await loadFile(files.trgVocab.path));
    } else {
      throw new Error(`Bergamot vocabulary files are missing for ${from} → ${to}.`);
    }

    const config: Record<string, unknown> = {};
    if (modelPath.includes('intgemm8.bin') && !modelPath.includes('intgemm.alphas')) {
      config['gemm-precision'] = 'int8shiftAll';
    }
    return { model, shortlist, vocabs, config };
  }
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer = 0;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
};

export class BergamotTranslator {
  private static translatorPromise: Promise<LatencyOptimisedTranslator> | null = null;

  public static isSupported(): boolean {
    return typeof Worker === 'function'
      && typeof WebAssembly === 'object'
      && typeof DecompressionStream === 'function';
  }

  public static async prepare(sourceLanguageCode: string, targetLanguageCode: string): Promise<void> {
    if (!this.isSupported()) return;
    const translator = await this.getTranslator();
    const backing = (translator as LatencyOptimisedTranslator & { backing: TranslatorBacking }).backing;
    const from = toBergamotLanguage(sourceLanguageCode);
    const to = toBergamotLanguage(targetLanguageCode);
    const models = await backing.getModels({ from, to });
    await Promise.all(models.map((model) => backing.getTranslationModel(model)));
  }

  public static async translate(
    text: string,
    sourceLanguageCode: string,
    targetLanguageCode: string
  ): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('This browser cannot run on-device Bergamot translation.');
    }
    const translator = await this.getTranslator();
    try {
      const response = await withTimeout(
        translator.translate({
          from: toBergamotLanguage(sourceLanguageCode),
          to: toBergamotLanguage(targetLanguageCode),
          text,
          html: false,
        }),
        TRANSLATE_TIMEOUT_MS,
        'Bergamot translation timed out. Try again, or use Gemini or Azure.'
      );
      const translated = response.target?.text?.trim() ?? '';
      if (!translated) throw new Error('Bergamot returned an empty translation.');
      return translated;
    } catch (error) {
      await this.resetTranslator();
      throw error;
    }
  }

  private static async getTranslator(): Promise<LatencyOptimisedTranslator> {
    if (!this.translatorPromise) {
      this.translatorPromise = Promise.resolve(
        new LatencyOptimisedTranslator(
          { cacheSize: 256, downloadTimeout: DOWNLOAD_TIMEOUT_MS, pivotLanguage: 'en' },
          new FirefoxBergamotBacking()
        )
      );
    }
    return this.translatorPromise;
  }

  private static async resetTranslator(): Promise<void> {
    const pending = this.translatorPromise;
    this.translatorPromise = null;
    if (!pending) return;
    try {
      const translator = await pending;
      await translator.delete();
    } catch {
      // The worker may already be dead after a timed-out CJK model load.
    }
  }
}
