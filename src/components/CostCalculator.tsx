import { useId, useMemo, useState } from 'react';
import { Calculator, CircleDollarSign, Info } from 'lucide-react';
import { BILLING_LOCALE_TAGS, type BillingLocale } from '../data/voicePricing';
import {
  estimateVoiceCosts,
  isRangeEstimate,
  type CostEstimate,
  type CostEstimateId,
} from '../services/costEstimator';

interface CostCalculatorProps {
  locale: BillingLocale;
}

type NumericInputValue = number | '';

const readNumericInput = (
  value: string,
  valueAsNumber: number,
  min: number,
  max: number
): NumericInputValue =>
  value === '' || !Number.isFinite(valueAsNumber)
    ? ''
    : Math.min(max, Math.max(min, valueAsNumber));

const COPY = {
  ko: {
    eyebrow: '사용 시간별 예상 비용',
    title: 'LikeParrot 비용 계산기',
    intro: '연결 시간과 실제로 전송·재생하는 음성 비율을 바꾸면 각 경로의 예상 API 요금이 즉시 계산됩니다.',
    hours: '앱 사용 시간',
    hoursUnit: '시간',
    input: '유료 음성 엔진 사용 비율',
    inputHint: '소리먼저 엔진에 연결된 동안에는 100%로 두세요. 낮은 값은 전체 앱 사용 시간 중 엔진을 켠 비율을 가정할 때만 사용하며, OpenAI translation 세션 안의 침묵을 잘라낸다는 뜻이 아닙니다.',
    output: '번역 음성 길이',
    outputHint: '입력 음성 길이에 대한 출력 음성 길이입니다. 보통 80~120%이며 최대 200%까지 비교할 수 있습니다.',
    exchange: '원/달러 환율',
    exchangeHint: '실시간 환율이 아닙니다. 카드 해외결제 수수료와 세금은 포함하지 않습니다.',
    result: '예상 합계',
    perHour: '세션 1시간당',
    listed: '공식 단가',
    estimated: '추정 범위',
    noCharge: '직접 API 요금 없음',
    rangeJoiner: ' ~ ',
    formulas: '계산 근거 보기',
    inputAudio: '입력 음성',
    outputAudio: '출력 음성',
    translationAudio: '번역 입력 audio',
    inputTranscription: '소스 자막 전사',
    stt: 'STT',
    translation: '텍스트 번역 추정',
    browser: '브라우저 기능',
    estimateNotice: '표시 금액은 비교용입니다. 무료 크레딧, 세금, Vercel·네트워크 비용, 재시도, 지역별 단가를 제외합니다.',
    names: {
      'text-first-browser': '글먼저 · 브라우저 우선',
      'text-first-gemini': '글먼저 · Gemini 번역 fallback',
      'google-cloud-pipeline': '대안 · Google Cloud 전체 파이프라인',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Web Speech, Chrome Translator, 기본 TTS가 지원되는 환경의 직접 API 청구액입니다.',
      'text-first-gemini': '실제 글먼저 fallback입니다. 브라우저 STT·기본 TTS는 $0이고 Gemini 3.5 Flash-Lite 번역만 추정합니다.',
      'google-cloud-pipeline': '유료 STT 대안입니다. Cloud STT V2 $0.016/분 + Gemini 3.5 Flash-Lite 번역 약 $0.03~0.06/입력 음성 시간 + 브라우저 TTS $0.',
      'gemini-live-translate': '25 audio tokens/초, 입력 $3.50/M·출력 $21/M. 입력과 출력이 각각 60분이면 $2.205(표시 $2.21)입니다.',
      'openai-realtime-translate': 'LikeParrot 실제 구성입니다: 번역 audio $0.034/분 + 소스 기록용 gpt-realtime-whisper $0.017/분 = $0.051/전송 분($3.06/시간). 기록을 끄면 base $2.04/시간입니다.',
    },
  },
  en: {
    eyebrow: 'Usage-based estimate',
    title: 'LikeParrot cost calculator',
    intro: 'Change connection time and the share of audio sent and played to compare the estimated API bill for each path.',
    hours: 'App session',
    hoursUnit: 'hours',
    input: 'Paid audio-engine usage',
    inputHint: 'Use 100% while a Sound First engine is connected. Use a lower value only to model the share of total app time when the engine is on; it does not mean trimming silence inside an OpenAI translation session.',
    output: 'Translated audio duration',
    outputHint: 'Output duration relative to input speech. It is often 80–120%; the calculator permits up to 200%.',
    exchange: 'KRW per USD',
    exchangeHint: 'This is not a live FX quote. Taxes and foreign-card fees are excluded.',
    result: 'Estimated total',
    perHour: 'per session hour',
    listed: 'Listed rate',
    estimated: 'Estimated range',
    noCharge: 'No direct API charge',
    rangeJoiner: ' – ',
    formulas: 'Show calculation basis',
    inputAudio: 'Input audio',
    outputAudio: 'Output audio',
    translationAudio: 'Translation input audio',
    inputTranscription: 'Source transcription',
    stt: 'STT',
    translation: 'Estimated text translation',
    browser: 'Browser capabilities',
    estimateNotice: 'These figures are for comparison. They exclude free credits, tax, Vercel/network costs, retries, and regional pricing.',
    names: {
      'text-first-browser': 'Text First · browser-first',
      'text-first-gemini': 'Text First · Gemini translation fallback',
      'google-cloud-pipeline': 'Alternative · full Google Cloud pipeline',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Direct API bill where Web Speech, Chrome Translator, and platform TTS are supported.',
      'text-first-gemini': 'The actual Text First fallback: browser STT and platform TTS are $0; only Gemini 3.5 Flash-Lite translation is estimated.',
      'google-cloud-pipeline': 'A paid-STT alternative: Cloud STT V2 at $0.016/min + Gemini 3.5 Flash-Lite translation at roughly $0.03–$0.06/input-audio hour + browser TTS at $0.',
      'gemini-live-translate': '25 audio tokens/sec; input $3.50/M and output $21/M. Sixty minutes each of input and output costs $2.205 (shown as $2.21).',
      'openai-realtime-translate': 'LikeParrot’s actual setup: translation audio $0.034/min + gpt-realtime-whisper source recording $0.017/min = $0.051/sent min ($3.06/hour). Disable source recording for the $2.04/hour base.',
    },
  },
  ja: {
    eyebrow: '利用時間別の推定費用',
    title: 'LikeParrot料金計算機',
    intro: '接続時間と、実際に送信・再生する音声の割合を変えると、各経路の推定API料金をすぐに比較できます。',
    hours: 'アプリ利用時間',
    hoursUnit: '時間',
    input: '有料音声エンジン利用率',
    inputHint: '「音声優先」エンジンへの接続中は100%にしてください。低い値は、アプリの総利用時間のうちエンジンを有効にする割合を試算する場合だけに使います。OpenAI translationセッション内の無音を切り取るという意味ではありません。',
    output: '翻訳音声の長さ',
    outputHint: '入力音声に対する出力音声の長さです。通常は80～120%で、最大200%まで比較できます。',
    exchange: '1米ドルあたりの韓国ウォン',
    exchangeHint: 'リアルタイム為替レートではありません。税金と海外カード決済手数料は含みません。',
    result: '推定合計',
    perHour: 'セッション1時間あたり',
    listed: '公式単価',
    estimated: '推定範囲',
    noCharge: '直接API料金なし',
    rangeJoiner: ' ～ ',
    formulas: '計算根拠を表示',
    inputAudio: '入力音声',
    outputAudio: '出力音声',
    translationAudio: '翻訳用入力音声',
    inputTranscription: '原文字幕の文字起こし',
    stt: 'STT',
    translation: 'テキスト翻訳の推定',
    browser: 'ブラウザ機能',
    estimateNotice: '表示額は比較用です。無料クレジット、税金、Vercel・ネットワーク費用、再試行、地域別価格は含みません。',
    names: {
      'text-first-browser': 'テキスト優先 · ブラウザ優先',
      'text-first-gemini': 'テキスト優先 · Gemini翻訳フォールバック',
      'google-cloud-pipeline': '代替 · Google Cloud全体パイプライン',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Web Speech、Chrome Translator、端末標準TTSが利用できる環境での直接API請求額です。',
      'text-first-gemini': '実際の「テキスト優先」フォールバックです。ブラウザSTTと端末標準TTSは$0で、Gemini 3.5 Flash-Lite翻訳のみを推定します。',
      'google-cloud-pipeline': '有料STTの代替です。Cloud STT V2 $0.016/分 + Gemini 3.5 Flash-Lite翻訳 約$0.03～$0.06/入力音声時間 + ブラウザTTS $0。',
      'gemini-live-translate': '25 audio tokens/秒、入力$3.50/M・出力$21/M。入力と出力が各60分なら$2.205（表示は$2.21）です。',
      'openai-realtime-translate': 'LikeParrotの実際の構成：翻訳audio $0.034/分 + 原文記録用gpt-realtime-whisper $0.017/分 = $0.051/送信分（$3.06/時間）。原文記録を無効にした場合のみbase $2.04/時間です。',
    },
  },
  'zh-TW': {
    eyebrow: '依使用時間估算',
    title: 'LikeParrot 費用計算器',
    intro: '調整連線時間與實際傳送、播放的音訊比例，即可立即比較各路徑的預估 API 費用。',
    hours: '應用程式使用時間',
    hoursUnit: '小時',
    input: '付費語音引擎使用比例',
    inputHint: '連線至「聲音優先」引擎期間請設為 100%。較低數值只用於估算整體應用程式使用時間中啟用引擎的比例；並不表示裁切 OpenAI translation 工作階段內的靜音。',
    output: '翻譯音訊長度',
    outputHint: '輸出音訊相對於輸入語音的長度。通常為 80～120%，計算器最多可比較至 200%。',
    exchange: '每美元韓元匯率',
    exchangeHint: '這不是即時匯率。不包含稅金與海外刷卡手續費。',
    result: '預估總額',
    perHour: '每小時工作階段',
    listed: '官方單價',
    estimated: '預估範圍',
    noCharge: '無直接 API 費用',
    rangeJoiner: ' ～ ',
    formulas: '顯示計算依據',
    inputAudio: '輸入音訊',
    outputAudio: '輸出音訊',
    translationAudio: '翻譯輸入音訊',
    inputTranscription: '原文字幕轉錄',
    stt: 'STT',
    translation: '文字翻譯估算',
    browser: '瀏覽器功能',
    estimateNotice: '顯示金額僅供比較，不含免費額度、稅金、Vercel／網路費用、重試及地區定價。',
    names: {
      'text-first-browser': '文字優先 · 瀏覽器優先',
      'text-first-gemini': '文字優先 · Gemini 翻譯備援',
      'google-cloud-pipeline': '替代方案 · 完整 Google Cloud 管線',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': '支援 Web Speech、Chrome Translator 與裝置預設 TTS 時的直接 API 費用。',
      'text-first-gemini': '實際的「文字優先」備援：瀏覽器 STT 與裝置預設 TTS 為 $0，只估算 Gemini 3.5 Flash-Lite 翻譯。',
      'google-cloud-pipeline': '付費 STT 替代方案：Cloud STT V2 $0.016/分鐘 + Gemini 3.5 Flash-Lite 翻譯約 $0.03～$0.06/輸入音訊小時 + 瀏覽器 TTS $0。',
      'gemini-live-translate': '25 audio tokens/秒；輸入 $3.50/M、輸出 $21/M。輸入與輸出各 60 分鐘為 $2.205（顯示為 $2.21）。',
      'openai-realtime-translate': 'LikeParrot 實際設定：翻譯 audio $0.034/分鐘 + 原文記錄用 gpt-realtime-whisper $0.017/分鐘 = $0.051/傳送分鐘（$3.06/小時）。只有關閉原文記錄時才使用 base $2.04/小時。',
    },
  },
  zh: {
    eyebrow: '按使用时间估算',
    title: 'LikeParrot 费用计算器',
    intro: '调整连接时间以及实际传输和播放的音频比例，即可立即比较各路径的预估 API 费用。',
    hours: '应用使用时间',
    hoursUnit: '小时',
    input: '付费语音引擎使用比例',
    inputHint: '连接到“声音优先”引擎期间请设为 100%。较低数值仅用于估算整个应用使用时间中启用引擎的比例；并不表示裁切 OpenAI translation 会话内的静音。',
    output: '翻译音频时长',
    outputHint: '输出音频相对于输入语音的时长。通常为 80～120%，计算器最多可比较至 200%。',
    exchange: '每美元韩元汇率',
    exchangeHint: '这不是实时汇率。不包含税费和境外刷卡手续费。',
    result: '预估总额',
    perHour: '每小时会话',
    listed: '官方单价',
    estimated: '预估范围',
    noCharge: '无直接 API 费用',
    rangeJoiner: ' ～ ',
    formulas: '显示计算依据',
    inputAudio: '输入音频',
    outputAudio: '输出音频',
    translationAudio: '翻译输入音频',
    inputTranscription: '原文字幕转录',
    stt: 'STT',
    translation: '文本翻译估算',
    browser: '浏览器功能',
    estimateNotice: '显示金额仅供比较，不含免费额度、税费、Vercel/网络费用、重试和地区定价。',
    names: {
      'text-first-browser': '文字优先 · 浏览器优先',
      'text-first-gemini': '文字优先 · Gemini 翻译回退',
      'google-cloud-pipeline': '替代方案 · 完整 Google Cloud 流水线',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': '支持 Web Speech、Chrome Translator 和设备默认 TTS 时的直接 API 费用。',
      'text-first-gemini': '实际的“文字优先”回退：浏览器 STT 和设备默认 TTS 为 $0，只估算 Gemini 3.5 Flash-Lite 翻译。',
      'google-cloud-pipeline': '付费 STT 替代方案：Cloud STT V2 $0.016/分钟 + Gemini 3.5 Flash-Lite 翻译约 $0.03～$0.06/输入音频小时 + 浏览器 TTS $0。',
      'gemini-live-translate': '25 audio tokens/秒；输入 $3.50/M、输出 $21/M。输入和输出各 60 分钟为 $2.205（显示为 $2.21）。',
      'openai-realtime-translate': 'LikeParrot 实际配置：翻译 audio $0.034/分钟 + 原文记录用 gpt-realtime-whisper $0.017/分钟 = $0.051/传输分钟（$3.06/小时）。只有关闭原文记录时才使用 base $2.04/小时。',
    },
  },
  es: {
    eyebrow: 'Estimación según el uso',
    title: 'Calculadora de costes de LikeParrot',
    intro: 'Cambia el tiempo de conexión y la proporción de audio realmente enviado y reproducido para comparar al instante la factura API estimada de cada ruta.',
    hours: 'Uso de la aplicación',
    hoursUnit: 'horas',
    input: 'Uso del motor de voz de pago',
    inputHint: 'Usa el 100% mientras esté conectado un motor de Sonido primero. Usa un valor inferior solo para representar la proporción del tiempo total de la aplicación durante la que el motor está activo; no significa recortar el silencio dentro de una sesión de OpenAI translation.',
    output: 'Duración del audio traducido',
    outputHint: 'Duración de la salida respecto a la voz de entrada. Suele ser del 80 al 120%; la calculadora permite comparar hasta el 200%.',
    exchange: 'KRW por USD',
    exchangeHint: 'No es un tipo de cambio en tiempo real. No incluye impuestos ni comisiones de tarjetas extranjeras.',
    result: 'Total estimado',
    perHour: 'por hora de sesión',
    listed: 'Tarifa oficial',
    estimated: 'Rango estimado',
    noCharge: 'Sin coste API directo',
    rangeJoiner: ' – ',
    formulas: 'Mostrar base del cálculo',
    inputAudio: 'Audio de entrada',
    outputAudio: 'Audio de salida',
    translationAudio: 'Audio de entrada para traducción',
    inputTranscription: 'Transcripción de subtítulos fuente',
    stt: 'STT',
    translation: 'Traducción de texto estimada',
    browser: 'Funciones del navegador',
    estimateNotice: 'Las cifras son comparativas. No incluyen créditos gratuitos, impuestos, costes de Vercel/red, reintentos ni precios regionales.',
    names: {
      'text-first-browser': 'Texto primero · navegador primero',
      'text-first-gemini': 'Texto primero · respaldo de traducción Gemini',
      'google-cloud-pipeline': 'Alternativa · canalización completa de Google Cloud',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Factura API directa cuando Web Speech, Chrome Translator y el TTS de la plataforma son compatibles.',
      'text-first-gemini': 'Respaldo real de Texto primero: el STT del navegador y el TTS de la plataforma cuestan $0; solo se estima la traducción de Gemini 3.5 Flash-Lite.',
      'google-cloud-pipeline': 'Alternativa con STT de pago: Cloud STT V2 a $0.016/min + traducción Gemini 3.5 Flash-Lite a unos $0.03–$0.06/hora de audio de entrada + TTS del navegador a $0.',
      'gemini-live-translate': '25 audio tokens/seg; entrada $3.50/M y salida $21/M. Sesenta minutos de entrada y de salida cuestan $2.205 (se muestra $2.21).',
      'openai-realtime-translate': 'Configuración real de LikeParrot: audio de traducción $0.034/min + gpt-realtime-whisper para registrar el original $0.017/min = $0.051/min enviado ($3.06/hora). Solo al desactivar el registro original se aplica el precio base de $2.04/hora.',
    },
  },
  fr: {
    eyebrow: 'Estimation selon l’utilisation',
    title: 'Calculateur de coûts LikeParrot',
    intro: 'Modifiez la durée de connexion et la part d’audio réellement envoyée et lue pour comparer instantanément la facture API estimée de chaque parcours.',
    hours: 'Utilisation de l’application',
    hoursUnit: 'heures',
    input: 'Utilisation du moteur vocal payant',
    inputHint: 'Utilisez 100 % tant qu’un moteur Son d’abord est connecté. Une valeur inférieure sert uniquement à représenter la part du temps total d’utilisation pendant laquelle le moteur est actif ; elle ne signifie pas que le silence est retiré au sein d’une session OpenAI translation.',
    output: 'Durée de l’audio traduit',
    outputHint: 'Durée de sortie par rapport à la parole d’entrée. Elle se situe souvent entre 80 et 120 % ; le calculateur permet jusqu’à 200 %.',
    exchange: 'KRW par USD',
    exchangeHint: 'Il ne s’agit pas d’un taux de change en temps réel. Les taxes et frais de carte à l’étranger sont exclus.',
    result: 'Total estimé',
    perHour: 'par heure de session',
    listed: 'Tarif officiel',
    estimated: 'Fourchette estimée',
    noCharge: 'Aucun coût API direct',
    rangeJoiner: ' – ',
    formulas: 'Afficher le détail du calcul',
    inputAudio: 'Audio d’entrée',
    outputAudio: 'Audio de sortie',
    translationAudio: 'Audio d’entrée à traduire',
    inputTranscription: 'Transcription des sous-titres source',
    stt: 'STT',
    translation: 'Estimation de la traduction textuelle',
    browser: 'Fonctions du navigateur',
    estimateNotice: 'Ces montants servent à la comparaison. Ils excluent les crédits gratuits, les taxes, les coûts Vercel/réseau, les nouvelles tentatives et les tarifs régionaux.',
    names: {
      'text-first-browser': 'Texte d’abord · navigateur d’abord',
      'text-first-gemini': 'Texte d’abord · secours de traduction Gemini',
      'google-cloud-pipeline': 'Alternative · pipeline Google Cloud complet',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Facture API directe lorsque Web Speech, Chrome Translator et le TTS de la plateforme sont pris en charge.',
      'text-first-gemini': 'Le vrai secours Texte d’abord : le STT du navigateur et le TTS de la plateforme coûtent $0 ; seule la traduction Gemini 3.5 Flash-Lite est estimée.',
      'google-cloud-pipeline': 'Alternative STT payante : Cloud STT V2 à $0.016/min + traduction Gemini 3.5 Flash-Lite à environ $0.03–$0.06/heure d’audio d’entrée + TTS du navigateur à $0.',
      'gemini-live-translate': '25 audio tokens/s ; entrée $3.50/M et sortie $21/M. Soixante minutes d’entrée et de sortie coûtent $2.205 (affiché $2.21).',
      'openai-realtime-translate': 'Configuration réelle de LikeParrot : audio de traduction $0.034/min + gpt-realtime-whisper pour enregistrer la source $0.017/min = $0.051/min envoyée ($3.06/heure). Le tarif base de $2.04/heure ne s’applique que si l’enregistrement source est désactivé.',
    },
  },
  de: {
    eyebrow: 'Nutzungsabhängige Schätzung',
    title: 'LikeParrot-Kostenrechner',
    intro: 'Ändern Sie Verbindungsdauer und Anteil der tatsächlich gesendeten und abgespielten Audiodaten, um die geschätzten API-Kosten der Pfade direkt zu vergleichen.',
    hours: 'App-Nutzungszeit',
    hoursUnit: 'Stunden',
    input: 'Nutzung der kostenpflichtigen Audio-Engine',
    inputHint: 'Während eine „Ton zuerst“-Engine verbunden ist, verwenden Sie 100 %. Ein niedrigerer Wert dient nur dazu, den Anteil der gesamten App-Nutzungszeit mit aktiver Engine abzubilden; er bedeutet nicht, dass Stille innerhalb einer OpenAI-translation-Sitzung herausgeschnitten wird.',
    output: 'Dauer der Übersetzungsaudioausgabe',
    outputHint: 'Ausgabedauer relativ zur Eingangssprache. Üblich sind 80–120 %; der Rechner erlaubt Vergleiche bis 200 %.',
    exchange: 'KRW je USD',
    exchangeHint: 'Dies ist kein Live-Wechselkurs. Steuern und Auslandsgebühren der Karte sind ausgeschlossen.',
    result: 'Geschätzte Summe',
    perHour: 'pro Sitzungsstunde',
    listed: 'Offizieller Preis',
    estimated: 'Geschätzter Bereich',
    noCharge: 'Keine direkten API-Kosten',
    rangeJoiner: ' – ',
    formulas: 'Berechnungsgrundlage anzeigen',
    inputAudio: 'Eingangsaudio',
    outputAudio: 'Ausgangsaudio',
    translationAudio: 'Übersetzungs-Eingangsaudio',
    inputTranscription: 'Transkription der Ausgangsuntertitel',
    stt: 'STT',
    translation: 'Geschätzte Textübersetzung',
    browser: 'Browser-Funktionen',
    estimateNotice: 'Die Beträge dienen dem Vergleich. Kostenlose Guthaben, Steuern, Vercel-/Netzwerkkosten, Wiederholungen und regionale Preise sind ausgeschlossen.',
    names: {
      'text-first-browser': 'Text zuerst · Browser zuerst',
      'text-first-gemini': 'Text zuerst · Gemini-Übersetzungs-Fallback',
      'google-cloud-pipeline': 'Alternative · vollständige Google-Cloud-Pipeline',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Direkte API-Kosten, wenn Web Speech, Chrome Translator und Plattform-TTS unterstützt werden.',
      'text-first-gemini': 'Der tatsächliche „Text zuerst“-Fallback: Browser-STT und Plattform-TTS kosten $0; nur die Gemini-3.5-Flash-Lite-Übersetzung wird geschätzt.',
      'google-cloud-pipeline': 'Kostenpflichtige STT-Alternative: Cloud STT V2 zu $0.016/Min. + Gemini-3.5-Flash-Lite-Übersetzung zu etwa $0.03–$0.06/Eingangsaudiostunde + Browser-TTS zu $0.',
      'gemini-live-translate': '25 audio tokens/Sek.; Eingang $3.50/M und Ausgang $21/M. Je 60 Minuten Eingang und Ausgang kosten $2.205 (angezeigt als $2.21).',
      'openai-realtime-translate': 'Tatsächliche LikeParrot-Konfiguration: Übersetzungsaudio $0.034/Min. + gpt-realtime-whisper für die Ausgangsaufzeichnung $0.017/Min. = $0.051/gesendete Min. ($3.06/Stunde). Der base-Preis von $2.04/Stunde gilt nur ohne Ausgangsaufzeichnung.',
    },
  },
  vi: {
    eyebrow: 'Ước tính theo mức sử dụng',
    title: 'Máy tính chi phí LikeParrot',
    intro: 'Thay đổi thời gian kết nối và tỷ lệ âm thanh thực sự được gửi, phát để so sánh ngay hóa đơn API ước tính của từng lộ trình.',
    hours: 'Thời gian dùng ứng dụng',
    hoursUnit: 'giờ',
    input: 'Tỷ lệ dùng công cụ âm thanh trả phí',
    inputHint: 'Đặt 100% trong khi công cụ Âm thanh trước đang kết nối. Chỉ dùng giá trị thấp hơn để mô phỏng tỷ lệ trong tổng thời gian dùng ứng dụng mà công cụ được bật; điều này không có nghĩa là cắt khoảng lặng bên trong phiên OpenAI translation.',
    output: 'Thời lượng âm thanh đã dịch',
    outputHint: 'Thời lượng đầu ra so với lời nói đầu vào. Thường là 80–120%; máy tính cho phép so sánh tối đa 200%.',
    exchange: 'KRW trên mỗi USD',
    exchangeHint: 'Đây không phải tỷ giá trực tiếp. Chưa bao gồm thuế và phí thẻ quốc tế.',
    result: 'Tổng ước tính',
    perHour: 'mỗi giờ phiên',
    listed: 'Đơn giá chính thức',
    estimated: 'Khoảng ước tính',
    noCharge: 'Không có phí API trực tiếp',
    rangeJoiner: ' – ',
    formulas: 'Hiện cơ sở tính toán',
    inputAudio: 'Âm thanh đầu vào',
    outputAudio: 'Âm thanh đầu ra',
    translationAudio: 'Âm thanh đầu vào để dịch',
    inputTranscription: 'Bản chép lời phụ đề nguồn',
    stt: 'STT',
    translation: 'Ước tính dịch văn bản',
    browser: 'Khả năng của trình duyệt',
    estimateNotice: 'Các con số chỉ để so sánh. Chưa bao gồm tín dụng miễn phí, thuế, chi phí Vercel/mạng, lần thử lại và giá theo khu vực.',
    names: {
      'text-first-browser': 'Văn bản trước · ưu tiên trình duyệt',
      'text-first-gemini': 'Văn bản trước · dự phòng dịch Gemini',
      'google-cloud-pipeline': 'Phương án khác · toàn bộ quy trình Google Cloud',
      'gemini-live-translate': 'Gemini 3.5 Live Translate',
      'openai-realtime-translate': 'OpenAI Realtime Translate',
    },
    notes: {
      'text-first-browser': 'Phí API trực tiếp khi Web Speech, Chrome Translator và TTS của nền tảng được hỗ trợ.',
      'text-first-gemini': 'Phương án dự phòng Văn bản trước thực tế: STT trình duyệt và TTS nền tảng là $0; chỉ ước tính dịch bằng Gemini 3.5 Flash-Lite.',
      'google-cloud-pipeline': 'Phương án STT trả phí: Cloud STT V2 $0.016/phút + dịch Gemini 3.5 Flash-Lite khoảng $0.03–$0.06/giờ âm thanh đầu vào + TTS trình duyệt $0.',
      'gemini-live-translate': '25 audio tokens/giây; đầu vào $3.50/M và đầu ra $21/M. 60 phút đầu vào cùng 60 phút đầu ra có giá $2.205 (hiển thị $2.21).',
      'openai-realtime-translate': 'Cấu hình thực tế của LikeParrot: audio dịch $0.034/phút + gpt-realtime-whisper để ghi nguồn $0.017/phút = $0.051/phút gửi ($3.06/giờ). Chỉ áp dụng mức base $2.04/giờ khi tắt ghi nguồn.',
    },
  },
} as const;

const formatUsd = (value: number, locale: BillingLocale): string => {
  const fractionDigits = value > 0 && value < 0.01 ? 4 : 2;
  return new Intl.NumberFormat(BILLING_LOCALE_TAGS[locale], {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

const formatKrw = (value: number, locale: BillingLocale): string =>
  new Intl.NumberFormat(BILLING_LOCALE_TAGS[locale], {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);

const formatUsdRange = (estimate: CostEstimate, locale: BillingLocale, joiner: string): string =>
  isRangeEstimate(estimate)
    ? `${formatUsd(estimate.usdLow, locale)}${joiner}${formatUsd(estimate.usdHigh, locale)}`
    : formatUsd(estimate.usdLow, locale);

const formatKrwRange = (estimate: CostEstimate, locale: BillingLocale, joiner: string): string =>
  isRangeEstimate(estimate)
    ? `${formatKrw(estimate.krwLow, locale)}${joiner}${formatKrw(estimate.krwHigh, locale)}`
    : formatKrw(estimate.krwLow, locale);

export function CostCalculator({ locale }: CostCalculatorProps) {
  const t = COPY[locale];
  const idPrefix = useId();
  const [sessionHours, setSessionHours] = useState<NumericInputValue>(1);
  const [inputAudioPercent, setInputAudioPercent] = useState<NumericInputValue>(100);
  const [translatedOutputPercent, setTranslatedOutputPercent] = useState<NumericInputValue>(100);
  const [krwPerUsd, setKrwPerUsd] = useState<NumericInputValue>(1_350);
  const result = useMemo(
    () => estimateVoiceCosts({
      sessionHours: sessionHours === '' ? 0 : sessionHours,
      inputAudioPercent: inputAudioPercent === '' ? 0 : inputAudioPercent,
      translatedOutputPercent: translatedOutputPercent === '' ? 0 : translatedOutputPercent,
      krwPerUsd: krwPerUsd === '' ? 0 : krwPerUsd,
    }),
    [inputAudioPercent, krwPerUsd, sessionHours, translatedOutputPercent]
  );

  const componentLabels = {
    'input-audio': t.inputAudio,
    'output-audio': t.outputAudio,
    'translation-audio': t.translationAudio,
    'input-transcription': t.inputTranscription,
    stt: t.stt,
    translation: t.translation,
    browser: t.browser,
  } as const;

  const kindLabels = {
    listed: t.listed,
    estimated: t.estimated,
    'no-direct-api-charge': t.noCharge,
  } as const;

  const names: Record<CostEstimateId, string> = t.names;

  return (
    <section
      aria-labelledby={`${idPrefix}-title`}
      className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-slate-950/20"
    >
      <div className="border-b border-[var(--app-border)] bg-gradient-to-br from-indigo-500/15 via-transparent to-emerald-500/10 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-400">{t.eyebrow}</p>
            <h2 id={`${idPrefix}-title`} className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {t.title}
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">{t.intro}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/70 p-3">
            <span className="block text-xs font-semibold text-[var(--app-muted)]">{t.hours}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                id={`${idPrefix}-hours`}
                type="number"
                min="0"
                max="10000"
                step="0.25"
                inputMode="decimal"
                value={sessionHours}
                onChange={(event) => setSessionHours(readNumericInput(
                  event.currentTarget.value,
                  event.currentTarget.valueAsNumber,
                  0,
                  10_000
                ))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 text-base font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              />
              <span className="shrink-0 text-xs text-[var(--app-muted)]">{t.hoursUnit}</span>
            </span>
          </label>

          <label className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/70 p-3">
            <span className="block text-xs font-semibold text-[var(--app-muted)]">{t.input}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                inputMode="decimal"
                value={inputAudioPercent}
                aria-describedby={`${idPrefix}-input-help`}
                onChange={(event) => setInputAudioPercent(readNumericInput(
                  event.currentTarget.value,
                  event.currentTarget.valueAsNumber,
                  0,
                  100
                ))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 text-base font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              />
              <span className="shrink-0 text-xs text-[var(--app-muted)]">%</span>
            </span>
            <span id={`${idPrefix}-input-help`} className="sr-only">{t.inputHint}</span>
          </label>

          <label className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/70 p-3">
            <span className="block text-xs font-semibold text-[var(--app-muted)]">{t.output}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="200"
                step="5"
                inputMode="decimal"
                value={translatedOutputPercent}
                aria-describedby={`${idPrefix}-output-help`}
                onChange={(event) => setTranslatedOutputPercent(readNumericInput(
                  event.currentTarget.value,
                  event.currentTarget.valueAsNumber,
                  0,
                  200
                ))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 text-base font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              />
              <span className="shrink-0 text-xs text-[var(--app-muted)]">%</span>
            </span>
            <span id={`${idPrefix}-output-help`} className="sr-only">{t.outputHint}</span>
          </label>

          <label className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/70 p-3">
            <span className="block text-xs font-semibold text-[var(--app-muted)]">{t.exchange}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100000"
                step="10"
                inputMode="decimal"
                value={krwPerUsd}
                aria-describedby={`${idPrefix}-exchange-help`}
                onChange={(event) => setKrwPerUsd(readNumericInput(
                  event.currentTarget.value,
                  event.currentTarget.valueAsNumber,
                  0,
                  100_000
                ))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 text-base font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              />
              <span className="shrink-0 text-xs text-[var(--app-muted)]">KRW</span>
            </span>
            <span id={`${idPrefix}-exchange-help`} className="sr-only">{t.exchangeHint}</span>
          </label>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div aria-live="polite" className="grid gap-3 sm:grid-cols-2">
          {result.estimates.map((estimate) => (
            <article
              key={estimate.id}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold leading-5">{names[estimate.id]}</h3>
                  <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    estimate.kind === 'listed'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : estimate.kind === 'no-direct-api-charge'
                        ? 'bg-sky-500/15 text-sky-400'
                        : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {kindLabels[estimate.kind]}
                  </span>
                </div>
                <CircleDollarSign className="h-5 w-5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
              </div>

              <p className="mt-4 font-mono text-xl font-bold tracking-tight sm:text-2xl">
                {formatUsdRange(estimate, locale, t.rangeJoiner)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                {formatKrwRange(estimate, locale, t.rangeJoiner)} · {t.result}
              </p>
              <p className="mt-3 text-xs leading-5 text-[var(--app-muted)]">{t.notes[estimate.id]}</p>

              <details className="group mt-3 border-t border-[var(--app-border)] pt-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-indigo-400 outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-indigo-400 [&::-webkit-details-marker]:hidden">
                  {t.formulas}
                </summary>
                <dl className="mt-2 space-y-1.5 text-[11px] text-[var(--app-muted)]">
                  {estimate.components.map((component) => (
                    <div key={component.id} className="flex items-start justify-between gap-3">
                      <dt>{componentLabels[component.id]}</dt>
                      <dd className="shrink-0 font-mono text-[var(--app-text)]">
                        {component.usdLow !== component.usdHigh
                          ? `${formatUsd(component.usdLow, locale)}${t.rangeJoiner}${formatUsd(component.usdHigh, locale)}`
                          : formatUsd(component.usdLow, locale)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-start justify-between gap-3 border-t border-[var(--app-border)] pt-1.5">
                    <dt>{t.perHour}</dt>
                    <dd className="shrink-0 font-mono text-[var(--app-text)]">
                      {estimate.usdPerSessionHourLow !== estimate.usdPerSessionHourHigh
                        ? `${formatUsd(estimate.usdPerSessionHourLow, locale)}${t.rangeJoiner}${formatUsd(estimate.usdPerSessionHourHigh, locale)}`
                        : formatUsd(estimate.usdPerSessionHourLow, locale)}
                    </dd>
                  </div>
                </dl>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-300 [[data-theme=light]_&]:text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t.estimateNotice} {t.exchangeHint}</p>
        </div>
      </div>
    </section>
  );
}
