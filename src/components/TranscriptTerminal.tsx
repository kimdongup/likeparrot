import {
  Check,
  Copy,
  Play,
  Square,
  Terminal,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { getLocalizedLanguageNameByCode } from '../constants/languages';
import { getUiStrings, type UiStrings } from '../constants/translations';
import { normalizePipelineTag } from '../services/pipelinePresentation';
import type { TranslationCard } from '../types';

export interface TranscriptTerminalProps {
  cards: TranslationCard[];
  playingCardId: string | null;
  onPlayCard: (card: TranslationCard) => void;
  onStopCard: () => void;
  onDeleteCard: (id: string) => void;
  onClearAll: () => void;
  interimText: string;
  isTranslating: boolean;
  streamingTranslation?: string;
  sourceLangCode?: string;
  targetLangCode?: string;
}

const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Local files and embedded browsers may expose Clipboard but reject it.
    }
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard API is unavailable.');
};

interface TranscriptRowProps {
  card: TranslationCard;
  index: number;
  isPlaying: boolean;
  onPlayCard: (card: TranslationCard) => void;
  onStopCard: () => void;
  onDeleteCard: (id: string) => void;
  strings: UiStrings;
}

const TranscriptRow = memo(function TranscriptRow({
  card,
  index,
  isPlaying,
  onPlayCard,
  onStopCard,
  onDeleteCard,
  strings: t,
}: TranscriptRowProps) {
  // null follows transient hover/focus; true/false is an explicit tap state.
  const [selected, setSelected] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimerRef = useRef<number | null>(null);
  const rowRef = useRef<HTMLElement | null>(null);
  const isExpanded = isPlaying || selected === true || (
    selected === null && (hovered || focused)
  );
  const detailId = `transcript-detail-${card.id.replace(/[^a-zA-Z0-9_-]/gu, '-')}`;
  const sourceTranscriptUnavailable = card.sourceTextUnavailable ||
    !card.sourceText.trim() ||
    card.sourceText === '(Source transcript unavailable)' ||
    card.sourceText === '(원문 전사 없음)';
  const translationStatus = card.translationStatus ?? 'complete';
  const hasCompletedTranslation = translationStatus === 'complete' &&
    card.translatedText.trim().length > 0;
  const translationStateText = translationStatus === 'pending'
    ? t.transcript.translationPending
    : translationStatus === 'failed' && card.translationFailureReason === 'interrupted'
      ? t.transcript.translationInterrupted
      : t.transcript.translationFailed;
  const sourceLanguageName = getLocalizedLanguageNameByCode(card.sourceLangCode, t.locale);
  const targetLanguageName = getLocalizedLanguageNameByCode(card.targetLangCode, t.locale);
  const normalizedPipelineTag = normalizePipelineTag(card.pipelineTag);
  const pipelineTag = normalizedPipelineTag?.includes('Chrome built-in Translator')
    ? t.pipeline.chromeTranslator
    : normalizedPipelineTag?.includes('Network translation fallback')
      ? t.pipeline.networkFallback
      : normalizedPipelineTag?.includes('Gemini 3.5 Flash-Lite')
        ? t.pipeline.geminiStream
        : normalizedPipelineTag;

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  const handleBlur = (event: ReactFocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
      setSelected((current) => current === false ? null : current);
    }
  };

  const handleToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail > 0) {
      // Pointer focus fires before click. Toggle the explicit tap state so the
      // focus-induced preview cannot immediately close the first pointer tap.
      setSelected((current) => current === true ? false : true);
    } else {
      // Keyboard activation happens after focus has already expanded the row.
      setSelected(!isExpanded);
    }
    window.requestAnimationFrame(() => {
      rowRef.current?.scrollIntoView({ block: 'nearest' });
    });
  };

  const handleCopy = async () => {
    if (!hasCompletedTranslation) return;
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    try {
      await copyText(card.translatedText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyTimerRef.current = null;
    }, 1800);
  };

  return (
    <li>
      <article
        ref={rowRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setSelected((current) => current === false ? null : current);
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={handleBlur}
        className={`border-b px-2 py-3 transition-colors last:border-b-0 sm:px-3 ${
          isPlaying
            ? 'border-emerald-500/40 bg-emerald-500/[0.06] [[data-theme=light]_&]:border-emerald-500/40 [[data-theme=light]_&]:bg-emerald-50'
            : 'border-slate-900 hover:bg-slate-900/45 focus-within:bg-slate-900/45 [[data-theme=light]_&]:border-slate-100 [[data-theme=light]_&]:hover:bg-slate-50 [[data-theme=light]_&]:focus-within:bg-slate-50'
        }`}
      >
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={detailId}
          onClick={handleToggle}
          className="block w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400"
        >
          <span className="sr-only" lang={t.locale}>
            {isExpanded ? t.transcript.hideDetails : t.transcript.showDetails}
          </span>
          <span className="flex items-start gap-2 text-[13px] leading-6 text-slate-400 sm:text-sm [[data-theme=light]_&]:text-slate-600">
            <span className="w-10 shrink-0 select-none text-right text-slate-600 [[data-theme=light]_&]:text-slate-400" aria-hidden="true">
              {String(index + 1).padStart(3, '0')} &lt;
            </span>
            <span
              className="min-w-0 whitespace-pre-wrap break-words"
              lang={sourceTranscriptUnavailable ? t.locale : card.sourceLangCode}
            >
              {sourceTranscriptUnavailable ? t.transcript.sourceUnavailable : card.sourceText}
            </span>
          </span>
          <span className={`mt-0.5 flex items-start gap-2 text-[15px] font-semibold leading-7 sm:text-base ${
            hasCompletedTranslation
              ? 'text-slate-100 [[data-theme=light]_&]:text-slate-900'
              : translationStatus === 'pending'
                ? 'text-amber-300 [[data-theme=light]_&]:text-amber-700'
                : 'text-rose-300 [[data-theme=light]_&]:text-rose-700'
          }`}>
            <span className="w-10 shrink-0 select-none text-right text-indigo-400" aria-hidden="true">&gt;</span>
            <span
              className="min-w-0 whitespace-pre-wrap break-words"
              lang={hasCompletedTranslation ? card.targetLangCode : t.locale}
              role={hasCompletedTranslation ? undefined : 'status'}
            >
              {hasCompletedTranslation ? card.translatedText : translationStateText}
              {translationStatus === 'pending' && (
                <span
                  className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-current motion-safe:animate-pulse"
                  aria-hidden="true"
                />
              )}
            </span>
            {isPlaying && hasCompletedTranslation && (
              <Volume2 className="mt-1.5 h-4 w-4 shrink-0 text-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
            )}
          </span>
        </button>

        <div
          id={detailId}
          hidden={!isExpanded}
          className="ml-0 mt-2 flex flex-col gap-2 border-l border-slate-700 pl-3 text-[11px] text-slate-400 sm:ml-12 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:text-slate-600"
        >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <span lang={t.locale}>{sourceLanguageName}</span>
                {' → '}
                <span lang={t.locale}>{targetLanguageName}</span>
              </span>
              <time dateTime={card.timestamp.toISOString()}>
                {card.timestamp.toLocaleString(t.locale)}
              </time>
              {pipelineTag && (
                <span className="break-all text-emerald-400/80 [[data-theme=light]_&]:text-emerald-700">
                  {pipelineTag}
                </span>
              )}
              {card.latencyMs !== undefined && card.latencyMs > 0 && (
                <span>{card.latencyMs}ms</span>
              )}
            </div>

            <div className="flex items-center gap-1" lang={t.locale}>
              <button
                type="button"
                disabled={!hasCompletedTranslation}
                onClick={() => {
                  if (!hasCompletedTranslation) return;
                  if (isPlaying) onStopCard();
                  else onPlayCard(card);
                }}
                aria-label={hasCompletedTranslation
                  ? isPlaying ? t.transcript.stopSpeech : t.transcript.readAloud
                  : t.transcript.translationActionsUnavailable}
                title={hasCompletedTranslation
                  ? isPlaying ? t.transcript.stopSpeech : t.transcript.readAloud
                  : t.transcript.translationActionsUnavailable}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  !hasCompletedTranslation
                    ? 'cursor-not-allowed text-slate-600 opacity-50 [[data-theme=light]_&]:text-slate-400'
                    : isPlaying
                    ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 focus-visible:outline-rose-400 [[data-theme=light]_&]:text-rose-700'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-indigo-300 focus-visible:outline-indigo-400 [[data-theme=light]_&]:text-slate-700 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-indigo-700'
                }`}
              >
                {isPlaying
                  ? <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  : <Play className="h-4 w-4 fill-current" aria-hidden="true" />}
              </button>
              <button
                type="button"
                disabled={!hasCompletedTranslation}
                onClick={() => void handleCopy()}
                aria-label={hasCompletedTranslation
                  ? t.transcript.copyTranslation
                  : t.transcript.translationActionsUnavailable}
                title={hasCompletedTranslation
                  ? t.transcript.copyTranslation
                  : t.transcript.translationActionsUnavailable}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                  hasCompletedTranslation
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 [[data-theme=light]_&]:text-slate-600 [[data-theme=light]_&]:hover:bg-slate-100 [[data-theme=light]_&]:hover:text-slate-950'
                    : 'cursor-not-allowed text-slate-600 opacity-50 [[data-theme=light]_&]:text-slate-400'
                }`}
              >
                {copyState === 'copied'
                  ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => onDeleteCard(card.id)}
                aria-label={t.transcript.deleteEntry}
                title={t.transcript.deleteEntry}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 [[data-theme=light]_&]:text-slate-600 [[data-theme=light]_&]:hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <span className="sr-only" role="status" aria-live="polite">
              {copyState === 'copied' ? t.transcript.copied : ''}
              {copyState === 'failed' ? t.transcript.copyFailed : ''}
            </span>
        </div>
      </article>
    </li>
  );
});

interface TranscriptHistoryProps {
  cards: TranslationCard[];
  playingCardId: string | null;
  onPlayCard: (card: TranslationCard) => void;
  onStopCard: () => void;
  onDeleteCard: (id: string) => void;
  strings: UiStrings;
}

const TranscriptHistory = memo(function TranscriptHistory({
  cards,
  playingCardId,
  onPlayCard,
  onStopCard,
  onDeleteCard,
  strings,
}: TranscriptHistoryProps) {
  const orderedCards = useMemo(() => [...cards].reverse(), [cards]);
  return (
    <ol className="m-0 list-none p-0">
      {orderedCards.map((card, index) => (
        <TranscriptRow
          key={card.id}
          card={card}
          index={index}
          isPlaying={playingCardId === card.id}
          onPlayCard={onPlayCard}
          onStopCard={onStopCard}
          onDeleteCard={onDeleteCard}
          strings={strings}
        />
      ))}
    </ol>
  );
});

export function TranscriptTerminal({
  cards,
  playingCardId,
  onPlayCard,
  onStopCard,
  onDeleteCard,
  onClearAll,
  interimText,
  isTranslating,
  streamingTranslation = '',
  sourceLangCode = 'ko',
  targetLangCode = 'en',
}: TranscriptTerminalProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const actionsRef = useRef({ onPlayCard, onStopCard, onDeleteCard });
  const latestCardId = cards[0]?.id ?? '';
  const t = getUiStrings(sourceLangCode);

  useEffect(() => {
    actionsRef.current = { onPlayCard, onStopCard, onDeleteCard };
  }, [onDeleteCard, onPlayCard, onStopCard]);

  const stablePlayCard = useCallback(
    (card: TranslationCard) => actionsRef.current.onPlayCard(card),
    []
  );
  const stableStopCard = useCallback(() => actionsRef.current.onStopCard(), []);
  const stableDeleteCard = useCallback(
    (id: string) => actionsRef.current.onDeleteCard(id),
    []
  );

  useEffect(() => {
    if (!shouldStickToBottomRef.current || scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const terminal = terminalRef.current;
      if (terminal && shouldStickToBottomRef.current) {
        terminal.scrollTop = terminal.scrollHeight;
      }
    });
  }, [cards.length, latestCardId, interimText, streamingTranslation]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const handleTerminalScroll = () => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const distanceFromBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  return (
    <section lang={t.locale} aria-labelledby="transcript-heading" className="transcript-terminal min-w-0 font-mono">
      <header className="mb-2 flex min-h-11 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <h2 id="transcript-heading" className="truncate text-sm font-semibold text-slate-200 [[data-theme=light]_&]:text-slate-800">
            {t.transcript.title}
          </h2>
          <span className="shrink-0 text-xs text-slate-400 [[data-theme=light]_&]:text-slate-600" aria-label={`${cards.length} ${t.transcript.entries}`}>
            [{cards.length}]
          </span>
        </div>

        {cards.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`${t.transcript.clearAll}?`)) onClearAll();
            }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-xs text-slate-400 transition-colors hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 [[data-theme=light]_&]:text-slate-600 [[data-theme=light]_&]:hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.transcript.clearAll}</span>
          </button>
        )}
      </header>

      <div
        ref={terminalRef}
        onScroll={handleTerminalScroll}
        className="max-h-[58dvh] min-h-48 overflow-y-auto overscroll-contain border-y border-slate-800 bg-slate-950 px-1 py-2 shadow-inner sm:max-h-[64dvh] sm:px-3 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:bg-white"
        role="log"
        aria-live="off"
        aria-label={t.transcript.title}
      >
        {cards.length === 0 && !interimText && !isTranslating && !streamingTranslation && (
          <div className="flex min-h-44 items-center px-2 text-sm text-slate-400 [[data-theme=light]_&]:text-slate-600">
            <p>
              <span className="select-none text-emerald-500" aria-hidden="true">$ </span>
              {t.transcript.empty}. {t.transcript.emptyHint}
              <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-slate-600 motion-safe:animate-pulse [[data-theme=light]_&]:bg-slate-400" aria-hidden="true" />
            </p>
          </div>
        )}

        <TranscriptHistory
          cards={cards}
          playingCardId={playingCardId}
          onPlayCard={stablePlayCard}
          onStopCard={stableStopCard}
          onDeleteCard={stableDeleteCard}
          strings={t}
        />

        <span className="sr-only" role="status" aria-live="polite">
          {isTranslating || streamingTranslation
            ? t.transcript.streaming
            : interimText
              ? t.transcript.interim
              : ''}
        </span>

        {(interimText || isTranslating || streamingTranslation) && (
          <div
            className="border-t border-dashed border-indigo-500/30 px-2 py-3 sm:px-3 [[data-theme=light]_&]:border-indigo-300"
          >
            {interimText && (
              <p className="flex items-start gap-2 text-[13px] leading-6 text-slate-400 sm:text-sm [[data-theme=light]_&]:text-slate-600">
                <span className="w-10 shrink-0 select-none text-right text-amber-400" aria-hidden="true">… &lt;</span>
                <span className="min-w-0 whitespace-pre-wrap break-words" lang={sourceLangCode}>{interimText}</span>
              </p>
            )}
            {(streamingTranslation || isTranslating) && (
              <p className="mt-0.5 flex items-start gap-2 text-[15px] font-semibold leading-7 text-indigo-100 sm:text-base [[data-theme=light]_&]:text-indigo-900">
                <span className="w-10 shrink-0 select-none text-right text-indigo-400" aria-hidden="true">… &gt;</span>
                <span className="min-w-0 whitespace-pre-wrap break-words" lang={targetLangCode}>
                  {streamingTranslation || t.transcript.streaming}
                  <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-indigo-400 motion-safe:animate-pulse" aria-hidden="true" />
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
