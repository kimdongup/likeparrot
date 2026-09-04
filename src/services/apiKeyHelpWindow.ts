const HELP_WINDOW_NAME = 'likeparrot-api-help';

export interface ApiKeyHelpDocument {
  title: string;
  steps: readonly string[];
  createKeyLabel: string;
  createKeyUrl: string;
  notices: readonly string[];
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** Opens (or reuses) a small window with key-issuance steps. Returns false if blocked. */
export function openApiKeyHelpWindow(documentCopy: ApiKeyHelpDocument): boolean {
  const helpWindow = window.open(
    '',
    HELP_WINDOW_NAME,
    'popup=yes,width=520,height=680,noopener=no'
  );
  if (!helpWindow) return false;

  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const steps = documentCopy.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('');
  const notices = documentCopy.notices
    .filter((notice) => notice.trim())
    .map((notice) => `<p class="notice">${escapeHtml(notice)}</p>`)
    .join('');

  helpWindow.document.open();
  helpWindow.document.write(`<!doctype html>
<html lang="${escapeHtml(document.documentElement.lang || 'en')}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(documentCopy.title)}</title>
  <style>
    :root { color-scheme: ${light ? 'light' : 'dark'}; }
    body {
      margin: 0;
      padding: 1.25rem 1.35rem 1.5rem;
      font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${light ? '#f8fafc' : '#0f172a'};
      color: ${light ? '#0f172a' : '#e2e8f0'};
    }
    h1 { font-size: 1.15rem; margin: 0 0 0.85rem; }
    ol { margin: 0; padding-left: 1.2rem; }
    li { margin: 0.4rem 0; }
    a {
      display: inline-flex;
      margin-top: 1rem;
      color: ${light ? '#3730a3' : '#a5b4fc'};
      font-weight: 650;
    }
    .notice {
      margin: 1rem 0 0;
      padding: 0.7rem 0.8rem;
      border-radius: 0.7rem;
      background: ${light ? '#fff7ed' : '#1c1917'};
      color: ${light ? '#9a3412' : '#fdba74'};
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(documentCopy.title)}</h1>
  <ol>${steps}</ol>
  <a href="${escapeHtml(documentCopy.createKeyUrl)}" target="_blank" rel="noreferrer">
    ${escapeHtml(documentCopy.createKeyLabel)}
  </a>
  ${notices}
</body>
</html>`);
  helpWindow.document.close();
  helpWindow.focus();
  return true;
}
