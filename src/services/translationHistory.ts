import type { TranslationCard } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { normalizePipelineTag } from './pipelinePresentation';

const DATABASE_NAME = 'likeparrot';
const DATABASE_VERSION = 1;
const STORE_NAME = 'translation_cards';
const MAX_SAVED_CARDS = 500;
let mutationQueue: Promise<void> = Promise.resolve();

interface StoredTranslationCard extends Omit<TranslationCard, 'timestamp'> {
  timestamp: number;
}

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

export const loadTranslationCards = async (): Promise<TranslationCard[]> => {
  // Reads should never overtake a save/delete/clear that was requested first.
  await mutationQueue;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    const records = await new Promise<StoredTranslationCard[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredTranslationCard[]);
      request.onerror = () => reject(request.error ?? new Error('Failed to load translation history'));
    });
    return records
      .map((record) => ({
        ...record,
        sourceLangCode: record.sourceLangCode ?? SUPPORTED_LANGUAGES.find(
          (language) => language.nativeName === record.sourceLang
        )?.code ?? 'ko',
        pipelineTag: normalizePipelineTag(record.pipelineTag),
        timestamp: new Date(record.timestamp),
      }))
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  } finally {
    database.close();
  }
};

export const saveTranslationCard = (card: TranslationCard): Promise<void> => enqueueMutation(async () => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({
      ...card,
      pipelineTag: normalizePipelineTag(card.pipelineTag),
      timestamp: card.timestamp.getTime(),
    } satisfies StoredTranslationCard);

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
});

export const deleteTranslationCard = (id: string): Promise<void> => enqueueMutation(async () => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
});

export const clearTranslationCards = (): Promise<void> => enqueueMutation(async () => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
});
