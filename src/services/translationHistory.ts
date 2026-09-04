import type { TranslationCard, TranslationStatus } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { normalizePipelineTag } from './pipelinePresentation';

const DATABASE_NAME = 'likeparrot';
const DATABASE_VERSION = 1;
const STORE_NAME = 'translation_cards';
const MAX_SAVED_CARDS = 500;
const SAVE_FLUSH_MS = 200;
let mutationQueue: Promise<void> = Promise.resolve();
const pendingPuts = new Map<string, TranslationCard>();
let saveFlushTimer: number | null = null;

interface StoredTranslationCard extends Omit<TranslationCard, 'timestamp' | 'translationStatus'> {
  timestamp: number;
  // Kept unknown so malformed or legacy IndexedDB data is normalized safely.
  translationStatus?: unknown;
}

const normalizeStoredStatus = (
  status: unknown
): { status: TranslationStatus; wasInterrupted: boolean } => {
  if (status === 'pending') return { status: 'failed', wasInterrupted: true };
  if (status === 'failed') return { status, wasInterrupted: false };
  // Records saved before status tracking (and malformed status values) already
  // represent completed translations in the legacy schema.
  return { status: 'complete', wasInterrupted: false };
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open translation history'));
  });

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('History transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('History transaction aborted'));
  });

const enqueueMutation = <T>(mutation: () => Promise<T>): Promise<T> => {
  const operation = mutationQueue.then(mutation, mutation);
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
};

const toStoredCard = (card: TranslationCard): StoredTranslationCard => ({
  ...card,
  pipelineTag: normalizePipelineTag(card.pipelineTag),
  timestamp: card.timestamp.getTime(),
});

const writeCards = async (cards: readonly TranslationCard[]): Promise<void> => {
  if (cards.length === 0) return;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    for (const card of cards) store.put(toStoredCard(card));
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      let excess = countRequest.result - MAX_SAVED_CARDS;
      if (excess <= 0) return;
      const cursorRequest = store.index('timestamp').openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || excess <= 0) return;
        cursor.delete();
        excess -= 1;
        cursor.continue();
      };
    };
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const flushTranslationCardSaves = (): Promise<void> => {
  if (saveFlushTimer !== null) {
    window.clearTimeout(saveFlushTimer);
    saveFlushTimer = null;
  }
  if (pendingPuts.size === 0) return mutationQueue;
  const batch = [...pendingPuts.values()];
  pendingPuts.clear();
  return enqueueMutation(() => writeCards(batch));
};

const scheduleSaveFlush = () => {
  if (saveFlushTimer !== null) return;
  saveFlushTimer = window.setTimeout(() => {
    saveFlushTimer = null;
    void flushTranslationCardSaves();
  }, SAVE_FLUSH_MS);
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushTranslationCardSaves();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushTranslationCardSaves();
  });
}

export const loadTranslationCards = async (): Promise<TranslationCard[]> => {
  // Reads should never overtake a save/delete/clear that was requested first.
  await flushTranslationCardSaves();
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    const records = await new Promise<StoredTranslationCard[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredTranslationCard[]);
      request.onerror = () => reject(request.error ?? new Error('Failed to load translation history'));
    });
    return records
      .map((record): TranslationCard => {
        const normalizedStatus = normalizeStoredStatus(record.translationStatus);
        return {
          ...record,
          sourceLangCode: record.sourceLangCode ?? SUPPORTED_LANGUAGES.find(
            (language) => language.nativeName === record.sourceLang
          )?.code ?? 'ko',
          pipelineTag: normalizePipelineTag(record.pipelineTag),
          timestamp: new Date(record.timestamp),
          translationStatus: normalizedStatus.status,
          translationFailureReason: normalizedStatus.wasInterrupted
            ? 'interrupted'
            : record.translationFailureReason,
          translationFailureDetail: normalizedStatus.wasInterrupted
            ? undefined
            : record.translationFailureDetail,
          isPlaying: false,
        };
      })
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  } finally {
    database.close();
  }
};

export const saveTranslationCard = (card: TranslationCard): Promise<void> => {
  pendingPuts.set(card.id, card);
  scheduleSaveFlush();
  return mutationQueue;
};

export const deleteTranslationCard = async (id: string): Promise<void> => {
  pendingPuts.delete(id);
  await flushTranslationCardSaves();
  return enqueueMutation(async () => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      await waitForTransaction(transaction);
    } finally {
      database.close();
    }
  });
};

export const clearTranslationCards = (): Promise<void> => {
  pendingPuts.clear();
  if (saveFlushTimer !== null) {
    window.clearTimeout(saveFlushTimer);
    saveFlushTimer = null;
  }
  return enqueueMutation(async () => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      await waitForTransaction(transaction);
    } finally {
      database.close();
    }
  });
};
