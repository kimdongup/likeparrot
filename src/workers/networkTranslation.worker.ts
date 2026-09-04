/// <reference lib="webworker" />

const FAST_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_REQUEST_TIMEOUT_MS = 10_000;
const AZURE_REQUEST_TIMEOUT_MS = 8_000;

type WorkerRequest =
  | {
    id: string;
    type: 'gemini';
    text: string;
    sourceLang: string;
    targetLang: string;
    apiKey: string;
  }
  | {
    id: string;
    type: 'azure';
    text: string;
    sourceCode: string;
    targetCode: string;
    apiKey: string;
    region?: string;
  }
  | { id: string; type: 'abort' };

type WorkerResponse =
  | { id: string; type: 'chunk'; chunk: string; accumulated: string }
  | { id: string; type: 'done'; translatedText: string; engine: 'gemini' | 'azure' }
  | { id: string; type: 'error'; message: string; allowFallback: boolean };

const inflight = new Map<string, AbortController>();

const post = (message: WorkerResponse) => {
  self.postMessage(message);
};

const fail = (id: string, message: string, allowFallback = true) => {
  inflight.delete(id);
  post({ id, type: 'error', message, allowFallback });
};

const translateAzure = async (request: Extract<WorkerRequest, { type: 'azure' }>) => {
  const controller = new AbortController();
  inflight.set(request.id, controller);
  const timeout = self.setTimeout(
    () => controller.abort(new DOMException('Azure request timed out', 'TimeoutError')),
    AZURE_REQUEST_TIMEOUT_MS
  );
  try {
    const query = new URLSearchParams({
      from: request.sourceCode,
      to: request.targetCode,
    });
    if (request.region?.trim()) query.set('region', request.region.trim());
    const response = await fetch(`/api/azure-translate?${query.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify([{ Text: request.text }]),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof payload?.message === 'string' ? `: ${payload.message}` : '';
      fail(request.id, `Azure Translator request failed (${response.status})${detail}`);
      return;
    }
    const translatedText = typeof payload?.translatedText === 'string'
      ? payload.translatedText.trim()
      : '';
    if (!translatedText) {
      fail(request.id, 'Azure Translator returned no translation.');
      return;
    }
    inflight.delete(request.id);
    post({ id: request.id, type: 'done', translatedText, engine: 'azure' });
  } catch (error) {
    if (controller.signal.aborted) {
      fail(request.id, 'The Azure Translator request timed out.');
      return;
    }
    fail(request.id, error instanceof Error ? error.message : 'Azure Translator failed.');
  } finally {
    self.clearTimeout(timeout);
  }
};

const translateGemini = async (request: Extract<WorkerRequest, { type: 'gemini' }>) => {
  const controller = new AbortController();
  inflight.set(request.id, controller);
  let timedOut = false;
  const timeout = self.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Gemini request timed out', 'TimeoutError'));
  }, GEMINI_REQUEST_TIMEOUT_MS);
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${FAST_GEMINI_MODEL}` +
      ':streamGenerateContent?alt=sse';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': request.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text:
                `Translate spoken ${request.sourceLang} directly into natural, conversational ${request.targetLang}. ` +
                'Return only the translation with no notes, labels, quotation marks, or explanation.',
            },
          ],
        },
        contents: [{ parts: [{ text: request.text }] }],
        generationConfig: {
          maxOutputTokens: 512,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    });
    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error?.message ? `: ${body.error.message}` : '';
      } catch {
        /* keep the status code only */
      }
      fail(request.id, `Gemini translation request failed (${response.status})${detail}`);
      return;
    }
    if (!response.body) {
      fail(request.id, 'The Gemini streaming response has no body.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let accumulated = '';
    let finishReason: string | null = null;

    const handleEventLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;
      const payload = trimmed.slice(5).trimStart();
      if (!payload || payload === '[DONE]') return;
      try {
        const data = JSON.parse(payload);
        const candidate = data?.candidates?.[0];
        if (typeof candidate?.finishReason === 'string') finishReason = candidate.finishReason;
        const parts = candidate?.content?.parts;
        if (!Array.isArray(parts)) return;
        const textPart = parts
          .map((part: { text?: string; thought?: boolean }) => (part.thought ? '' : part.text ?? ''))
          .join('');
        if (!textPart) return;
        accumulated += textPart;
        post({ id: request.id, type: 'chunk', chunk: textPart, accumulated });
      } catch {
        /* ignore a malformed SSE event and keep reading */
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split(/\r?\n/u);
      sseBuffer = lines.pop() ?? '';
      for (const line of lines) handleEventLine(line);
    }
    sseBuffer += decoder.decode();
    if (sseBuffer.trim()) handleEventLine(sseBuffer);
    reader.releaseLock();

    if (finishReason !== 'STOP') {
      fail(
        request.id,
        `Gemini translation did not complete normally (${finishReason ?? 'response ended early'}). Please speak again.`,
        !accumulated.trim()
      );
      return;
    }
    const translatedText = accumulated.trim();
    if (!translatedText) {
      fail(request.id, 'Gemini returned no translation.', true);
      return;
    }
    inflight.delete(request.id);
    post({ id: request.id, type: 'done', translatedText, engine: 'gemini' });
  } catch (error) {
    if (timedOut) {
      fail(request.id, 'The Gemini translation request timed out.');
      return;
    }
    fail(request.id, error instanceof Error ? error.message : 'Gemini translation failed.');
  } finally {
    self.clearTimeout(timeout);
  }
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message?.id) return;
  if (message.type === 'abort') {
    inflight.get(message.id)?.abort();
    inflight.delete(message.id);
    return;
  }
  if (message.type === 'azure') {
    void translateAzure(message);
    return;
  }
  if (message.type === 'gemini') {
    void translateGemini(message);
  }
};
