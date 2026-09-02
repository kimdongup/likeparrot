import type { TranslationCard } from '../types';
import { getEnglishLanguageNameByCode } from '../constants/languages';
import { normalizePipelineTag } from './pipelinePresentation';

export interface TranscriptExportOptions {
  title?: string;
  fileName?: string;
  locale?: string;
}

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeLanguageCode = (value: string | undefined): string => {
  const code = value?.trim() ?? '';
  return /^[a-zA-Z0-9]{1,8}(?:-[a-zA-Z0-9]{1,8}){0,3}$/u.test(code) ? code : 'und';
};

const safeDate = (value: Date): Date => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const formatDate = (date: Date, locale?: string): string => {
  try {
    return date.toLocaleString(locale ?? 'en-US');
  } catch {
    return date.toLocaleString('en-US');
  }
};

const makeDefaultFileName = (): string => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `likeparrot-transcript-${stamp}.html`;
};

const normalizeFileName = (fileName?: string): string => {
  const cleanName = (fileName ?? makeDefaultFileName())
    .split('')
    .map((character) => (
      character.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(character) ? '-' : character
    ))
    .join('')
    .replace(/^\.+/u, '')
    .trim()
    .slice(0, 160);
  const usableName = cleanName || makeDefaultFileName();
  return usableName.toLowerCase().endsWith('.html') ? usableName : `${usableName}.html`;
};

const renderEntry = (card: TranslationCard, index: number, locale?: string): string => {
  const timestamp = safeDate(card.timestamp);
  const sourceLanguageCode = safeLanguageCode(card.sourceLangCode);
  const targetLanguageCode = safeLanguageCode(card.targetLangCode);
  const sourceTranscriptUnavailable = card.sourceText === '(Source transcript unavailable)' ||
    card.sourceText === '(원문 전사 없음)';
  const sourceTextLanguage = sourceTranscriptUnavailable ? 'en' : sourceLanguageCode;
  const sourceText = sourceTranscriptUnavailable
    ? '(Source transcript unavailable)'
    : card.sourceText;
  const sourceLanguageName = getEnglishLanguageNameByCode(sourceLanguageCode);
  const targetLanguageName = getEnglishLanguageNameByCode(targetLanguageCode);
  const sequence = String(index + 1).padStart(3, '0');
  const latency = card.latencyMs !== undefined && card.latencyMs > 0
    ? `<span>${Math.round(card.latencyMs)}ms</span>`
    : '';
  const pipelineTag = normalizePipelineTag(card.pipelineTag);
  const pipeline = pipelineTag
    ? `<span class="pipeline">${escapeHtml(pipelineTag)}</span>`
    : '';

  return `
        <li>
          <article class="entry" data-expanded="false">
            <button class="entry__source" type="button" data-action="toggle" aria-expanded="false">
              <span class="prompt" aria-hidden="true">${sequence} &lt;</span>
              <span lang="${sourceTextLanguage}">${escapeHtml(sourceText)}</span>
            </button>
            <button class="entry__translation" type="button" data-action="speak" aria-label="Read translation aloud: ${escapeHtml(card.translatedText)}">
              <span class="prompt prompt--translation" aria-hidden="true">&gt;</span>
              <span data-translation lang="${targetLanguageCode}">${escapeHtml(card.translatedText)}</span>
              <span class="speaking-mark" aria-hidden="true">◉</span>
            </button>
            <div class="entry__details">
              <div class="metadata">
                <span>${escapeHtml(sourceLanguageName)} → ${escapeHtml(targetLanguageName)}</span>
                <time datetime="${escapeHtml(timestamp.toISOString())}">${escapeHtml(formatDate(timestamp, locale))}</time>
                ${pipeline}
                ${latency}
              </div>
              <div class="actions" lang="en">
                <button type="button" data-action="speak" aria-label="Read translation aloud">Read</button>
                <button type="button" data-action="stop" aria-label="Stop speech">Stop</button>
                <button type="button" data-action="copy" aria-label="Copy translation">Copy</button>
              </div>
            </div>
          </article>
        </li>`;
};

export function buildTranscriptHtml(
  cards: TranslationCard[],
  options: TranscriptExportOptions = {}
): string {
  const title = options.title?.trim() || 'LikeParrot Translation Transcript';
  const entries = [...cards]
    .reverse()
    .map((card, index) => renderEntry(card, index, options.locale))
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #fafafa;
      --fg: #172033;
      --muted: #64748b;
      --faint: #cbd5e1;
      --line: #e2e8f0;
      --hover: #f1f5f9;
      --accent: #4f46e5;
      --playing: #059669;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #020617;
        --fg: #e2e8f0;
        --muted: #94a3b8;
        --faint: #475569;
        --line: #172033;
        --hover: #0f172a;
        --accent: #818cf8;
        --playing: #34d399;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg);
      color: var(--fg);
      overflow-wrap: anywhere;
    }
    main { width: min(100%, 62rem); margin: 0 auto; padding: max(1rem, env(safe-area-inset-top)) max(.75rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(.75rem, env(safe-area-inset-left)); }
    header { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .5rem .25rem 1rem; }
    h1 { margin: 0; font: 700 clamp(1rem, 3vw, 1.25rem)/1.3 inherit; }
    header span { color: var(--muted); font-size: .75rem; }
    ol { margin: 0; padding: 0; list-style: none; border-block: 1px solid var(--line); }
    .entry { padding: .9rem .5rem; border-bottom: 1px solid var(--line); transition: background-color 120ms ease; }
    li:last-child .entry { border-bottom: 0; }
    .entry[data-expanded="true"] { background: var(--hover); }
    button { font: inherit; }
    .entry__source, .entry__translation {
      display: grid;
      grid-template-columns: 3.2rem minmax(0, 1fr) auto;
      width: 100%;
      border: 0;
      min-height: 2.75rem;
      padding: .35rem 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      white-space: pre-wrap;
      line-height: 1.65;
    }
    .entry__source { color: var(--muted); font-size: .82rem; }
    .entry__translation { margin-top: .15rem; color: var(--fg); font-size: 1rem; font-weight: 700; }
    .prompt { padding-right: .75rem; color: var(--faint); text-align: right; user-select: none; }
    .prompt--translation { color: var(--accent); }
    .speaking-mark { display: none; margin-left: .6rem; color: var(--playing); }
    .entry[data-speaking="true"] .speaking-mark { display: inline; animation: pulse 1s ease-in-out infinite; }
    .entry__details {
      display: flex;
      visibility: hidden;
      max-height: 0;
      margin-left: 3.2rem;
      opacity: 0;
      overflow: hidden;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      transition: opacity 120ms ease, max-height 120ms ease, margin-top 120ms ease;
    }
    .entry[data-expanded="true"] .entry__details {
      visibility: visible;
      max-height: 10rem;
      margin-top: .55rem;
      opacity: 1;
      overflow: visible;
    }
    @media (hover: hover) {
      .entry:hover { background: var(--hover); }
      .entry:hover .entry__details {
        visibility: visible;
        max-height: 10rem;
        margin-top: .55rem;
        opacity: 1;
        overflow: visible;
      }
    }
    .metadata { display: flex; flex-wrap: wrap; gap: .35rem .85rem; color: var(--muted); font-size: .69rem; }
    .pipeline { color: var(--playing); }
    .actions { display: flex; flex-shrink: 0; gap: .25rem; }
    .actions button {
      min-width: 2.75rem;
      min-height: 2.75rem;
      border: 1px solid var(--line);
      border-radius: .4rem;
      padding: .35rem .55rem;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
    }
    .actions button:hover, .actions button:focus-visible { border-color: var(--accent); color: var(--fg); }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    #status { position: fixed; left: 50%; bottom: max(1rem, env(safe-area-inset-bottom)); z-index: 2; translate: -50% 0; border-radius: .4rem; padding: .5rem .75rem; background: var(--fg); color: var(--bg); font-size: .75rem; opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
    #status[data-visible="true"] { opacity: 1; }
    .empty { border-block: 1px solid var(--line); padding: 3rem .5rem; color: var(--muted); }
    @keyframes pulse { 50% { opacity: .3; } }
    @media (max-width: 40rem) {
      .entry { padding-inline: .25rem; }
      .entry__source, .entry__translation { grid-template-columns: 2.6rem minmax(0, 1fr) auto; }
      .entry__details { margin-left: 2.6rem; flex-direction: column; align-items: stretch; }
      .actions { justify-content: flex-end; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
    @media print {
      .actions, #status { display: none !important; }
      .entry__details { visibility: visible; max-height: none; margin-top: .4rem; opacity: 1; overflow: visible; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <span>${cards.length} ${cards.length === 1 ? 'entry' : 'entries'}</span>
    </header>
    ${entries ? `<ol>${entries}\n      </ol>` : '<p class="empty">$ No saved translation transcript.</p>'}
  </main>
  <div id="status" role="status" aria-live="polite"></div>
  <script>
    (() => {
      'use strict';
      const status = document.getElementById('status');
      let statusTimer = 0;
      let speakingEntry = null;
      let speechTimer = 0;
      let speechWatchdogTimer = 0;
      let speechGeneration = 0;

      const showStatus = (message) => {
        window.clearTimeout(statusTimer);
        status.textContent = message;
        status.dataset.visible = 'true';
        statusTimer = window.setTimeout(() => { status.dataset.visible = 'false'; }, 1600);
      };

      const setExpanded = (entry, expanded) => {
        entry.dataset.expanded = String(expanded);
        const toggle = entry.querySelector('[data-action="toggle"]');
        if (toggle) toggle.setAttribute('aria-expanded', String(expanded));
        if (expanded) {
          window.requestAnimationFrame(() => entry.scrollIntoView({ block: 'nearest' }));
        }
      };

      const stopSpeech = () => {
        speechGeneration += 1;
        window.clearTimeout(speechTimer);
        window.clearTimeout(speechWatchdogTimer);
        speechTimer = 0;
        speechWatchdogTimer = 0;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (speakingEntry) speakingEntry.dataset.speaking = 'false';
        speakingEntry = null;
      };

      const speak = (entry) => {
        const translation = entry.querySelector('[data-translation]');
        const text = translation ? translation.textContent.trim() : '';
        if (!text || !('speechSynthesis' in window)) {
          showStatus('This browser does not support text-to-speech.');
          return;
        }
        const needsCancel = Boolean(
          speechTimer ||
          speakingEntry ||
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending
        );
        if (needsCancel) stopSpeech();
        else speechGeneration += 1;
        const generation = speechGeneration;
        setExpanded(entry, true);
        const startSpeech = () => {
          speechTimer = 0;
          if (generation !== speechGeneration) return;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = translation.getAttribute('lang') || 'und';
          let finished = false;
          const finish = (error) => {
            if (finished || generation !== speechGeneration) return;
            finished = true;
            window.clearTimeout(speechWatchdogTimer);
            speechWatchdogTimer = 0;
            entry.dataset.speaking = 'false';
            if (speakingEntry === entry) speakingEntry = null;
            if (error && error !== 'canceled' && error !== 'interrupted') {
              showStatus('Speech playback failed. Check your device TTS settings.');
            }
          };
          utterance.onstart = () => {
            if (generation !== speechGeneration) return;
            speakingEntry = entry;
            entry.dataset.speaking = 'true';
            showStatus('Reading the translation aloud.');
          };
          utterance.onend = () => finish();
          utterance.onerror = (event) => finish(event.error || 'unknown');
          speechWatchdogTimer = window.setTimeout(() => {
            if (generation !== speechGeneration) return;
            window.speechSynthesis.cancel();
            finish('timeout');
          }, Math.min(180000, Math.max(10000, text.length * 300 + 5000)));
          window.speechSynthesis.speak(utterance);
        };
        // Chromium can drop an utterance queued in the same task as cancel().
        if (needsCancel) speechTimer = window.setTimeout(startSpeech, 50);
        else startSpeech();
      };

      const copy = async (entry) => {
        const translation = entry.querySelector('[data-translation]');
        const text = translation ? translation.textContent : '';
        try {
          let copied = false;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
              await navigator.clipboard.writeText(text);
              copied = true;
            } catch {
              // file:// pages commonly expose Clipboard but reject writes.
            }
          }
          if (!copied) {
            const field = document.createElement('textarea');
            field.value = text;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            copied = document.execCommand('copy');
            field.remove();
            if (!copied) throw new Error('copy failed');
          }
          showStatus('Translation copied.');
        } catch {
          showStatus('Could not copy the translation.');
        }
      };

      document.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const entry = button.closest('.entry');
        if (!entry) return;
        const action = button.dataset.action;
        if (action === 'toggle') setExpanded(entry, entry.dataset.expanded !== 'true');
        if (action === 'speak') speak(entry);
        if (action === 'stop') stopSpeech();
        if (action === 'copy') void copy(entry);
      });

      window.addEventListener('pagehide', stopSpeech);
    })();
  </script>
</body>
</html>`;
}

export function downloadTranscriptHtml(
  cards: TranslationCard[],
  options: TranscriptExportOptions = {}
): void {
  const html = buildTranscriptHtml(cards, options);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = normalizeFileName(options.fileName);
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
