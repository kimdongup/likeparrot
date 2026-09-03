export const PRICING_LAST_VERIFIED = '2026-09-01';

export const VOICE_PRICING = {
  geminiLive: {
    modelId: 'gemini-3.5-live-translate-preview',
    inputAudioUsdPerMillionTokens: 3.5,
    outputAudioUsdPerMillionTokens: 21,
    audioTokensPerSecond: 25,
  },
  openAiRealtimeTranslate: {
    modelId: 'gpt-realtime-translate',
    translationAudioUsdPerMinute: 0.034,
    optionalInputTranscriptionModelId: 'gpt-realtime-whisper',
    optionalInputTranscriptionUsdPerMinute: 0.017,
  },
  googleCloudPipeline: {
    speechToTextV2UsdPerMinute: 0.016,
    flashLiteModelId: 'gemini-3.5-flash-lite',
    flashLiteTextInputUsdPerMillionTokens: 0.3,
    flashLiteTextOutputUsdPerMillionTokens: 2.5,
    flashLiteTranslationUsdPerInputHourLow: 0.03,
    flashLiteTranslationUsdPerInputHourHigh: 0.06,
  },
} as const;

export const PRICING_SOURCES = {
  geminiPricing: 'https://ai.google.dev/gemini-api/docs/pricing',
  geminiModel: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.5-live-translate-preview',
  googleSttPricing: 'https://cloud.google.com/speech-to-text/pricing',
  googleSttQuotas: 'https://cloud.google.com/speech-to-text/quotas',
  googleTtsPricing: 'https://cloud.google.com/text-to-speech/pricing',
  googleBudgets: 'https://cloud.google.com/billing/docs/how-to/budgets',
  googleSpendCaps: 'https://cloud.google.com/billing/docs/how-to/budgets-spend-caps',
  googleApiKeySecurity: 'https://cloud.google.com/docs/authentication/api-keys-best-practices',
  openAiTranslate: 'https://developers.openai.com/api/docs/models/gpt-realtime-translate',
  openAiTranscribe: 'https://developers.openai.com/api/docs/models/gpt-realtime-whisper',
  openAiRealtime21: 'https://developers.openai.com/api/docs/models/gpt-realtime-2.1',
  openAiRealtime21Mini: 'https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini',
  openAiRealtimeCosts: 'https://developers.openai.com/api/docs/guides/realtime-costs',
  openAiChatGptApiBilling: 'https://help.openai.com/en/articles/9039756',
  openAiWebRtc: 'https://developers.openai.com/api/docs/guides/realtime-webrtc',
  openAiProjectControls: 'https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects',
  assemblyAi: 'https://www.assemblyai.com/pricing',
  deepgram: 'https://deepgram.com/pricing',
  gladia: 'https://www.gladia.io/pricing',
  azureSpeech: 'https://azure.microsoft.com/pricing/details/ai-services/speech-services/',
  amazonTranscribe: 'https://aws.amazon.com/transcribe/pricing/',
  amazonPolly: 'https://aws.amazon.com/polly/pricing/',
  elevenLabs: 'https://elevenlabs.io/pricing/api',
  chromeTranslator: 'https://developer.chrome.com/docs/ai/translator-api',
  webSpeech: 'https://developer.mozilla.org/docs/Web/API/Web_Speech_API',
  whisperCpp: 'https://github.com/ggml-org/whisper.cpp',
  piper: 'https://github.com/OHF-Voice/piper1-gpl',
} as const;

export type BillingLocale = 'ko' | 'en' | 'ja' | 'zh-TW' | 'zh' | 'es' | 'fr' | 'de' | 'vi';

export const BILLING_LOCALE_TAGS: Record<BillingLocale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  'zh-TW': 'zh-TW',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  vi: 'vi-VN',
};

export const resolveBillingLocale = (languageCode: string): BillingLocale => {
  const normalized = languageCode.trim().replaceAll('_', '-').toLowerCase();

  if (
    normalized === 'zh-tw'
    || normalized.startsWith('zh-tw-')
    || normalized === 'zh-hant'
    || normalized.startsWith('zh-hant-')
  ) {
    return 'zh-TW';
  }
  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh';
  }
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('vi')) return 'vi';
  return 'en';
};

export interface LocalizedText {
  ko: string;
  en: string;
  ja: string;
  'zh-TW': string;
  zh: string;
  es: string;
  fr: string;
  de: string;
  vi: string;
}

export interface AlternativeProvider {
  id: string;
  name: string;
  role: LocalizedText;
  price: LocalizedText;
  free: LocalizedText;
  caveat: LocalizedText;
  sourceUrl: string;
}

export const VOICE_ALTERNATIVES: readonly AlternativeProvider[] = [
  {
    id: 'assemblyai',
    name: 'AssemblyAI',
    role: {
      ko: '실시간 STT',
      en: 'Streaming STT',
      ja: 'リアルタイムSTT',
      'zh-TW': '即時串流 STT',
      zh: '实时流式 STT',
      es: 'STT en tiempo real',
      fr: 'STT en temps réel',
      de: 'Echtzeit-STT',
      vi: 'STT theo thời gian thực',
    },
    price: {
      ko: '앱 전체 언어를 지원하는 Whisper Streaming $0.30/연결 시간; 6개 언어 Universal은 $0.15/시간',
      en: 'Whisper Streaming $0.30/connection hour for the app’s full language set; 6-language Universal is $0.15/hour',
      ja: 'アプリの全言語に対応するWhisper Streamingは接続1時間あたり$0.30、6言語対応Universalは$0.15/時間',
      'zh-TW': '支援本應用程式完整語言組合的 Whisper Streaming 為每連線小時 $0.30；支援 6 種語言的 Universal 為 $0.15/小時',
      zh: '支持本应用完整语言集合的 Whisper Streaming 为每连接小时 $0.30；支持 6 种语言的 Universal 为 $0.15/小时',
      es: 'Whisper Streaming cuesta $0.30/hora de conexión para todos los idiomas de la app; Universal, con 6 idiomas, cuesta $0.15/hora',
      fr: 'Whisper Streaming coûte $0.30/heure de connexion pour toutes les langues de l’application ; Universal, limité à 6 langues, coûte $0.15/heure',
      de: 'Whisper Streaming kostet für alle App-Sprachen $0.30 pro Verbindungsstunde; Universal mit 6 Sprachen kostet $0.15/Stunde',
      vi: 'Whisper Streaming hỗ trợ toàn bộ ngôn ngữ của ứng dụng có giá $0.30/giờ kết nối; Universal hỗ trợ 6 ngôn ngữ có giá $0.15/giờ',
    },
    free: {
      ko: '공식 Free tier는 streaming 최대 333시간 표기(Whisper 적용량은 계정에서 확인)',
      en: 'The official Free tier lists up to 333 streaming hours (verify the Whisper allowance in-account)',
      ja: '公式Free tierはストリーミング最大333時間と記載（Whisperの適用枠はアカウントで要確認）',
      'zh-TW': '官方 Free tier 標示最多 333 小時串流（Whisper 適用額度請在帳戶內確認）',
      zh: '官方 Free tier 标示最多 333 小时流式处理（Whisper 适用额度请在账户内确认）',
      es: 'El nivel Free oficial indica hasta 333 horas de streaming (confirma en la cuenta la cantidad aplicable a Whisper)',
      fr: 'L’offre Free officielle indique jusqu’à 333 heures de streaming (vérifiez dans le compte le quota applicable à Whisper)',
      de: 'Der offizielle Free-Tarif nennt bis zu 333 Streaming-Stunden (Whisper-Kontingent im Konto prüfen)',
      vi: 'Gói Free chính thức ghi tối đa 333 giờ truyền phát (hãy kiểm tra hạn mức Whisper trong tài khoản)',
    },
    caveat: {
      ko: '번역과 TTS는 별도이고 소켓이 열린 전체 시간이 과금됩니다. 한국어에는 $0.15 모델을 가정하면 안 됩니다.',
      en: 'Translation and TTS are separate and the full open-session duration is billed. Do not assume the $0.15 model for Korean.',
      ja: '翻訳とTTSは別料金で、ソケットが開いている全時間が課金対象です。韓国語に$0.15モデルを適用できるとは想定しないでください。',
      'zh-TW': '翻譯與 TTS 另計，且 WebSocket 開啟的整段時間都會計費。韓文不可假設能使用 $0.15 的模型。',
      zh: '翻译和 TTS 另行计费，且 WebSocket 开启的整段时间都会计费。韩语不可假设能使用 $0.15 的模型。',
      es: 'La traducción y el TTS se cobran aparte y se factura toda la sesión con el socket abierto. No supongas que el modelo de $0.15 admite coreano.',
      fr: 'La traduction et le TTS sont facturés séparément, et toute la durée d’ouverture du socket est comptée. Ne supposez pas que le modèle à $0.15 prend en charge le coréen.',
      de: 'Übersetzung und TTS werden separat berechnet; die gesamte offene Socket-Zeit ist kostenpflichtig. Für Koreanisch darf das $0.15-Modell nicht vorausgesetzt werden.',
      vi: 'Dịch thuật và TTS được tính riêng, đồng thời toàn bộ thời gian socket mở đều bị tính phí. Không nên giả định mô hình $0.15 hỗ trợ tiếng Hàn.',
    },
    sourceUrl: PRICING_SOURCES.assemblyAi,
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    role: {
      ko: '실시간 STT + TTS 구성요소',
      en: 'Streaming STT + TTS components',
      ja: 'リアルタイムSTT + TTSコンポーネント',
      'zh-TW': '即時串流 STT + TTS 元件',
      zh: '实时流式 STT + TTS 组件',
      es: 'Componentes de STT en tiempo real + TTS',
      fr: 'Composants STT en temps réel + TTS',
      de: 'Echtzeit-STT- und TTS-Komponenten',
      vi: 'Thành phần STT theo thời gian thực + TTS',
    },
    price: {
      ko: 'Nova-3 Multilingual 실시간 프로모션 $0.0058/분; 표시 정상가 $0.0092/분',
      en: 'Nova-3 Multilingual streaming promo $0.0058/min; displayed regular rate $0.0092/min',
      ja: 'Nova-3 Multilingualリアルタイムのプロモ価格は$0.0058/分、表示通常価格は$0.0092/分',
      'zh-TW': 'Nova-3 Multilingual 即時串流促銷價 $0.0058/分鐘；標示原價 $0.0092/分鐘',
      zh: 'Nova-3 Multilingual 实时流式促销价 $0.0058/分钟；标示原价 $0.0092/分钟',
      es: 'Promoción de streaming Nova-3 Multilingual: $0.0058/min; tarifa normal indicada: $0.0092/min',
      fr: 'Promotion streaming Nova-3 Multilingual : $0.0058/min ; tarif normal affiché : $0.0092/min',
      de: 'Nova-3-Multilingual-Streaming zum Aktionspreis von $0.0058/Min.; angezeigter regulärer Preis $0.0092/Min.',
      vi: 'Giá khuyến mãi truyền phát Nova-3 Multilingual là $0.0058/phút; giá thông thường hiển thị là $0.0092/phút',
    },
    free: {
      ko: 'Pay-as-you-go 가입 시 $200 일회성 크레딧 표기',
      en: 'A $200 one-time pay-as-you-go credit is advertised',
      ja: '従量課金登録時に$200の1回限りのクレジットを提供',
      'zh-TW': '標示隨用隨付註冊可獲得一次性 $200 額度',
      zh: '标示按量付费注册可获得一次性 $200 额度',
      es: 'Se anuncia un crédito único de $200 al registrarse en pago por uso',
      fr: 'Un crédit unique de $200 est annoncé à l’inscription au paiement à l’usage',
      de: 'Bei der Pay-as-you-go-Anmeldung wird ein einmaliges Guthaben von $200 beworben',
      vi: 'Có quảng cáo khoản tín dụng dùng một lần $200 khi đăng ký trả theo mức sử dụng',
    },
    caveat: {
      ko: '프로모션 종료일이 명시되지 않았고 번역 비용은 별도입니다. 브라우저에는 장기 키 대신 짧은 JWT를 발급해야 합니다.',
      en: 'The promotion has no listed end date and translation is separate. Mint a short JWT instead of exposing a long-lived browser key.',
      ja: 'プロモーションの終了日は記載されておらず、翻訳は別料金です。ブラウザに長期キーを公開せず、短期JWTを発行してください。',
      'zh-TW': '促銷未標示結束日期，翻譯另計。應簽發短效 JWT，避免在瀏覽器暴露長效金鑰。',
      zh: '促销未标示结束日期，翻译另行计费。应签发短期 JWT，避免在浏览器暴露长期密钥。',
      es: 'La promoción no indica fecha de finalización y la traducción se cobra aparte. Emite un JWT de corta duración en vez de exponer una clave duradera en el navegador.',
      fr: 'La promotion n’indique aucune date de fin et la traduction est séparée. Émettez un JWT de courte durée au lieu d’exposer une clé durable dans le navigateur.',
      de: 'Für die Aktion ist kein Enddatum angegeben; Übersetzung kostet extra. Statt eines langlebigen Browser-Schlüssels sollte ein kurzlebiges JWT ausgegeben werden.',
      vi: 'Khuyến mãi không nêu ngày kết thúc và dịch thuật được tính riêng. Hãy cấp JWT ngắn hạn thay vì để lộ khóa dài hạn trong trình duyệt.',
    },
    sourceUrl: PRICING_SOURCES.deepgram,
  },
  {
    id: 'gladia',
    name: 'Gladia',
    role: {
      ko: '100개 이상 언어 실시간 STT + 번역 텍스트',
      en: '100+ language live STT + translated text',
      ja: '100以上の言語に対応するリアルタイムSTT + 翻訳テキスト',
      'zh-TW': '支援 100 多種語言的即時 STT + 翻譯文字',
      zh: '支持 100 多种语言的实时 STT + 翻译文本',
      es: 'STT en vivo en más de 100 idiomas + texto traducido',
      fr: 'STT en direct dans plus de 100 langues + texte traduit',
      de: 'Live-STT in über 100 Sprachen + übersetzter Text',
      vi: 'STT trực tiếp hơn 100 ngôn ngữ + văn bản đã dịch',
    },
    price: {
      ko: 'Starter 실시간 $0.75/시간, 선결제 Growth는 $0.25/시간부터',
      en: 'Starter real-time $0.75/hour; prepaid Growth starts at $0.25/hour',
      ja: 'Starterリアルタイムは$0.75/時間、前払いGrowthは$0.25/時間から',
      'zh-TW': 'Starter 即時方案 $0.75/小時；預付 Growth 方案 $0.25/小時起',
      zh: 'Starter 实时方案 $0.75/小时；预付 Growth 方案 $0.25/小时起',
      es: 'Starter en tiempo real: $0.75/hora; Growth prepago desde $0.25/hora',
      fr: 'Starter en temps réel : $0.75/heure ; Growth prépayé à partir de $0.25/heure',
      de: 'Starter-Echtzeit $0.75/Stunde; vorausbezahltes Growth ab $0.25/Stunde',
      vi: 'Starter thời gian thực $0.75/giờ; Growth trả trước từ $0.25/giờ',
    },
    free: {
      ko: '€50 일회성 크레딧(현재 요금 기준 실시간 약 60시간 이상)',
      en: '€50 one-time credit (about 60+ real-time hours at the listed rate)',
      ja: '€50の1回限りのクレジット（表示料金でリアルタイム約60時間以上）',
      'zh-TW': '一次性 €50 額度（依標示費率約可使用 60 小時以上即時服務）',
      zh: '一次性 €50 额度（按标示费率约可使用 60 小时以上实时服务）',
      es: 'Crédito único de €50 (unas 60 horas o más en tiempo real a la tarifa indicada)',
      fr: 'Crédit unique de €50 (environ 60 heures ou plus en temps réel au tarif indiqué)',
      de: 'Einmaliges Guthaben von €50 (zum angegebenen Tarif etwa 60+ Echtzeitstunden)',
      vi: 'Tín dụng dùng một lần €50 (khoảng hơn 60 giờ thời gian thực theo mức giá niêm yết)',
    },
    caveat: {
      ko: '같은 WebSocket에서 원문·번역문을 받을 수 있지만 TTS는 별도입니다. 전송한 침묵도 과금됩니다.',
      en: 'One WebSocket can return source and translated text, but TTS is separate. Streamed silence is billable.',
      ja: '同じWebSocketで原文と翻訳文を受け取れますが、TTSは別です。送信した無音も課金対象です。',
      'zh-TW': '同一個 WebSocket 可回傳原文與譯文，但 TTS 另計。傳送的靜音也會計費。',
      zh: '同一个 WebSocket 可返回原文和译文，但 TTS 另行计费。传输的静音也会计费。',
      es: 'Un mismo WebSocket puede devolver el texto original y traducido, pero el TTS va aparte. El silencio transmitido también se factura.',
      fr: 'Un même WebSocket peut renvoyer le texte source et traduit, mais le TTS est séparé. Le silence transmis est facturé.',
      de: 'Ein WebSocket kann Ausgangs- und Übersetzungstext liefern, TTS ist jedoch separat. Übertragene Stille wird berechnet.',
      vi: 'Một WebSocket có thể trả về văn bản gốc và bản dịch, nhưng TTS được tính riêng. Khoảng lặng được truyền cũng bị tính phí.',
    },
    sourceUrl: PRICING_SOURCES.gladia,
  },
  {
    id: 'azure',
    name: 'Azure AI Speech',
    role: {
      ko: 'STT + 음성 번역 + TTS',
      en: 'STT + speech translation + TTS',
      ja: 'STT + 音声翻訳 + TTS',
      'zh-TW': 'STT + 語音翻譯 + TTS',
      zh: 'STT + 语音翻译 + TTS',
      es: 'STT + traducción de voz + TTS',
      fr: 'STT + traduction vocale + TTS',
      de: 'STT + Sprachübersetzung + TTS',
      vi: 'STT + dịch lời nói + TTS',
    },
    price: {
      ko: '지역별 종량제; East US Retail 표본 Speech Translation 약 $2.50/audio hour',
      en: 'Regional usage pricing; an East US Retail sample is about $2.50/audio hour for Speech Translation',
      ja: 'リージョン別の従量課金。East US Retailの例ではSpeech Translationが約$2.50/audio hour',
      'zh-TW': '依地區計量收費；East US Retail 範例的 Speech Translation 約為 $2.50/audio hour',
      zh: '按地区计量收费；East US Retail 示例的 Speech Translation 约为 $2.50/audio hour',
      es: 'Precio por uso según la región; una muestra de East US Retail ronda $2.50/audio hour para Speech Translation',
      fr: 'Tarification à l’usage selon la région ; un exemple East US Retail donne environ $2.50/audio hour pour Speech Translation',
      de: 'Regionale nutzungsbasierte Preise; ein East-US-Retail-Beispiel liegt für Speech Translation bei etwa $2.50/audio hour',
      vi: 'Giá theo mức sử dụng tùy khu vực; mẫu East US Retail cho Speech Translation khoảng $2.50/audio hour',
    },
    free: {
      ko: 'F0 Speech Translation 5시간/월, Neural TTS 50만 자/월(지역·계정 확인)',
      en: 'F0 includes 5 Speech Translation hours/month and 500K Neural TTS characters/month (check region/account)',
      ja: 'F0はSpeech Translationを月5時間、Neural TTSを月50万文字含む（リージョンとアカウントを確認）',
      'zh-TW': 'F0 每月含 5 小時 Speech Translation 與 50 萬字元 Neural TTS（請確認地區與帳戶）',
      zh: 'F0 每月含 5 小时 Speech Translation 和 50 万字符 Neural TTS（请确认地区与账户）',
      es: 'F0 incluye 5 horas/mes de Speech Translation y 500 mil caracteres/mes de Neural TTS (confirma la región y la cuenta)',
      fr: 'F0 inclut 5 heures/mois de Speech Translation et 500 000 caractères/mois de Neural TTS (vérifiez la région et le compte)',
      de: 'F0 umfasst 5 Stunden Speech Translation und 500.000 Neural-TTS-Zeichen pro Monat (Region/Konto prüfen)',
      vi: 'F0 gồm 5 giờ Speech Translation/tháng và 500 nghìn ký tự Neural TTS/tháng (kiểm tra khu vực/tài khoản)',
    },
    caveat: {
      ko: 'STT·번역·TTS가 별도 SKU일 수 있어 한 단계 가격만 비교하면 실제 비용을 과소평가합니다.',
      en: 'STT, translation, and TTS can be separate SKUs, so comparing one stage understates total cost.',
      ja: 'STT・翻訳・TTSが別SKUの場合があるため、1段階だけの価格比較では総費用を過小評価します。',
      'zh-TW': 'STT、翻譯與 TTS 可能是不同 SKU，只比較單一階段會低估總成本。',
      zh: 'STT、翻译和 TTS 可能是不同 SKU，只比较单一阶段会低估总成本。',
      es: 'STT, traducción y TTS pueden ser SKU distintos; comparar una sola etapa subestima el coste total.',
      fr: 'Le STT, la traduction et le TTS peuvent relever de SKU distincts ; comparer une seule étape sous-estime le coût total.',
      de: 'STT, Übersetzung und TTS können separate SKUs sein; der Vergleich nur einer Stufe unterschätzt die Gesamtkosten.',
      vi: 'STT, dịch thuật và TTS có thể là các SKU riêng, nên chỉ so sánh một bước sẽ đánh giá thấp tổng chi phí.',
    },
    sourceUrl: PRICING_SOURCES.azureSpeech,
  },
  {
    id: 'aws',
    name: 'AWS Transcribe + Polly',
    role: {
      ko: 'STT + TTS 파이프라인',
      en: 'STT + TTS pipeline',
      ja: 'STT + TTSパイプライン',
      'zh-TW': 'STT + TTS 管線',
      zh: 'STT + TTS 流水线',
      es: 'Canalización STT + TTS',
      fr: 'Pipeline STT + TTS',
      de: 'STT- und TTS-Pipeline',
      vi: 'Quy trình STT + TTS',
    },
    price: {
      ko: 'Transcribe Streaming 예시 $0.01/분 + Translate $15/백만 자; Polly Standard $4/M, Neural $16/M',
      en: 'Transcribe Streaming example $0.01/min + Translate $15/M characters; Polly Standard $4/M, Neural $16/M',
      ja: 'Transcribe Streamingの例は$0.01/分 + Translate $15/100万文字、Polly Standard $4/M、Neural $16/M',
      'zh-TW': 'Transcribe Streaming 範例 $0.01/分鐘 + Translate $15/百萬字元；Polly Standard $4/M、Neural $16/M',
      zh: 'Transcribe Streaming 示例 $0.01/分钟 + Translate $15/百万字符；Polly Standard $4/M、Neural $16/M',
      es: 'Ejemplo de Transcribe Streaming: $0.01/min + Translate $15/M de caracteres; Polly Standard $4/M, Neural $16/M',
      fr: 'Exemple Transcribe Streaming : $0.01/min + Translate $15/M de caractères ; Polly Standard $4/M, Neural $16/M',
      de: 'Transcribe-Streaming-Beispiel $0.01/Min. + Translate $15/M Zeichen; Polly Standard $4/M, Neural $16/M',
      vi: 'Ví dụ Transcribe Streaming $0.01/phút + Translate $15/M ký tự; Polly Standard $4/M, Neural $16/M',
    },
    free: {
      ko: 'Transcribe 월 60분(첫 12개월); Polly 무료량/신규 크레딧은 계정 생성 시점 정책 적용',
      en: 'Transcribe 60 min/month for 12 months; Polly allowances/credits follow the account-start policy',
      ja: 'Transcribeは最初の12か月間、月60分。Pollyの無料枠・新規クレジットはアカウント作成時の方針に従う',
      'zh-TW': 'Transcribe 前 12 個月每月 60 分鐘；Polly 免費額度／新戶額度依帳戶建立時的政策',
      zh: 'Transcribe 前 12 个月每月 60 分钟；Polly 免费额度/新用户额度按账户创建时的政策',
      es: 'Transcribe ofrece 60 min/mes durante 12 meses; las cuotas/créditos de Polly dependen de la política vigente al crear la cuenta',
      fr: 'Transcribe offre 60 min/mois pendant 12 mois ; les quotas/crédits Polly dépendent de la politique en vigueur à la création du compte',
      de: 'Transcribe: 60 Min./Monat in den ersten 12 Monaten; Polly-Kontingente/-Guthaben richten sich nach der Richtlinie bei Kontoeröffnung',
      vi: 'Transcribe 60 phút/tháng trong 12 tháng đầu; hạn mức/tín dụng Polly theo chính sách tại thời điểm tạo tài khoản',
    },
    caveat: {
      ko: '세 서비스와 IAM 구성이 필요합니다. 기본 TTS를 쓰면 43,000자/시간 가정에서 전체 약 $1.25/시간입니다.',
      en: 'This needs three services plus IAM. With platform TTS and 43K chars/hour, the combined estimate is about $1.25/hour.',
      ja: '3つのサービスとIAM設定が必要です。プラットフォームTTSを使い、43K文字/時間を仮定すると合計約$1.25/時間です。',
      'zh-TW': '需要三項服務及 IAM 設定。使用平台 TTS 並假設每小時 43K 字元，合計估算約 $1.25/小時。',
      zh: '需要三项服务和 IAM 配置。使用平台 TTS 并假设每小时 43K 字符，合计估算约 $1.25/小时。',
      es: 'Requiere tres servicios más IAM. Con el TTS de la plataforma y 43 mil caracteres/hora, el cálculo combinado es de unos $1.25/hora.',
      fr: 'Trois services et une configuration IAM sont nécessaires. Avec le TTS de la plateforme et 43 000 caractères/heure, l’estimation totale est d’environ $1.25/heure.',
      de: 'Erfordert drei Dienste plus IAM. Mit Plattform-TTS und 43.000 Zeichen/Stunde liegt die Gesamtschätzung bei etwa $1.25/Stunde.',
      vi: 'Cần ba dịch vụ cùng cấu hình IAM. Với TTS của nền tảng và giả định 43K ký tự/giờ, tổng ước tính khoảng $1.25/giờ.',
    },
    sourceUrl: PRICING_SOURCES.amazonTranscribe,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    role: {
      ko: '실시간 STT + 고품질 TTS',
      en: 'Real-time STT + high-quality TTS',
      ja: 'リアルタイムSTT + 高品質TTS',
      'zh-TW': '即時 STT + 高品質 TTS',
      zh: '实时 STT + 高质量 TTS',
      es: 'STT en tiempo real + TTS de alta calidad',
      fr: 'STT en temps réel + TTS haute qualité',
      de: 'Echtzeit-STT + hochwertiges TTS',
      vi: 'STT thời gian thực + TTS chất lượng cao',
    },
    price: {
      ko: 'Scribe v2 Realtime $0.39/시간; Flash/Turbo TTS $0.05/1천 자, v3 $0.10/1천 자',
      en: 'Scribe v2 Realtime $0.39/hour; Flash/Turbo TTS $0.05/1K chars, v3 $0.10/1K chars',
      ja: 'Scribe v2 Realtimeは$0.39/時間、Flash/Turbo TTSは$0.05/1K文字、v3は$0.10/1K文字',
      'zh-TW': 'Scribe v2 Realtime $0.39/小時；Flash/Turbo TTS $0.05/1K 字元，v3 $0.10/1K 字元',
      zh: 'Scribe v2 Realtime $0.39/小时；Flash/Turbo TTS $0.05/1K 字符，v3 $0.10/1K 字符',
      es: 'Scribe v2 Realtime $0.39/hora; TTS Flash/Turbo $0.05/1K caracteres, v3 $0.10/1K caracteres',
      fr: 'Scribe v2 Realtime $0.39/heure ; TTS Flash/Turbo $0.05/1K caractères, v3 $0.10/1K caractères',
      de: 'Scribe v2 Realtime $0.39/Stunde; Flash/Turbo TTS $0.05/1K Zeichen, v3 $0.10/1K Zeichen',
      vi: 'Scribe v2 Realtime $0.39/giờ; Flash/Turbo TTS $0.05/1K ký tự, v3 $0.10/1K ký tự',
    },
    free: {
      ko: 'Free 표 기준 Realtime STT 약 2시간 30분과 제한된 TTS 포함',
      en: 'The Free table lists about 2.5 hours of Realtime STT plus limited TTS',
      ja: 'Free表ではRealtime STT約2.5時間と制限付きTTSを含む',
      'zh-TW': 'Free 表格標示約 2.5 小時 Realtime STT，另含有限 TTS',
      zh: 'Free 表格标示约 2.5 小时 Realtime STT，另含有限 TTS',
      es: 'La tabla Free indica unas 2.5 horas de STT en tiempo real más TTS limitado',
      fr: 'Le tableau Free indique environ 2,5 heures de STT en temps réel et un TTS limité',
      de: 'Die Free-Tabelle nennt etwa 2,5 Stunden Realtime-STT plus begrenztes TTS',
      vi: 'Bảng Free ghi khoảng 2,5 giờ Realtime STT cùng TTS giới hạn',
    },
    caveat: {
      ko: '번역 엔진은 별도이고 구독 포함량과 초과 사용료를 함께 확인해야 합니다.',
      en: 'Translation is separate; compare subscription allowances with overage pricing.',
      ja: '翻訳エンジンは別で、サブスクリプションの含有量と超過料金を併せて確認する必要があります。',
      'zh-TW': '翻譯引擎另計；請同時比較訂閱內含額度與超額費用。',
      zh: '翻译引擎另行计费；请同时比较订阅内含额度和超额费用。',
      es: 'La traducción va aparte; compara lo incluido en la suscripción con los cargos por excedente.',
      fr: 'La traduction est séparée ; comparez les quotas inclus dans l’abonnement et les frais de dépassement.',
      de: 'Übersetzung ist separat; enthaltene Abonnementmengen und Mehrverbrauchspreise gemeinsam prüfen.',
      vi: 'Công cụ dịch được tính riêng; hãy so sánh hạn mức gói đăng ký với phí vượt mức.',
    },
    sourceUrl: PRICING_SOURCES.elevenLabs,
  },
  {
    id: 'browser',
    name: 'Browser built-ins',
    role: {
      ko: 'Web Speech + Chrome Translator + speechSynthesis',
      en: 'Web Speech + Chrome Translator + speechSynthesis',
      ja: 'Web Speech + Chrome Translator + speechSynthesis',
      'zh-TW': 'Web Speech + Chrome Translator + speechSynthesis',
      zh: 'Web Speech + Chrome Translator + speechSynthesis',
      es: 'Web Speech + Chrome Translator + speechSynthesis',
      fr: 'Web Speech + Chrome Translator + speechSynthesis',
      de: 'Web Speech + Chrome Translator + speechSynthesis',
      vi: 'Web Speech + Chrome Translator + speechSynthesis',
    },
    price: {
      ko: '직접 API 청구 $0',
      en: '$0 direct API bill',
      ja: '直接API請求は$0',
      'zh-TW': '直接 API 費用 $0',
      zh: '直接 API 费用 $0',
      es: '$0 de facturación directa de API',
      fr: '$0 de facturation API directe',
      de: '$0 direkte API-Kosten',
      vi: 'Phí API trực tiếp $0',
    },
    free: {
      ko: '현재 통합 워크플로의 브라우저 우선 경로',
      en: 'The browser-first route in the current unified workflow',
      ja: '現在の統合ワークフローのブラウザ優先経路',
      'zh-TW': '目前整合工作流程的瀏覽器優先路徑',
      zh: '当前“文字优先”模式的首选路径',
      es: 'La ruta de navegador preferida en el flujo unificado actual',
      fr: 'Le parcours navigateur privilégié du flux unifié actuel',
      de: 'Der bevorzugte Browser-Pfad im aktuellen einheitlichen Ablauf',
      vi: 'Lộ trình trình duyệt ưu tiên trong quy trình hợp nhất hiện tại',
    },
    caveat: {
      ko: 'Chrome Translator는 현재 데스크톱 중심이며 브라우저·OS·언어 지원과 모델 다운로드가 필요합니다.',
      en: 'Chrome Translator is currently desktop-focused and depends on browser, OS, language support, and a model download.',
      ja: 'Chrome Translatorは現在デスクトップ中心で、ブラウザ・OS・言語の対応とモデルのダウンロードが必要です。',
      'zh-TW': 'Chrome Translator 目前以桌面版為主，取決於瀏覽器、作業系統與語言支援，且需要下載模型。',
      zh: 'Chrome Translator 目前以桌面版为主，取决于浏览器、操作系统和语言支持，并且需要下载模型。',
      es: 'Chrome Translator se centra actualmente en escritorio y depende del navegador, el SO, la compatibilidad del idioma y la descarga de un modelo.',
      fr: 'Chrome Translator vise actuellement surtout les ordinateurs et dépend du navigateur, du système, de la langue prise en charge et du téléchargement d’un modèle.',
      de: 'Chrome Translator ist derzeit auf Desktop ausgerichtet und hängt von Browser, Betriebssystem, Sprachunterstützung und einem Modell-Download ab.',
      vi: 'Chrome Translator hiện chủ yếu dành cho máy tính và phụ thuộc vào trình duyệt, hệ điều hành, ngôn ngữ được hỗ trợ cùng việc tải mô hình.',
    },
    sourceUrl: PRICING_SOURCES.chromeTranslator,
  },
  {
    id: 'self-hosted',
    name: 'whisper.cpp + local translation + Piper',
    role: {
      ko: '자체 호스팅/기기 내 STT·번역·TTS',
      en: 'Self-hosted/on-device STT, translation, and TTS',
      ja: 'セルフホスト／端末内STT・翻訳・TTS',
      'zh-TW': '自行託管／裝置端 STT、翻譯與 TTS',
      zh: '自行托管/设备端 STT、翻译和 TTS',
      es: 'STT, traducción y TTS autohospedados o en el dispositivo',
      fr: 'STT, traduction et TTS auto-hébergés ou sur l’appareil',
      de: 'Selbst gehostete/on-device STT, Übersetzung und TTS',
      vi: 'STT, dịch và TTS tự lưu trữ/trên thiết bị',
    },
    price: {
      ko: 'API 사용료 $0; 하드웨어·전력·서버 운영비 별도',
      en: '$0 API usage; hardware, power, and operations are separate',
      ja: 'API利用料は$0、ハードウェア・電力・サーバー運用費は別途',
      'zh-TW': 'API 使用費 $0；硬體、電力與營運成本另計',
      zh: 'API 使用费 $0；硬件、电力和运营成本另计',
      es: '$0 de uso de API; hardware, energía y operación van aparte',
      fr: '$0 d’utilisation API ; matériel, électricité et exploitation en sus',
      de: '$0 API-Nutzung; Hardware, Strom und Betrieb separat',
      vi: 'Phí sử dụng API $0; phần cứng, điện và vận hành được tính riêng',
    },
    free: {
      ko: '오픈소스 모델을 내려받아 오프라인 실행 가능',
      en: 'Open-source models can run offline after download',
      ja: 'オープンソースモデルをダウンロードしてオフライン実行可能',
      'zh-TW': '下載開源模型後可離線執行',
      zh: '下载开源模型后可离线运行',
      es: 'Los modelos de código abierto pueden ejecutarse sin conexión tras descargarlos',
      fr: 'Les modèles open source peuvent fonctionner hors ligne après téléchargement',
      de: 'Open-Source-Modelle können nach dem Download offline laufen',
      vi: 'Mô hình nguồn mở có thể chạy ngoại tuyến sau khi tải xuống',
    },
    caveat: {
      ko: '모바일 PWA에 넣으면 모델 크기·발열·배터리·초기 지연과 각 모델 라이선스를 검토해야 합니다.',
      en: 'A mobile PWA must account for model size, heat, battery, startup latency, and each model license.',
      ja: 'モバイルPWAではモデル容量、発熱、バッテリー、起動遅延、各モデルのライセンスを考慮する必要があります。',
      'zh-TW': '行動 PWA 必須評估模型大小、發熱、電池、啟動延遲及各模型授權。',
      zh: '移动 PWA 必须评估模型大小、发热、电池、启动延迟和各模型许可。',
      es: 'Una PWA móvil debe contemplar el tamaño del modelo, el calor, la batería, la latencia inicial y la licencia de cada modelo.',
      fr: 'Une PWA mobile doit tenir compte de la taille des modèles, de la chauffe, de la batterie, de la latence initiale et de chaque licence.',
      de: 'Eine mobile PWA muss Modellgröße, Wärmeentwicklung, Akku, Startlatenz und jede Modelllizenz berücksichtigen.',
      vi: 'PWA di động phải tính đến kích thước mô hình, nhiệt, pin, độ trễ khởi động và giấy phép của từng mô hình.',
    },
    sourceUrl: PRICING_SOURCES.whisperCpp,
  },
] as const;

export const localized = (value: LocalizedText, locale: BillingLocale): string => value[locale];
