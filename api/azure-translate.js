const SUPPORTED_LANGUAGES = new Set([
  'ko', 'en', 'ja', 'zh', 'zh-TW', 'es', 'fr', 'de', 'vi',
]);

const normalizeLanguage = (value) => {
  const language = typeof value === 'string' ? value.trim() : '';
  const normalized = language.toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-TW';
  if (normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh';
  return language.split('-')[0].toLowerCase();
};

const toAzureLanguage = (language) => {
  if (language === 'zh-TW') return 'zh-Hant';
  if (language === 'zh') return 'zh-Hans';
  return language;
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
  if (apiKey.length < 16 || apiKey.length > 512) {
    return response.status(400).json({ message: 'A valid Azure Translator key is required.' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return response.status(400).json({ message: 'Invalid JSON body.' });
    }
  }

  const textValue = Array.isArray(body) ? body[0]?.Text ?? body[0]?.text : body?.text;
  const text = typeof textValue === 'string' ? textValue.trim() : '';
  const sourceLanguage = normalizeLanguage(request.query?.from ?? body?.sourceLanguage);
  const targetLanguage = normalizeLanguage(request.query?.to ?? body?.targetLanguage);
  const regionValue = request.query?.region ?? body?.region;
  const region = typeof regionValue === 'string' ? regionValue.trim().toLowerCase() : '';
  if (!text || text.length > 5_000) {
    return response.status(400).json({ message: 'Text must contain 1 to 5,000 characters.' });
  }
  if (!SUPPORTED_LANGUAGES.has(sourceLanguage) || !SUPPORTED_LANGUAGES.has(targetLanguage)) {
    return response.status(400).json({ message: 'Unsupported translation language.' });
  }
  if (sourceLanguage === targetLanguage) {
    return response.status(200).json({ translatedText: text });
  }
  if (region && !/^[a-z0-9-]{2,40}$/u.test(region)) {
    return response.status(400).json({ message: 'Invalid Azure resource region.' });
  }

  const url = new URL('https://api.cognitive.microsofttranslator.com/translate');
  url.searchParams.set('api-version', '3.0');
  url.searchParams.set('from', toAzureLanguage(sourceLanguage));
  url.searchParams.set('to', toAzureLanguage(targetLanguage));

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Ocp-Apim-Subscription-Key': apiKey,
  };
  if (region && region !== 'global') {
    headers['Ocp-Apim-Subscription-Region'] = region;
  }

  const upstreamController = new AbortController();
  const timeoutId = setTimeout(
    () => upstreamController.abort(new Error('Azure Translator timed out.')),
    8_000
  );
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ Text: text }]),
      signal: upstreamController.signal,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const upstreamMessage = typeof payload?.error?.message === 'string'
        ? payload.error.message.slice(0, 300)
        : 'Azure rejected the translation request.';
      return response.status(upstream.status).json({ message: upstreamMessage });
    }
    const translatedText = payload?.[0]?.translations?.[0]?.text;
    if (typeof translatedText !== 'string' || !translatedText.trim()) {
      return response.status(502).json({ message: 'Azure returned an invalid translation.' });
    }
    return response.status(200).json({ translatedText: translatedText.trim() });
  } catch {
    return response.status(502).json({ message: 'Could not reach Azure Translator.' });
  } finally {
    clearTimeout(timeoutId);
  }
}
