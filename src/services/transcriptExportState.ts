import type { TranslationCard } from '../types';

export const isCardTranslationPending = (card: TranslationCard): boolean =>
  (card.translationStatus ?? 'complete') === 'pending';

export const isTranscriptExportReady = ({
  cards,
  isListening,
  isConnecting,
  isTranslating,
}: {
  cards: readonly TranslationCard[];
  isListening: boolean;
  isConnecting: boolean;
  isTranslating: boolean;
}): boolean => {
  if (cards.length === 0) return false;
  if (isListening || isConnecting || isTranslating) return false;
  return !cards.some(isCardTranslationPending);
};
