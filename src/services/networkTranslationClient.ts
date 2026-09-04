type Engine = 'gemini' | 'azure';

interface NetworkRequest {
  engine: Engine;
  text: string;
  sourceLang?: string;
  targetLang?: string;
  sourceCode?: string;
  targetCode?: string;
  apiKey: string;
  region?: string;
  onChunk?: (chunk: string, accumulated: string) => void;
  signal?: AbortSignal;
}

interface WorkerDone {
  id: string;
  type: 'done';
  translatedText: string;
  engine: Engine;
}

interface WorkerChunk {
  id: string;
  type: 'chunk';
  chunk: string;
  accumulated: string;
}

interface WorkerError {
  id: string;
  type: 'error';
  message: string;
  allowFallback: boolean;
}

type WorkerEvent = WorkerDone | WorkerChunk | WorkerError;

interface PendingCall {
  resolve: (text: string) => void;
  reject: (error: Error & { allowFallback?: boolean }) => void;
  onChunk?: (chunk: string, accumulated: string) => void;
}

let worker: Worker | null = null;
let workerFailed = false;
const pending = new Map<string, PendingCall>();
let nextId = 0;

const createId = (): string => {
  nextId += 1;
  return `net-${nextId}`;
};

const translationError = (message: string, allowFallback = true): Error & { allowFallback?: boolean } => {
  const error = new Error(message) as Error & { allowFallback?: boolean };
  error.allowFallback = allowFallback;
  error.name = 'TranslationError';
  return error;
};

const ensureWorker = (): Worker | null => {
  if (workerFailed) return null;
  if (worker) return worker;
  if (typeof Worker !== 'function') {
    workerFailed = true;
    return null;
  }
  try {
    worker = new Worker(
      new URL('../workers/networkTranslation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const message = event.data;
      const call = pending.get(message.id);
      if (!call) return;
      if (message.type === 'chunk') {
        call.onChunk?.(message.chunk, message.accumulated);
        return;
      }
      pending.delete(message.id);
      if (message.type === 'done') {
        call.resolve(message.translatedText);
        return;
      }
      call.reject(translationError(message.message, message.allowFallback));
    };
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
      for (const [id, call] of pending) {
        pending.delete(id);
        call.reject(translationError('The translation worker failed.', true));
      }
    };
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
};

export const requestNetworkTranslation = (request: NetworkRequest): Promise<string> => {
  const activeWorker = ensureWorker();
  if (!activeWorker) {
    return Promise.reject(translationError('Translation worker is unavailable.', true));
  }
  const id = createId();
  return new Promise((resolve, reject) => {
    const abort = () => {
      pending.delete(id);
      request.signal?.removeEventListener('abort', abort);
      activeWorker.postMessage({ id, type: 'abort' });
      reject(request.signal?.reason instanceof Error
        ? request.signal.reason
        : new DOMException('Aborted', 'AbortError'));
    };
    if (request.signal?.aborted) {
      abort();
      return;
    }
    pending.set(id, {
      resolve: (text) => {
        request.signal?.removeEventListener('abort', abort);
        resolve(text);
      },
      reject: (error) => {
        request.signal?.removeEventListener('abort', abort);
        reject(error);
      },
      onChunk: request.onChunk,
    });
    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.engine === 'azure') {
      activeWorker.postMessage({
        id,
        type: 'azure',
        text: request.text,
        sourceCode: request.sourceCode ?? '',
        targetCode: request.targetCode ?? '',
        apiKey: request.apiKey,
        region: request.region,
      });
      return;
    }
    activeWorker.postMessage({
      id,
      type: 'gemini',
      text: request.text,
      sourceLang: request.sourceLang ?? '',
      targetLang: request.targetLang ?? '',
      apiKey: request.apiKey,
    });
  });
};

export const isNetworkTranslationWorkerAvailable = (): boolean => Boolean(ensureWorker());
