import { createHash } from 'node:crypto';

const SUPPORTED_LANGUAGES = new Set([
  'ko', 'en', 'ja', 'zh', 'zh-TW', 'es', 'fr', 'de', 'vi',
]);

const normalizeLanguage = (value) => {
  const language = typeof value === 'string' ? value.trim() : '';
  if (language.toLowerCase() === 'zh-tw' || language.toLowerCase() === 'zh-hant') return 'zh-TW';
  return language.split('-')[0].toLowerCase();
};

const getHeader = (headers, name) => {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authorization = String(getHeader(request.headers, 'authorization') ?? '').trim();
  const apiKey = String(authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? '').trim();
  if (apiKey.length < 20 || apiKey.length > 512) {
    return response.status(400).json({ message: 'A valid OpenAI API key is required.' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return response.status(400).json({ message: 'Invalid JSON body.' });
    }
  }

  const targetLanguage = normalizeLanguage(body?.targetLanguage);
  if (!SUPPORTED_LANGUAGES.has(targetLanguage)) {
    return response.status(400).json({ message: 'Unsupported target language.' });
  }

  try {
    // The app has no account identity in BYOK mode. A one-way key fingerprint
    // gives OpenAI a stable abuse-monitoring identifier without forwarding
    // the key itself in a secondary header or exposing it in logs.
    const safetyIdentifier = `likeparrot_${createHash('sha256')
      .update(apiKey)
      .digest('hex')
      .slice(0, 32)}`;
    const upstream = await fetch(
      'https://api.openai.com/v1/realtime/translations/client_secrets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': safetyIdentifier,
        },
        body: JSON.stringify({
          expires_after: { anchor: 'created_at', seconds: 60 },
          session: {
            model: 'gpt-realtime-translate',
            audio: {
              input: {
                transcription: { model: 'gpt-realtime-whisper' },
                noise_reduction: { type: 'near_field' },
              },
              output: { language: targetLanguage },
            },
          },
        }),
      }
    );
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const upstreamMessage = typeof payload?.error?.message === 'string'
        ? payload.error.message.slice(0, 300)
        : 'OpenAI rejected the session request.';
      return response.status(upstream.status).json({ message: upstreamMessage });
    }
    if (typeof payload?.value !== 'string' || payload.value.length < 10) {
      return response.status(502).json({ message: 'OpenAI returned an invalid client secret.' });
    }
    return response.status(200).json({
      value: payload.value,
      expiresAt: payload.expires_at,
    });
  } catch {
    return response.status(502).json({ message: 'Could not reach OpenAI.' });
  }
}
