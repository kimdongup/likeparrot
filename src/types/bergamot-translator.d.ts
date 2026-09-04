declare module '@browsermt/bergamot-translator/translator.js' {
  export class TranslatorBacking {
    options: Record<string, unknown>;
    onerror: (error: Error) => void;
    registry: Promise<Array<{ from: string; to: string }>>;
    constructor(options?: Record<string, unknown>);
    loadWorker(): Promise<{
      worker: Worker;
      exports: Record<string, (...args: unknown[]) => Promise<unknown>>;
    }>;
    getModels(pair: { from: string; to: string }): Promise<Array<{ from: string; to: string }>>;
    getTranslationModel(
      pair: { from: string; to: string },
      options?: { signal?: AbortSignal }
    ): Promise<unknown>;
  }

  export class LatencyOptimisedTranslator {
    constructor(options?: Record<string, unknown>, backing?: TranslatorBacking);
    translate(request: {
      from: string;
      to: string;
      text: string;
      html?: boolean;
    }): Promise<{ target: { text: string } }>;
    delete(): Promise<void>;
  }

  export class CancelledError extends Error {}
  export class SupersededError extends Error {}
}
