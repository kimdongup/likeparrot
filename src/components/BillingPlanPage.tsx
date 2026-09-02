import {
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Cloud,
  Gauge,
  Laptop,
  LockKeyhole,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';
import {
  BILLING_LOCALE_TAGS,
  PRICING_LAST_VERIFIED,
  PRICING_SOURCES,
  VOICE_ALTERNATIVES,
  localized,
  resolveBillingLocale,
} from '../data/voicePricing';
import { CostCalculator } from './CostCalculator';

interface BillingPlanPageProps {
  uiLanguageCode: string;
}

const COPY = {
  ko: {
    pageEyebrow: '요금 · 구조 · 안전장치',
    pageTitle: '음성 AI 비용 계획',
    pageIntro: 'LikeParrot의 실제 두 경로를 기준으로 공식 단가와 가정을 분리해 비교했습니다. 위 계산기부터 사용하고, 아래에서 가장 싼 구성과 무료 대안을 확인하세요.',
    verified: '가격 확인일',
    usdNotice: '모든 공급자 가격은 달러 기준이며 변경될 수 있습니다.',
    recommendationTitle: '가장 저렴하게 구현하는 순서',
    recommendationIntro: '한 공급자를 모든 단계에 고정하는 것보다, 기기 기능을 먼저 쓰고 부족한 단계만 유료 API로 보내는 방식이 이 앱에 가장 잘 맞습니다.',
    steps: [
      {
        title: '1. 글먼저를 기본값으로',
        body: 'Web Speech → Chrome Translator → 기기 기본 TTS 순서로 시도합니다. 지원되는 환경에서는 직접 API 청구가 $0이고, 텍스트가 먼저 생겨 기록 기능도 단순합니다.',
      },
      {
        title: '2. 필요한 단계만 대체',
        body: '브라우저 번역이 없는 모바일에서는 STT와 기본 TTS는 유지하고 텍스트 번역만 Flash-Lite로 보냅니다. 인식 품질이 부족할 때만 Cloud STT V2 또는 저가 STT를 켭니다.',
      },
      {
        title: '3. 소리먼저는 짧게 연결',
        body: 'Gemini는 실제 입·출력 audio token에, OpenAI Translate와 입력 전사는 연결 중 문장 사이 침묵을 포함한 audio duration에 과금됩니다. 사용하지 않을 때 연결을 끊고 대화가 끝나면 즉시 세션을 종료하세요.',
      },
    ],
    decisionTitle: '현재 앱에 대한 결론',
    decisions: [
      '비용 최우선: 글먼저 브라우저 경로를 우선하고 미지원 단계만 서버 fallback으로 전환',
      '자연스러운 동시 통역 + 소스 자막 기록: 유료 기준 Gemini Live가 대체로 유리',
      'OpenAI: 번역만 쓰면 $2.04/입력 음성 시간, 현재 LikeParrot처럼 소스 자막 기록을 켜면 $3.06/시간',
      '무료 Gemini tier는 비용이 없지만 입력이 제품 개선에 사용될 수 있으므로 민감한 대화에는 Paid tier 권장',
    ],
    googleTitle: 'Google 과금 구조',
    googleIntro: 'Gemini 통합 스트림과 Cloud Speech 파이프라인은 서로 다른 상품·청구 계정입니다.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid: 입력 audio $3.50/M tokens + 출력 audio $21/M tokens · 25 tokens/초',
    geminiLiveBody: '입력 60분($0.315)과 번역 출력 60분($1.89)을 모두 쓰면 $2.205, 즉 약 $2.21입니다. 공식 페이지는 합산 효과 가격을 약 $0.0368/분으로 안내합니다. 사용하지 않을 때 연결을 종료하거나 출력이 짧으면 비용이 비례해 내려갑니다.',
    freeTierTitle: '무료 계층',
    geminiFree: 'Developer API Free tier는 $0로 표시되지만 rate limit이 있고, 요청 데이터가 제품 개선에 사용될 수 있습니다. Paid tier는 사용하지 않는 것으로 표시됩니다.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: '첫 월 500,000분 구간 Standard recognition $0.016/분 · 동적 batch $0.003/분',
    cloudSttBody: '실시간 학습 앱은 Standard streaming 단가를 사용해 입력 음성 1시간당 $0.96로 잡았습니다. “매월 첫 60분 무료”는 V1 SKU들에 해당하며 V2 Standard 가격표에는 없습니다.',
    cloudTtsTitle: 'Cloud Text-to-Speech는 선택 사항',
    cloudTtsBody: '현재 기록 재생은 기기 기본 TTS이므로 $0입니다. Cloud TTS로 바꾸면 Standard/WaveNet $4/M characters(월 4M 무료), Neural2 $16/M(월 1M 무료), Chirp 3 HD $30/M(월 1M 무료)처럼 문자 수로 별도 청구됩니다.',
    translationAssumptionTitle: 'Gemini 3.5 Flash-Lite 번역 추정치',
    translationAssumptionBody: '공식 단가는 입력 $0.30/M text tokens, 출력 $2.50/M입니다. 계산기의 약 $0.03~0.06/입력 음성 시간은 시간당 약 43,000자를 입력·출력 각각 10.75k~21.5k tokens로 환산한 앱 설계용 범위이며, 프롬프트 token은 제외합니다. Google이 판매하는 “시간당 상품”은 아닙니다.',
    googleLinks: 'Google 공식 자료',
    openAiTitle: 'OpenAI 과금 구조',
    openAiIntro: '통역 전용 모델은 일반 Realtime 음성 에이전트의 audio-token 표와 과금 방식이 다릅니다. 이 앱은 별도 OpenAI API 과금과 API 크레딧을 사용하며, ChatGPT Plus/Pro 구독료에는 API 사용량이 포함되지 않습니다.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: '번역 audio $0.034/분 · $2.04/입력 음성 시간 · Free tier 없음',
    openAiTranslateBody: 'gpt-realtime-translate의 base 가격입니다. 공식 Translation 세션은 문장 사이 침묵을 포함해 연결 중 audio를 계속 보내므로, 현재 계산기는 연결 중 입력을 100%로 봅니다. 절약하려면 대화가 끝나는 즉시 세션을 종료해 연결 시간을 줄이세요.',
    openAiTranscriptTitle: '현재 LikeParrot 구성: $3.06/입력 음성 시간',
    openAiTranscriptBody: '현재 구현은 소스 문장을 기록하기 위해 gpt-realtime-whisper 입력 전사도 활성화합니다. Realtime 비용 가이드는 input transcription을 별도 rate card로 과금한다고 명시하므로 $0.034 + $0.017 = $0.051/분입니다. 소스 기록을 끈 경우에만 base $2.04/시간을 사용합니다.',
    openAiOtherModelsTitle: 'Realtime 음성 에이전트 모델',
    openAiOtherModelsBody: 'gpt-realtime-2.1은 audio 입력 $32/M tokens·출력 $64/M tokens, gpt-realtime-2.1-mini는 입력 $10/M·출력 $20/M입니다. 이들은 각 Response에서 사용한 audio token으로 과금하는 범용 음성 에이전트이며, audio duration으로 과금되는 통역 전용 gpt-realtime-translate와 다릅니다. 따라서 통역 선택기에는 넣지 않습니다. 확인일 현재 gpt-live-1 또는 gpt-live-1-mini라는 공식 모델 ID는 공개되지 않아, 확인되지 않은 해당 ID도 UI에 넣지 않습니다.',
    securityTitle: '키와 예산 안전장치',
    securityIntro: '예산 알림 하나만으로는 과금 사고를 막을 수 없습니다. 아래 네 층을 함께 두는 것이 안전합니다.',
    safeguards: [
      {
        title: 'Quota·프로젝트 한도를 먼저 낮추기',
        body: 'Google의 조정 가능한 요청·처리량 quota를 실제 사용자 수에 맞춰 낮춥니다. OpenAI Admin Projects에서는 모델별 rate limit과 프로젝트 hard spend limit을 설정합니다. Google quota 자체는 정확한 달러 hard cap과 같지 않습니다.',
      },
      {
        title: '예산 종류 확인하기',
        body: 'Google의 alerts-only budget은 자동 차단하지 않습니다. Spend cap은 Preview이며 eligible services에만 적용되므로, 지원 여부를 확인하고 미지원 서비스에는 Pub/Sub 자동화와 작은 quota를 함께 사용합니다.',
      },
      {
        title: '키 노출 범위 구분하기',
        body: '현재 개인용 BYOK 방식은 사용자의 키를 탭 또는 기기 저장소에 두고 같은 출처 Vercel 함수로 보내 임시 client secret으로 교환합니다. WebRTC 연결 자체에는 임시 secret만 전달됩니다. 운영자가 하나의 공용 키를 쓰는 다중 사용자 서비스라면 그 공용 키는 서버 환경 변수에만 보관하고 인증·rate limit을 추가해야 합니다.',
      },
      {
        title: '키별 최소 권한',
        body: 'Google 키는 API 제한과 가능한 application 제한을 모두 적용하고, 개발·운영 프로젝트와 키를 분리합니다. 로그·오류 메시지·저장 HTML에는 키를 절대 넣지 않습니다.',
      },
    ],
    alternativesTitle: '다른 Voice AI 대안',
    alternativesIntro: '아래 대부분은 STT 또는 TTS 한 단계의 가격입니다. 완전한 통역 비용을 비교할 때는 STT + 번역 + TTS 세 단계를 모두 더해야 합니다.',
    freeLabel: '무료 시작',
    cautionLabel: '확인할 점',
    officialPricing: '공식 가격',
    freeTitle: '무료 또는 거의 무료로 쓰는 방법',
    freeOptions: [
      {
        title: '브라우저 우선',
        body: '지원되는 데스크톱 Chrome의 on-device Translator와 플랫폼 speechSynthesis를 사용합니다. Web Speech 인식은 브라우저 구현에 따라 서버를 사용할 수 있으므로 오프라인·SLA를 보장한다고 표현하면 안 됩니다.',
      },
      {
        title: 'Gemini Free tier',
        body: '개인 학습과 시험에는 유용하지만 rate limit과 데이터 사용 조건을 확인하세요. 공개 서비스의 비용 보장 수단으로 간주하지 않습니다.',
      },
      {
        title: '로컬 오픈소스',
        body: 'whisper.cpp STT + 로컬 번역 모델 + Piper 계열 TTS로 API 요금을 없앨 수 있습니다. 대신 모델 다운로드, 모바일 성능, 배터리, 호스팅, 라이선스 비용이 생깁니다.',
      },
      {
        title: '체험 크레딧',
        body: 'AssemblyAI, Deepgram, Gladia 등 일회성 크레딧으로 품질을 비교하되, 반복 제공되는 월간 무료량으로 계산하지 마세요.',
      },
    ],
    methodologyTitle: '계산 범위와 주의',
    methodology: '이 페이지는 공개 list price를 정규화한 설계용 계산기이며 청구서가 아닙니다. 세금, 환전 수수료, 서버·egress, 저장소, 다중 채널, 재시도, 프롬프트 text token, 지역·볼륨 할인은 제외했습니다. 배포 전에 공급자 콘솔의 현재 SKU와 작은 실제 세션의 usage를 대조하세요.',
    source: '출처',
    links: {
      geminiPricing: 'Gemini 요금',
      cloudStt: 'Cloud STT 요금',
      cloudTts: 'Cloud TTS 요금',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime 비용',
      realtime21Model: 'gpt-realtime-2.1 모델',
      realtime21MiniModel: 'gpt-realtime-2.1-mini 모델',
      chatGptApiBilling: 'ChatGPT와 API 과금 구분',
      budgetAlerts: '예산 알림',
      spendCaps: '지출 상한',
      apiKeySecurity: 'API 키 보안',
      openAiWebRtcSecurity: 'OpenAI WebRTC 보안',
      openAiProjectControls: 'OpenAI 프로젝트 제어',
    },
  },
  en: {
    pageEyebrow: 'Pricing · architecture · safeguards',
    pageTitle: 'Voice AI cost plan',
    pageIntro: 'This comparison separates official list prices from assumptions using LikeParrot’s two real execution paths. Start with the calculator, then review the cheapest architecture and free options.',
    verified: 'Prices checked',
    usdNotice: 'All provider prices are in USD and may change.',
    recommendationTitle: 'Cheapest implementation order',
    recommendationIntro: 'This app is cheapest when it uses device capabilities first and meters only the missing stage, instead of committing all three stages to one cloud provider.',
    steps: [
      {
        title: '1. Default to Text First',
        body: 'Try Web Speech → Chrome Translator → platform TTS. Where supported, the direct API bill is $0 and the text-first record is simpler to maintain.',
      },
      {
        title: '2. Replace only the missing stage',
        body: 'On mobile without browser translation, keep STT and platform TTS and send only text translation to Flash-Lite. Enable Cloud STT V2 or a low-cost STT only when recognition quality is insufficient.',
      },
      {
        title: '3. Keep Sound First sessions short',
        body: 'Gemini bills actual input/output audio tokens; OpenAI Translate and input transcription bill connected audio duration, including silence between phrases. Disconnect while idle and end the session as soon as the conversation finishes.',
      },
    ],
    decisionTitle: 'Recommendation for this app',
    decisions: [
      'Lowest cost: prefer the Text First browser path and use a server fallback only for unsupported stages',
      'Natural simultaneous interpretation plus a source transcript: paid Gemini Live is usually the better fit',
      'OpenAI: translation alone is $2.04/input-audio hour; the current LikeParrot source-recording setup is $3.06/hour',
      'Gemini’s Free tier costs $0 but may use input for product improvement; prefer Paid for sensitive conversations',
    ],
    googleTitle: 'Google pricing structure',
    googleIntro: 'Gemini’s integrated stream and a Cloud Speech pipeline are separate products and billing surfaces.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid: input audio $3.50/M tokens + output audio $21/M tokens · 25 tokens/sec',
    geminiLiveBody: 'Sixty minutes of input ($0.315) plus sixty minutes of translated output ($1.89) costs $2.205, or about $2.21. Google lists an approximate combined effective price of $0.0368/min. Cost falls proportionally when you disconnect while idle or output is shorter.',
    freeTierTitle: 'Free tier',
    geminiFree: 'The Developer API lists a $0 Free tier with rate limits; its requests may be used to improve products. The Paid tier is listed as not used for that purpose.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: 'Standard recognition $0.016/min for the first 500,000 monthly minutes · dynamic batch $0.003/min',
    cloudSttBody: 'A live learning app uses the Standard streaming rate, estimated here at $0.96 per input-audio hour. The first 60 minutes monthly apply to the V1 SKUs, not to V2 Standard.',
    cloudTtsTitle: 'Cloud Text-to-Speech is optional',
    cloudTtsBody: 'Saved-record playback currently uses platform TTS at $0. Cloud TTS would add character billing: Standard/WaveNet $4/M characters (4M monthly free), Neural2 $16/M (1M free), or Chirp 3 HD $30/M (1M free).',
    translationAssumptionTitle: 'Gemini 3.5 Flash-Lite translation estimate',
    translationAssumptionBody: 'The official rates are $0.30/M input text tokens and $2.50/M output text tokens. The calculator’s roughly $0.03–$0.06/input-audio hour assumes about 43K characters/hour and 10.75K–21.5K tokens on each side; prompt tokens are excluded. Google does not sell it as an hourly product.',
    googleLinks: 'Official Google sources',
    openAiTitle: 'OpenAI pricing structure',
    openAiIntro: 'The dedicated interpreter model is billed differently from general Realtime audio agents. This app uses separate OpenAI API billing and API credits; ChatGPT Plus/Pro subscriptions do not include API usage.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: 'Translation audio $0.034/min · $2.04/input-audio hour · no Free tier',
    openAiTranslateBody: 'This is the gpt-realtime-translate base price. The official Translation session keeps sending audio while connected, including silence between phrases, so the calculator defaults to 100% input while connected. Save by ending the session as soon as the conversation finishes.',
    openAiTranscriptTitle: 'Current LikeParrot setup: $3.06/input-audio hour',
    openAiTranscriptBody: 'The current implementation also enables gpt-realtime-whisper input transcription to save source sentences. The Realtime cost guide says input transcription uses a separate rate card, so $0.034 + $0.017 = $0.051/min. Use the $2.04/hour base only when source recording is disabled.',
    openAiOtherModelsTitle: 'Realtime voice-agent models',
    openAiOtherModelsBody: 'gpt-realtime-2.1 audio costs $32/M input tokens and $64/M output tokens; gpt-realtime-2.1-mini costs $10/M input and $20/M output. These are general voice agents billed for audio tokens used per Response, unlike the interpreter-only gpt-realtime-translate billed by audio duration, so they are not offered in the interpreter picker. As of the checked date, no official model IDs named gpt-live-1 or gpt-live-1-mini are published, so those unverified IDs are not offered either.',
    securityTitle: 'Key and budget safeguards',
    securityIntro: 'A budget alert alone cannot prevent a billing incident. Use all four layers below.',
    safeguards: [
      {
        title: 'Lower quotas and project limits first',
        body: 'Reduce Google’s adjustable request and throughput quotas to match real user volume. In OpenAI Admin Projects, set per-model rate limits and a project hard spend limit. A Google quota alone is not an exact dollar hard cap.',
      },
      {
        title: 'Check the budget type',
        body: 'Google alerts-only budgets do not stop usage. Spend caps are Preview and cover only eligible services; verify support and combine small quotas with Pub/Sub automation for unsupported services.',
      },
      {
        title: 'Separate BYOK from shared-key deployments',
        body: 'The current personal BYOK flow keeps the user’s key in tab or device storage and sends it to the same-origin Vercel function to exchange for a short-lived client secret. Only that secret reaches the WebRTC connection. A multi-user service with one operator-owned key must keep the shared key only in server environment variables and add authentication plus rate limits.',
      },
      {
        title: 'Least privilege per key',
        body: 'Apply both API and supported application restrictions to Google keys and separate development from production. Never include keys in logs, errors, or exported transcript HTML.',
      },
    ],
    alternativesTitle: 'Other Voice AI alternatives',
    alternativesIntro: 'Most prices below cover one STT or TTS stage. Add STT + translation + TTS before comparing them with an integrated interpreter.',
    freeLabel: 'Free start',
    cautionLabel: 'Check',
    officialPricing: 'Official pricing',
    freeTitle: 'Free or nearly-free paths',
    freeOptions: [
      {
        title: 'Browser-first',
        body: 'Use the on-device Translator in supported desktop Chrome and platform speechSynthesis. Web Speech recognition can use browser-vendor servers, so do not promise offline operation or an SLA.',
      },
      {
        title: 'Gemini Free tier',
        body: 'Useful for personal learning and trials, subject to rate limits and data-use terms. Do not treat it as a production cost guarantee.',
      },
      {
        title: 'Local open source',
        body: 'whisper.cpp STT + a local translation model + Piper-family TTS can remove API charges. Model downloads, mobile performance, battery, hosting, and licensing remain real costs.',
      },
      {
        title: 'Trial credits',
        body: 'Use one-time AssemblyAI, Deepgram, or Gladia credits to compare quality, but do not model them as a recurring monthly free allowance.',
      },
    ],
    methodologyTitle: 'Scope and caveats',
    methodology: 'This is a design estimator normalized from public list prices, not an invoice. It excludes taxes, foreign-exchange fees, server/egress, storage, multiple channels, retries, prompt text tokens, and regional or volume discounts. Before launch, compare the current console SKU with usage from a small real session.',
    source: 'Source',
    links: {
      geminiPricing: 'Gemini pricing',
      cloudStt: 'Cloud STT pricing',
      cloudTts: 'Cloud TTS pricing',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime costs',
      realtime21Model: 'gpt-realtime-2.1 model',
      realtime21MiniModel: 'gpt-realtime-2.1-mini model',
      chatGptApiBilling: 'ChatGPT vs API billing',
      budgetAlerts: 'Budget alerts',
      spendCaps: 'Spend caps',
      apiKeySecurity: 'API key security',
      openAiWebRtcSecurity: 'OpenAI WebRTC security',
      openAiProjectControls: 'OpenAI project controls',
    },
  },
  ja: {
    pageEyebrow: '料金 · 構成 · 安全対策',
    pageTitle: '音声AIコスト計画',
    pageIntro: 'LikeParrotの実際の2つの実行経路を基準に、公式料金と仮定を分けて比較します。まず上の計算機を使い、その後で最も安い構成と無料の選択肢を確認してください。',
    verified: '価格確認日',
    usdNotice: 'すべての事業者価格は米ドル建てで、変更される場合があります。',
    recommendationTitle: '最も安く実装する順序',
    recommendationIntro: '3段階すべてを1社に固定するより、まず端末機能を使い、不足する段階だけを有料APIに送る方法がこのアプリに最適です。',
    steps: [
      {
        title: '1. 「テキスト優先」を既定にする',
        body: 'Web Speech → Chrome Translator → 端末標準TTSの順に試します。対応環境では直接API料金が$0で、先にテキストができるため記録も簡単です。',
      },
      {
        title: '2. 不足する段階だけを置き換える',
        body: 'ブラウザ翻訳がないモバイルではSTTと端末標準TTSを維持し、テキスト翻訳だけをFlash-Liteに送ります。認識品質が不足する場合のみCloud STT V2または低価格STTを有効にします。',
      },
      {
        title: '3. 「音声優先」の接続を短くする',
        body: 'Geminiは実際の入出力audio token、OpenAI Translateと入力文字起こしは文の間の無音を含む接続中のaudio durationに課金します。使わない時は切断し、会話が終わり次第セッションを終了してください。',
      },
    ],
    decisionTitle: '現在のアプリへの結論',
    decisions: [
      'コスト最優先：ブラウザの「テキスト優先」経路を優先し、未対応の段階だけをサーバーフォールバックに切り替える',
      '自然な同時通訳 + 原文字幕の記録：有料では通常Gemini Liveが適している',
      'OpenAI：翻訳のみなら入力音声1時間あたり$2.04、現在のLikeParrotの原文記録構成では$3.06/時間',
      'Gemini Free tierは$0ですが入力が製品改善に使われる可能性があるため、機密性の高い会話にはPaid tierを推奨',
    ],
    googleTitle: 'Googleの料金体系',
    googleIntro: 'Geminiの統合ストリームとCloud Speechパイプラインは、別の商品・課金単位です。',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid：入力audio $3.50/M tokens + 出力audio $21/M tokens · 25 tokens/秒',
    geminiLiveBody: '入力60分（$0.315）と翻訳出力60分（$1.89）で$2.205、約$2.21です。公式ページは合算実効価格を約$0.0368/分と案内しています。未使用時に切断するか出力が短い場合、費用は比例して下がります。',
    freeTierTitle: '無料枠',
    geminiFree: 'Developer APIのFree tierは$0と記載されていますがrate limitがあり、リクエストデータが製品改善に使われる場合があります。Paid tierはその目的に使用しないと記載されています。',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: '月間最初の500,000分までStandard recognition $0.016/分 · dynamic batch $0.003/分',
    cloudSttBody: 'リアルタイム学習アプリはStandard streaming料金を使うため、入力音声1時間あたり$0.96と見積もります。「毎月最初の60分無料」はV1 SKU群に適用され、V2 Standardにはありません。',
    cloudTtsTitle: 'Cloud Text-to-Speechは任意',
    cloudTtsBody: '保存記録の再生は現在、端末標準TTSを使うため$0です。Cloud TTSにすると文字数課金が加わり、Standard/WaveNet $4/M characters（月4M無料）、Neural2 $16/M（月1M無料）、Chirp 3 HD $30/M（月1M無料）です。',
    translationAssumptionTitle: 'Gemini 3.5 Flash-Lite翻訳の推定',
    translationAssumptionBody: '公式料金は入力$0.30/M text tokens、出力$2.50/Mです。計算機の約$0.03～$0.06/入力音声時間は、1時間あたり約43,000文字を入出力それぞれ10.75K～21.5K tokensに換算した設計用範囲で、prompt tokenは除外しています。Googleが「時間単位の商品」として販売しているものではありません。',
    googleLinks: 'Google公式資料',
    openAiTitle: 'OpenAIの料金体系',
    openAiIntro: '通訳専用モデルは、一般的なRealtime音声エージェントのaudio-token料金表とは異なる方式で課金されます。このアプリは別枠のOpenAI API課金とAPIクレジットを使い、ChatGPT Plus/Proの購読料金にAPI利用は含まれません。',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: '翻訳audio $0.034/分 · 入力音声1時間あたり$2.04 · Free tierなし',
    openAiTranslateBody: 'gpt-realtime-translateのbase価格です。公式Translationセッションは文の間の無音を含め、接続中ずっと音声を送信するため、計算機は接続中の入力を100%とします。会話終了後すぐにセッションを終了して接続時間を減らしてください。',
    openAiTranscriptTitle: '現在のLikeParrot構成：入力音声1時間あたり$3.06',
    openAiTranscriptBody: '現在の実装では原文を保存するため、gpt-realtime-whisper入力文字起こしも有効です。Realtime費用ガイドではinput transcriptionを別rate cardで課金すると明記されているため、$0.034 + $0.017 = $0.051/分です。原文記録を無効にした場合のみbase $2.04/時間を使います。',
    openAiOtherModelsTitle: 'Realtime音声エージェントモデル',
    openAiOtherModelsBody: 'gpt-realtime-2.1のaudio料金は入力$32/M tokens・出力$64/M tokens、gpt-realtime-2.1-miniは入力$10/M・出力$20/Mです。これらは各Responseで使用したaudio tokenに基づいて課金される汎用音声エージェントで、audio duration課金の通訳専用gpt-realtime-translateとは異なるため、通訳選択肢には含めません。確認日現在、gpt-live-1またはgpt-live-1-miniという公式モデルIDは公開されておらず、これら未確認IDもUIに出しません。',
    securityTitle: 'キーと予算の安全対策',
    securityIntro: '予算アラートだけでは課金事故を防げません。以下の4層を併用してください。',
    safeguards: [
      {
        title: 'Quotaとプロジェクト上限を先に下げる',
        body: 'Googleの調整可能なリクエスト・処理量quotaを実際の利用者数に合わせて下げます。OpenAI Admin Projectsではモデル別rate limitとproject hard spend limitを設定します。Google quotaだけでは正確な金額上限になりません。',
      },
      {
        title: '予算の種類を確認する',
        body: 'Googleのalerts-only budgetは利用を自動停止しません。Spend capはPreviewでeligible servicesだけが対象です。対応状況を確認し、非対応サービスには小さなquotaとPub/Sub自動化を併用します。',
      },
      {
        title: 'BYOKと共有キー運用を分ける',
        body: '現在の個人向けBYOKフローは利用者のキーをタブまたは端末ストレージに置き、同一オリジンのVercel関数に送って短期client secretに交換します。WebRTC接続にはそのsecretだけが渡ります。運営者所有の共通キーを使う複数利用者サービスでは、共通キーをサーバー環境変数だけに保存し、認証とrate limitを追加する必要があります。',
      },
      {
        title: 'キーごとに最小権限',
        body: 'GoogleキーにはAPI制限と対応するapplication制限を設定し、開発と本番を分けます。ログ、エラー、書き出した字幕HTMLにキーを含めないでください。',
      },
    ],
    alternativesTitle: 'その他のVoice AI候補',
    alternativesIntro: '以下の料金の多くはSTTまたはTTSの1段階だけです。統合通訳と比較する際は、STT + 翻訳 + TTSの3段階をすべて加算してください。',
    freeLabel: '無料で開始',
    cautionLabel: '確認事項',
    officialPricing: '公式料金',
    freeTitle: '無料またはほぼ無料で使う方法',
    freeOptions: [
      {
        title: 'ブラウザ優先',
        body: '対応するデスクトップChromeのon-device Translatorとplatform speechSynthesisを使います。Web Speech認識はブラウザ提供元のサーバーを使う場合があるため、オフライン動作やSLAを保証してはいけません。',
      },
      {
        title: 'Gemini Free tier',
        body: '個人学習や試用には便利ですが、rate limitとデータ利用条件を確認してください。本番サービスの費用保証として扱わないでください。',
      },
      {
        title: 'ローカルオープンソース',
        body: 'whisper.cpp STT + ローカル翻訳モデル + Piper系列TTSでAPI料金をなくせます。ただしモデルのダウンロード、モバイル性能、バッテリー、ホスティング、ライセンスの費用が残ります。',
      },
      {
        title: '試用クレジット',
        body: 'AssemblyAI、Deepgram、Gladiaなどの1回限りのクレジットで品質を比較できますが、継続的な月間無料枠として計算しないでください。',
      },
    ],
    methodologyTitle: '計算範囲と注意事項',
    methodology: 'これは公開list priceを正規化した設計用の計算機で、請求書ではありません。税金、為替手数料、サーバー・egress、ストレージ、複数channel、再試行、prompt text token、地域・volume discountは除外しています。公開前に現在のコンソールSKUと小規模な実セッションのusageを照合してください。',
    source: '出典',
    links: {
      geminiPricing: 'Gemini料金',
      cloudStt: 'Cloud STT料金',
      cloudTts: 'Cloud TTS料金',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime費用',
      realtime21Model: 'gpt-realtime-2.1モデル',
      realtime21MiniModel: 'gpt-realtime-2.1-miniモデル',
      chatGptApiBilling: 'ChatGPTとAPIの課金区分',
      budgetAlerts: '予算アラート',
      spendCaps: '支出上限',
      apiKeySecurity: 'APIキーの安全対策',
      openAiWebRtcSecurity: 'OpenAI WebRTCの安全対策',
      openAiProjectControls: 'OpenAIプロジェクト制御',
    },
  },
  'zh-TW': {
    pageEyebrow: '費用 · 架構 · 安全措施',
    pageTitle: '語音 AI 費用規劃',
    pageIntro: '本比較依 LikeParrot 的兩條實際執行路徑，將官方定價與假設分開呈現。請先使用上方計算器，再查看最省錢的架構與免費方案。',
    verified: '價格確認日',
    usdNotice: '所有供應商價格均以美元計，且可能變動。',
    recommendationTitle: '最省錢的實作順序',
    recommendationIntro: '與其把三個階段綁定同一個雲端供應商，本應用程式更適合先使用裝置功能，只把缺少的階段送至付費 API。',
    steps: [
      {
        title: '1. 預設使用「文字優先」',
        body: '依序嘗試 Web Speech → Chrome Translator → 裝置預設 TTS。在支援的環境中，直接 API 費用為 $0，而且先產生文字也讓記錄更容易維護。',
      },
      {
        title: '2. 只替換缺少的階段',
        body: '在沒有瀏覽器翻譯的行動裝置上，保留 STT 與裝置預設 TTS，只把文字翻譯送至 Flash-Lite。只有辨識品質不足時才啟用 Cloud STT V2 或低價 STT。',
      },
      {
        title: '3. 縮短「聲音優先」連線',
        body: 'Gemini 依實際輸入／輸出 audio token 計費；OpenAI Translate 與輸入轉錄則依連線期間的 audio duration 計費，包含句子間的靜音。不使用時請斷線，對話結束後立即終止工作階段。',
      },
    ],
    decisionTitle: '本應用程式的建議',
    decisions: [
      '成本優先：先走「文字優先」瀏覽器路徑，只有不支援的階段才切換到伺服器備援',
      '自然同步口譯 + 原文字幕記錄：付費方案通常以 Gemini Live 更合適',
      'OpenAI：只翻譯為每輸入音訊小時 $2.04；LikeParrot 目前的原文記錄設定為 $3.06/小時',
      'Gemini Free tier 為 $0，但輸入可能用於產品改善；敏感對話建議使用 Paid tier',
    ],
    googleTitle: 'Google 計費結構',
    googleIntro: 'Gemini 整合串流與 Cloud Speech 管線是不同產品，也分開計費。',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid：輸入 audio $3.50/M tokens + 輸出 audio $21/M tokens · 25 tokens/秒',
    geminiLiveBody: '輸入 60 分鐘（$0.315）加翻譯輸出 60 分鐘（$1.89）共 $2.205，約 $2.21。官方頁面列出的合併有效價格約為 $0.0368/分鐘。不使用時斷線或輸出較短，費用會按比例下降。',
    freeTierTitle: '免費級別',
    geminiFree: 'Developer API 的 Free tier 標示為 $0，但有 rate limit，請求資料可能用於產品改善。Paid tier 標示為不會用於此目的。',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: '每月前 500,000 分鐘 Standard recognition $0.016/分鐘 · dynamic batch $0.003/分鐘',
    cloudSttBody: '即時學習應用程式使用 Standard streaming 費率，此處估算每輸入音訊小時 $0.96。「每月前 60 分鐘免費」適用於 V1 SKU，不適用於 V2 Standard。',
    cloudTtsTitle: 'Cloud Text-to-Speech 為選用項目',
    cloudTtsBody: '儲存記錄的播放目前使用裝置預設 TTS，因此為 $0。改用 Cloud TTS 會增加字元計費：Standard/WaveNet $4/M characters（每月 4M 免費）、Neural2 $16/M（每月 1M 免費）或 Chirp 3 HD $30/M（每月 1M 免費）。',
    translationAssumptionTitle: 'Gemini 3.5 Flash-Lite 翻譯估算',
    translationAssumptionBody: '官方費率為輸入 $0.30/M text tokens、輸出 $2.50/M。計算器約 $0.03～$0.06/輸入音訊小時的範圍，假設每小時約 43,000 字元，輸入與輸出各換算為 10.75K～21.5K tokens；不含 prompt token。Google 並未將它作為「按小時計費產品」銷售。',
    googleLinks: 'Google 官方資料',
    openAiTitle: 'OpenAI 計費結構',
    openAiIntro: '專用口譯模型的計費方式與一般 Realtime 語音代理的 audio-token 價格表不同。本應用程式使用獨立的 OpenAI API 計費與 API 額度；ChatGPT Plus/Pro 訂閱不包含 API 使用量。',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: '翻譯 audio $0.034/分鐘 · 每輸入音訊小時 $2.04 · 無 Free tier',
    openAiTranslateBody: '這是 gpt-realtime-translate 的 base 價格。官方 Translation 工作階段在連線期間會持續傳送音訊，包含句子間的靜音，因此計算器預設連線中輸入為 100%。對話結束後立即終止工作階段，才能縮短計費連線時間。',
    openAiTranscriptTitle: '目前 LikeParrot 設定：每輸入音訊小時 $3.06',
    openAiTranscriptBody: '目前實作也會啟用 gpt-realtime-whisper 輸入轉錄來儲存原文句子。Realtime 成本指南明確指出 input transcription 使用獨立 rate card，因此為 $0.034 + $0.017 = $0.051/分鐘。只有關閉原文記錄時才使用 base $2.04/小時。',
    openAiOtherModelsTitle: 'Realtime 語音代理模型',
    openAiOtherModelsBody: 'gpt-realtime-2.1 的 audio 費率為輸入 $32/M tokens、輸出 $64/M tokens；gpt-realtime-2.1-mini 為輸入 $10/M、輸出 $20/M。它們是依每個 Response 使用的 audio token 計費的通用語音代理，與按 audio duration 計費的口譯專用 gpt-realtime-translate 不同，因此不會出現在口譯選單。截至確認日，官方尚未發布名為 gpt-live-1 或 gpt-live-1-mini 的模型 ID，這些未確認 ID 也不會出現在 UI。',
    securityTitle: '金鑰與預算安全措施',
    securityIntro: '只有預算警示無法防止計費事故。請同時使用以下四層保護。',
    safeguards: [
      {
        title: '先降低 Quota 與專案上限',
        body: '依實際使用者數量降低 Google 可調整的請求與處理量 quota。在 OpenAI Admin Projects 設定各模型 rate limit 與 project hard spend limit。Google quota 本身並不是精確的金額 hard cap。',
      },
      {
        title: '確認預算類型',
        body: 'Google 的 alerts-only budget 不會自動停止使用。Spend cap 仍為 Preview，且只涵蓋 eligible services；請確認支援範圍，並對不支援的服務搭配小額 quota 與 Pub/Sub 自動化。',
      },
      {
        title: '區分 BYOK 與共用金鑰部署',
        body: '目前個人 BYOK 流程把使用者金鑰保存在分頁或裝置儲存空間，再傳到同源 Vercel 函式換取短效 client secret；WebRTC 連線只會收到該 secret。若多人服務使用營運方的一把共用金鑰，必須只把它存於伺服器環境變數，並加入驗證與 rate limit。',
      },
      {
        title: '每把金鑰採最小權限',
        body: 'Google 金鑰應同時套用 API 限制與可用的 application 限制，並分開開發與正式環境。切勿將金鑰放入記錄、錯誤訊息或匯出的字幕 HTML。',
      },
    ],
    alternativesTitle: '其他 Voice AI 替代方案',
    alternativesIntro: '以下多數價格只涵蓋 STT 或 TTS 單一階段。與整合口譯比較時，必須把 STT + 翻譯 + TTS 三個階段全部加總。',
    freeLabel: '免費開始',
    cautionLabel: '注意事項',
    officialPricing: '官方定價',
    freeTitle: '免費或近乎免費的使用方式',
    freeOptions: [
      {
        title: '瀏覽器優先',
        body: '使用支援的桌面版 Chrome on-device Translator 與平台 speechSynthesis。Web Speech 辨識可能使用瀏覽器供應商伺服器，因此不可承諾離線運作或 SLA。',
      },
      {
        title: 'Gemini Free tier',
        body: '適合個人學習與測試，但須確認 rate limit 與資料使用條款。不可把它視為正式服務的成本保證。',
      },
      {
        title: '本機開源方案',
        body: 'whisper.cpp STT + 本機翻譯模型 + Piper 系列 TTS 可免除 API 費用，但模型下載、行動效能、電池、託管與授權仍有成本。',
      },
      {
        title: '試用額度',
        body: '可使用 AssemblyAI、Deepgram、Gladia 等一次性額度比較品質，但不要將其當成每月持續提供的免費額度。',
      },
    ],
    methodologyTitle: '計算範圍與注意事項',
    methodology: '本頁是將公開 list price 正規化後的設計估算器，不是帳單。不含稅金、匯兌費、伺服器／egress、儲存、多 channel、重試、prompt text token、地區或 volume discount。上線前請以供應商主控台的目前 SKU 與小型實際工作階段 usage 交叉核對。',
    source: '來源',
    links: {
      geminiPricing: 'Gemini 定價',
      cloudStt: 'Cloud STT 定價',
      cloudTts: 'Cloud TTS 定價',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime 費用',
      realtime21Model: 'gpt-realtime-2.1 模型',
      realtime21MiniModel: 'gpt-realtime-2.1-mini 模型',
      chatGptApiBilling: 'ChatGPT 與 API 分開計費',
      budgetAlerts: '預算警示',
      spendCaps: '支出上限',
      apiKeySecurity: 'API 金鑰安全',
      openAiWebRtcSecurity: 'OpenAI WebRTC 安全',
      openAiProjectControls: 'OpenAI 專案控制',
    },
  },
  zh: {
    pageEyebrow: '费用 · 架构 · 安全措施',
    pageTitle: '语音 AI 费用规划',
    pageIntro: '本比较根据 LikeParrot 的两条实际执行路径，将官方定价与假设分开呈现。请先使用上方计算器，再查看最省钱的架构和免费方案。',
    verified: '价格确认日',
    usdNotice: '所有供应商价格均以美元计价，且可能变动。',
    recommendationTitle: '最省钱的实现顺序',
    recommendationIntro: '与其将三个阶段绑定到同一个云供应商，本应用更适合先使用设备功能，只把缺少的阶段发送到付费 API。',
    steps: [
      {
        title: '1. 默认使用“文字优先”',
        body: '依次尝试 Web Speech → Chrome Translator → 设备默认 TTS。在支持的环境中，直接 API 费用为 $0，而且先生成文字也让记录更易维护。',
      },
      {
        title: '2. 只替换缺少的阶段',
        body: '在没有浏览器翻译的移动设备上，保留 STT 和设备默认 TTS，只把文本翻译发送到 Flash-Lite。只有识别质量不足时才启用 Cloud STT V2 或低价 STT。',
      },
      {
        title: '3. 缩短“声音优先”连接',
        body: 'Gemini 按实际输入/输出 audio token 计费；OpenAI Translate 和输入转录则按连接期间的 audio duration 计费，包括句子之间的静音。不使用时请断开连接，对话结束后立即终止会话。',
      },
    ],
    decisionTitle: '本应用的建议',
    decisions: [
      '成本优先：先走“文字优先”浏览器路径，只有不支持的阶段才切换到服务器回退',
      '自然同步口译 + 原文字幕记录：付费方案通常以 Gemini Live 更合适',
      'OpenAI：只翻译为每输入音频小时 $2.04；LikeParrot 当前原文记录设置为 $3.06/小时',
      'Gemini Free tier 为 $0，但输入可能用于产品改进；敏感对话建议使用 Paid tier',
    ],
    googleTitle: 'Google 计费结构',
    googleIntro: 'Gemini 集成流和 Cloud Speech 流水线是不同产品，也分别计费。',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid：输入 audio $3.50/M tokens + 输出 audio $21/M tokens · 25 tokens/秒',
    geminiLiveBody: '输入 60 分钟（$0.315）加翻译输出 60 分钟（$1.89）共 $2.205，约 $2.21。官方页面列出的合并有效价格约为 $0.0368/分钟。不使用时断开连接或输出较短，费用会按比例下降。',
    freeTierTitle: '免费层级',
    geminiFree: 'Developer API 的 Free tier 标示为 $0，但有 rate limit，请求数据可能用于产品改进。Paid tier 标示为不会用于此目的。',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: '每月前 500,000 分钟 Standard recognition $0.016/分钟 · dynamic batch $0.003/分钟',
    cloudSttBody: '实时学习应用使用 Standard streaming 费率，此处估算每输入音频小时 $0.96。“每月前 60 分钟免费”适用于 V1 SKU，不适用于 V2 Standard。',
    cloudTtsTitle: 'Cloud Text-to-Speech 为可选项',
    cloudTtsBody: '保存记录的播放目前使用设备默认 TTS，因此为 $0。改用 Cloud TTS 会增加字符计费：Standard/WaveNet $4/M characters（每月 4M 免费）、Neural2 $16/M（每月 1M 免费）或 Chirp 3 HD $30/M（每月 1M 免费）。',
    translationAssumptionTitle: 'Gemini 3.5 Flash-Lite 翻译估算',
    translationAssumptionBody: '官方费率为输入 $0.30/M text tokens、输出 $2.50/M。计算器约 $0.03～$0.06/输入音频小时的范围，假设每小时约 43,000 字符，输入和输出各换算为 10.75K～21.5K tokens；不含 prompt token。Google 并未将它作为“按小时产品”销售。',
    googleLinks: 'Google 官方资料',
    openAiTitle: 'OpenAI 计费结构',
    openAiIntro: '专用口译模型的计费方式与一般 Realtime 语音代理的 audio-token 价格表不同。本应用使用独立的 OpenAI API 计费和 API 额度；ChatGPT Plus/Pro 订阅不包含 API 使用量。',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: '翻译 audio $0.034/分钟 · 每输入音频小时 $2.04 · 无 Free tier',
    openAiTranslateBody: '这是 gpt-realtime-translate 的 base 价格。官方 Translation 会话在连接期间会持续发送音频，包括句子之间的静音，因此计算器默认连接中输入为 100%。对话结束后立即终止会话，才能缩短计费连接时间。',
    openAiTranscriptTitle: '当前 LikeParrot 设置：每输入音频小时 $3.06',
    openAiTranscriptBody: '当前实现还会启用 gpt-realtime-whisper 输入转录来保存原文句子。Realtime 成本指南明确指出 input transcription 使用独立 rate card，因此为 $0.034 + $0.017 = $0.051/分钟。只有关闭原文记录时才使用 base $2.04/小时。',
    openAiOtherModelsTitle: 'Realtime 语音代理模型',
    openAiOtherModelsBody: 'gpt-realtime-2.1 的 audio 费率为输入 $32/M tokens、输出 $64/M tokens；gpt-realtime-2.1-mini 为输入 $10/M、输出 $20/M。它们是按每个 Response 使用的 audio token 计费的通用语音代理，与按 audio duration 计费的口译专用 gpt-realtime-translate 不同，因此不会出现在口译选择器中。截至确认日，官方尚未发布名为 gpt-live-1 或 gpt-live-1-mini 的模型 ID，这些未确认 ID 也不会出现在 UI。',
    securityTitle: '密钥和预算安全措施',
    securityIntro: '只有预算提醒无法防止计费事故。请同时使用以下四层保护。',
    safeguards: [
      {
        title: '先降低 Quota 和项目上限',
        body: '按实际用户数量降低 Google 可调整的请求和吞吐量 quota。在 OpenAI Admin Projects 设置各模型 rate limit 和 project hard spend limit。Google quota 本身并不是精确的金额 hard cap。',
      },
      {
        title: '确认预算类型',
        body: 'Google 的 alerts-only budget 不会自动停止使用。Spend cap 仍为 Preview，且只涵盖 eligible services；请确认支持范围，并对不支持的服务配合小额 quota 和 Pub/Sub 自动化。',
      },
      {
        title: '区分 BYOK 与共享密钥部署',
        body: '当前个人 BYOK 流程把用户密钥保存在标签页或设备存储中，再发送到同源 Vercel 函数换取短期 client secret；WebRTC 连接只会收到该 secret。如果多用户服务使用运营方的一把共享密钥，必须只将其保存在服务器环境变量中，并添加身份验证和 rate limit。',
      },
      {
        title: '每把密钥采用最小权限',
        body: 'Google 密钥应同时应用 API 限制和可用的 application 限制，并分离开发与生产环境。切勿将密钥写入日志、错误消息或导出的字幕 HTML。',
      },
    ],
    alternativesTitle: '其他 Voice AI 替代方案',
    alternativesIntro: '以下大多数价格只涵盖 STT 或 TTS 单一阶段。与集成口译比较时，必须把 STT + 翻译 + TTS 三个阶段全部相加。',
    freeLabel: '免费开始',
    cautionLabel: '注意事项',
    officialPricing: '官方定价',
    freeTitle: '免费或近乎免费的使用方式',
    freeOptions: [
      {
        title: '浏览器优先',
        body: '使用支持的桌面版 Chrome on-device Translator 和平台 speechSynthesis。Web Speech 识别可能使用浏览器供应商服务器，因此不可承诺离线运行或 SLA。',
      },
      {
        title: 'Gemini Free tier',
        body: '适合个人学习和测试，但需要确认 rate limit 与数据使用条款。不可将它视为生产服务的成本保证。',
      },
      {
        title: '本地开源方案',
        body: 'whisper.cpp STT + 本地翻译模型 + Piper 系列 TTS 可免除 API 费用，但模型下载、移动性能、电池、托管和许可仍有成本。',
      },
      {
        title: '试用额度',
        body: '可使用 AssemblyAI、Deepgram、Gladia 等一次性额度比较质量，但不要将其当作每月持续提供的免费额度。',
      },
    ],
    methodologyTitle: '计算范围与注意事项',
    methodology: '本页是将公开 list price 标准化后的设计估算器，不是账单。不含税费、汇兑费、服务器/egress、存储、多 channel、重试、prompt text token、地区或 volume discount。上线前请用供应商控制台的当前 SKU 与小型实际会话 usage 交叉核对。',
    source: '来源',
    links: {
      geminiPricing: 'Gemini 定价',
      cloudStt: 'Cloud STT 定价',
      cloudTts: 'Cloud TTS 定价',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime 费用',
      realtime21Model: 'gpt-realtime-2.1 模型',
      realtime21MiniModel: 'gpt-realtime-2.1-mini 模型',
      chatGptApiBilling: 'ChatGPT 与 API 分开计费',
      budgetAlerts: '预算提醒',
      spendCaps: '支出上限',
      apiKeySecurity: 'API 密钥安全',
      openAiWebRtcSecurity: 'OpenAI WebRTC 安全',
      openAiProjectControls: 'OpenAI 项目控制',
    },
  },
  es: {
    pageEyebrow: 'Precios · arquitectura · protección',
    pageTitle: 'Plan de costes de IA de voz',
    pageIntro: 'La comparación separa precios oficiales y supuestos según las dos rutas reales de LikeParrot. Empieza con la calculadora y después revisa la arquitectura más barata y las opciones gratuitas.',
    verified: 'Precios comprobados',
    usdNotice: 'Todos los precios de proveedores están en USD y pueden cambiar.',
    recommendationTitle: 'Orden de implementación más barato',
    recommendationIntro: 'Esta aplicación cuesta menos si usa primero las funciones del dispositivo y envía solo la etapa que falte a una API de pago, en vez de confiar las tres etapas a un único proveedor.',
    steps: [
      {
        title: '1. Usar Texto primero por defecto',
        body: 'Prueba Web Speech → Chrome Translator → TTS del dispositivo. Cuando son compatibles, la factura API directa es $0 y el registro basado primero en texto es más sencillo.',
      },
      {
        title: '2. Sustituir solo la etapa que falte',
        body: 'En móviles sin traducción del navegador, conserva STT y el TTS del dispositivo y envía solo la traducción de texto a Flash-Lite. Activa Cloud STT V2 o un STT económico únicamente si la calidad de reconocimiento no basta.',
      },
      {
        title: '3. Mantener cortas las conexiones de Sonido primero',
        body: 'Gemini factura los audio token reales de entrada y salida; OpenAI Translate y la transcripción de entrada facturan la audio duration conectada, incluido el silencio entre frases. Desconecta cuando no se use y termina la sesión al acabar la conversación.',
      },
    ],
    decisionTitle: 'Recomendación para esta aplicación',
    decisions: [
      'Coste mínimo: prioriza la ruta de navegador Texto primero y usa respaldo del servidor solo en etapas no compatibles',
      'Interpretación simultánea natural + registro de subtítulos fuente: Gemini Live de pago suele ser la mejor opción',
      'OpenAI: solo traducción cuesta $2.04/hora de audio de entrada; la configuración actual con registro fuente cuesta $3.06/hora',
      'Gemini Free tier cuesta $0, pero la entrada puede usarse para mejorar productos; usa Paid tier en conversaciones sensibles',
    ],
    googleTitle: 'Estructura de precios de Google',
    googleIntro: 'El flujo integrado de Gemini y la canalización Cloud Speech son productos y superficies de facturación distintos.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid: audio de entrada $3.50/M tokens + audio de salida $21/M tokens · 25 tokens/seg',
    geminiLiveBody: 'Sesenta minutos de entrada ($0.315) más sesenta de salida traducida ($1.89) cuestan $2.205, unos $2.21. Google indica un precio efectivo combinado aproximado de $0.0368/min. El coste baja proporcionalmente al desconectar cuando no se usa o si la salida es más corta.',
    freeTierTitle: 'Nivel gratuito',
    geminiFree: 'Developer API muestra un Free tier de $0 con rate limits; sus solicitudes pueden usarse para mejorar productos. El Paid tier figura como no utilizado para ese fin.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: 'Standard recognition $0.016/min para los primeros 500,000 minutos mensuales · dynamic batch $0.003/min',
    cloudSttBody: 'Una aplicación de aprendizaje en vivo usa la tarifa Standard streaming, estimada aquí en $0.96 por hora de audio de entrada. Los primeros 60 minutos mensuales se aplican a los SKU V1, no a V2 Standard.',
    cloudTtsTitle: 'Cloud Text-to-Speech es opcional',
    cloudTtsBody: 'La reproducción del registro usa actualmente el TTS del dispositivo a $0. Cloud TTS añadiría facturación por caracteres: Standard/WaveNet $4/M characters (4M mensuales gratis), Neural2 $16/M (1M gratis) o Chirp 3 HD $30/M (1M gratis).',
    translationAssumptionTitle: 'Estimación de traducción Gemini 3.5 Flash-Lite',
    translationAssumptionBody: 'Las tarifas oficiales son $0.30/M text tokens de entrada y $2.50/M de salida. Los aproximadamente $0.03–$0.06/hora de audio de entrada de la calculadora suponen unos 43,000 caracteres/hora y 10.75K–21.5K tokens a cada lado; no incluyen prompt token. Google no lo vende como producto por horas.',
    googleLinks: 'Fuentes oficiales de Google',
    openAiTitle: 'Estructura de precios de OpenAI',
    openAiIntro: 'El modelo de interpretación dedicado se factura de forma distinta a los agentes de voz Realtime generales. Esta aplicación usa facturación y créditos independientes de la API de OpenAI; las suscripciones ChatGPT Plus/Pro no incluyen uso de API.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: 'Audio de traducción $0.034/min · $2.04/hora de audio de entrada · sin Free tier',
    openAiTranslateBody: 'Este es el precio base de gpt-realtime-translate. La sesión Translation oficial sigue enviando audio mientras está conectada, incluido el silencio entre frases, por lo que la calculadora usa un 100% de entrada durante la conexión. Ahorra terminando la sesión en cuanto acabe la conversación.',
    openAiTranscriptTitle: 'Configuración actual de LikeParrot: $3.06/hora de audio de entrada',
    openAiTranscriptBody: 'La implementación actual también activa la transcripción de entrada gpt-realtime-whisper para guardar frases fuente. La guía de costes Realtime indica que input transcription usa una rate card separada: $0.034 + $0.017 = $0.051/min. Usa el precio base de $2.04/hora solo si desactivas el registro fuente.',
    openAiOtherModelsTitle: 'Modelos de agentes de voz Realtime',
    openAiOtherModelsBody: 'El audio de gpt-realtime-2.1 cuesta $32/M tokens de entrada y $64/M de salida; gpt-realtime-2.1-mini cuesta $10/M de entrada y $20/M de salida. Son agentes de voz generales facturados por los audio token usados en cada Response, a diferencia de gpt-realtime-translate, dedicado a interpretación y facturado por audio duration; por eso no aparecen en el selector de interpretación. En la fecha de comprobación no hay ID oficiales gpt-live-1 ni gpt-live-1-mini, por lo que esos ID no verificados tampoco se ofrecen.',
    securityTitle: 'Protección de claves y presupuesto',
    securityIntro: 'Una alerta de presupuesto no evita por sí sola un incidente de facturación. Usa las cuatro capas siguientes.',
    safeguards: [
      {
        title: 'Reducir primero quotas y límites de proyecto',
        body: 'Reduce las quotas ajustables de solicitudes y capacidad de Google al volumen real. En OpenAI Admin Projects, configura rate limits por modelo y un project hard spend limit. Una quota de Google no equivale por sí sola a un límite exacto en dólares.',
      },
      {
        title: 'Comprobar el tipo de presupuesto',
        body: 'Los alerts-only budgets de Google no detienen el uso. Los spend caps están en Preview y solo cubren eligible services; comprueba la compatibilidad y combina quotas pequeñas con automatización Pub/Sub para los servicios no compatibles.',
      },
      {
        title: 'Separar BYOK de las claves compartidas',
        body: 'El flujo BYOK personal guarda la clave del usuario en la pestaña o el dispositivo y la envía a una función Vercel del mismo origen para cambiarla por un client secret breve. Solo ese secret llega a WebRTC. Un servicio multiusuario con una clave del operador debe conservarla solo en variables del servidor y añadir autenticación y rate limits.',
      },
      {
        title: 'Privilegio mínimo por clave',
        body: 'Aplica restricciones de API y application compatibles a las claves de Google y separa desarrollo de producción. Nunca incluyas claves en registros, errores ni HTML de subtítulos exportado.',
      },
    ],
    alternativesTitle: 'Otras alternativas de Voice AI',
    alternativesIntro: 'La mayoría de precios siguientes cubren una sola etapa STT o TTS. Suma STT + traducción + TTS antes de compararlos con un intérprete integrado.',
    freeLabel: 'Inicio gratuito',
    cautionLabel: 'Comprobar',
    officialPricing: 'Precio oficial',
    freeTitle: 'Rutas gratuitas o casi gratuitas',
    freeOptions: [
      {
        title: 'Navegador primero',
        body: 'Usa on-device Translator en Chrome de escritorio compatible y speechSynthesis de la plataforma. Web Speech puede usar servidores del proveedor del navegador; no prometas funcionamiento sin conexión ni SLA.',
      },
      {
        title: 'Gemini Free tier',
        body: 'Útil para aprendizaje personal y pruebas, sujeto a rate limits y condiciones de uso de datos. No lo trates como garantía de costes de producción.',
      },
      {
        title: 'Código abierto local',
        body: 'whisper.cpp STT + un modelo local de traducción + TTS de la familia Piper pueden eliminar cargos API. Las descargas, el rendimiento móvil, la batería, el alojamiento y las licencias siguen teniendo coste.',
      },
      {
        title: 'Créditos de prueba',
        body: 'Usa créditos únicos de AssemblyAI, Deepgram o Gladia para comparar calidad, pero no los cuentes como cuota gratuita mensual recurrente.',
      },
    ],
    methodologyTitle: 'Alcance y advertencias',
    methodology: 'Es un estimador de diseño normalizado a partir de public list prices, no una factura. Excluye impuestos, cambio de divisas, servidor/egress, almacenamiento, varios channel, reintentos, prompt text token y descuentos regionales o por volumen. Antes de publicar, compara el SKU actual de la consola con el usage de una sesión real pequeña.',
    source: 'Fuente',
    links: {
      geminiPricing: 'Precios de Gemini',
      cloudStt: 'Precios de Cloud STT',
      cloudTts: 'Precios de Cloud TTS',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Costes Realtime',
      realtime21Model: 'Modelo gpt-realtime-2.1',
      realtime21MiniModel: 'Modelo gpt-realtime-2.1-mini',
      chatGptApiBilling: 'Facturación de ChatGPT y API',
      budgetAlerts: 'Alertas de presupuesto',
      spendCaps: 'Límites de gasto',
      apiKeySecurity: 'Seguridad de claves API',
      openAiWebRtcSecurity: 'Seguridad OpenAI WebRTC',
      openAiProjectControls: 'Controles de proyectos OpenAI',
    },
  },
  fr: {
    pageEyebrow: 'Tarifs · architecture · protections',
    pageTitle: 'Plan de coûts de l’IA vocale',
    pageIntro: 'Cette comparaison sépare les tarifs officiels des hypothèses selon les deux parcours réels de LikeParrot. Commencez par le calculateur, puis examinez l’architecture la moins chère et les options gratuites.',
    verified: 'Prix vérifiés le',
    usdNotice: 'Tous les tarifs fournisseurs sont en USD et peuvent changer.',
    recommendationTitle: 'Ordre d’implémentation le moins cher',
    recommendationIntro: 'L’application coûte moins cher en utilisant d’abord les capacités de l’appareil et en facturant uniquement l’étape manquante, plutôt qu’en confiant les trois étapes au même fournisseur cloud.',
    steps: [
      {
        title: '1. Utiliser Texte d’abord par défaut',
        body: 'Essayez Web Speech → Chrome Translator → TTS de l’appareil. Là où ils sont pris en charge, la facture API directe est de $0 et le journal créé d’abord en texte est plus simple.',
      },
      {
        title: '2. Remplacer uniquement l’étape manquante',
        body: 'Sur mobile sans traduction dans le navigateur, gardez le STT et le TTS de l’appareil, puis envoyez uniquement le texte à Flash-Lite. Activez Cloud STT V2 ou un STT économique seulement si la reconnaissance est insuffisante.',
      },
      {
        title: '3. Garder les connexions Son d’abord courtes',
        body: 'Gemini facture les audio token d’entrée et de sortie réels ; OpenAI Translate et la transcription d’entrée facturent l’audio duration connectée, y compris le silence entre les phrases. Déconnectez en cas d’inactivité et terminez la session dès la fin de la conversation.',
      },
    ],
    decisionTitle: 'Recommandation pour cette application',
    decisions: [
      'Coût minimal : privilégier le parcours navigateur Texte d’abord et n’utiliser un secours serveur que pour les étapes non prises en charge',
      'Interprétation simultanée naturelle + enregistrement des sous-titres source : Gemini Live payant est généralement mieux adapté',
      'OpenAI : traduction seule à $2.04/heure d’audio d’entrée ; configuration LikeParrot actuelle avec enregistrement source à $3.06/heure',
      'Gemini Free tier coûte $0, mais l’entrée peut servir à améliorer les produits ; préférer Paid tier pour les conversations sensibles',
    ],
    googleTitle: 'Structure tarifaire de Google',
    googleIntro: 'Le flux intégré Gemini et le pipeline Cloud Speech sont des produits et des périmètres de facturation distincts.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid : audio d’entrée $3.50/M tokens + audio de sortie $21/M tokens · 25 tokens/s',
    geminiLiveBody: 'Soixante minutes d’entrée ($0.315) et soixante minutes de sortie traduite ($1.89) coûtent $2.205, soit environ $2.21. Google indique un prix effectif combiné d’environ $0.0368/min. Le coût baisse proportionnellement si vous vous déconnectez en cas d’inactivité ou si la sortie est plus courte.',
    freeTierTitle: 'Offre gratuite',
    geminiFree: 'La Developer API affiche un Free tier à $0 avec des rate limits ; ses requêtes peuvent servir à améliorer les produits. Le Paid tier est indiqué comme non utilisé à cette fin.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: 'Standard recognition $0.016/min pour les 500,000 premières minutes mensuelles · dynamic batch $0.003/min',
    cloudSttBody: 'Une application d’apprentissage en direct utilise le tarif Standard streaming, estimé ici à $0.96 par heure d’audio d’entrée. Les 60 premières minutes mensuelles s’appliquent aux SKU V1, pas à V2 Standard.',
    cloudTtsTitle: 'Cloud Text-to-Speech est facultatif',
    cloudTtsBody: 'La lecture des enregistrements utilise actuellement le TTS de l’appareil à $0. Cloud TTS ajouterait une facturation aux caractères : Standard/WaveNet $4/M characters (4M gratuits/mois), Neural2 $16/M (1M gratuit) ou Chirp 3 HD $30/M (1M gratuit).',
    translationAssumptionTitle: 'Estimation de traduction Gemini 3.5 Flash-Lite',
    translationAssumptionBody: 'Les tarifs officiels sont de $0.30/M text tokens en entrée et $2.50/M en sortie. Les quelque $0.03–$0.06/heure d’audio d’entrée du calculateur supposent environ 43,000 caractères/heure et 10.75K–21.5K tokens de chaque côté ; les prompt token sont exclus. Google ne le vend pas comme produit horaire.',
    googleLinks: 'Sources officielles Google',
    openAiTitle: 'Structure tarifaire d’OpenAI',
    openAiIntro: 'Le modèle d’interprétation dédié est facturé différemment des agents vocaux Realtime généraux. Cette application utilise une facturation et des crédits OpenAI API distincts ; les abonnements ChatGPT Plus/Pro n’incluent pas l’utilisation de l’API.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: 'Audio de traduction $0.034/min · $2.04/heure d’audio d’entrée · aucun Free tier',
    openAiTranslateBody: 'Il s’agit du prix base de gpt-realtime-translate. La session Translation officielle continue d’envoyer l’audio pendant la connexion, y compris le silence entre les phrases ; le calculateur utilise donc 100 % d’entrée pendant la connexion. Économisez en terminant la session dès la fin de la conversation.',
    openAiTranscriptTitle: 'Configuration LikeParrot actuelle : $3.06/heure d’audio d’entrée',
    openAiTranscriptBody: 'L’implémentation actuelle active aussi la transcription d’entrée gpt-realtime-whisper pour conserver les phrases source. Le guide des coûts Realtime précise que input transcription suit une rate card séparée : $0.034 + $0.017 = $0.051/min. Le tarif base de $2.04/heure ne s’applique que si l’enregistrement source est désactivé.',
    openAiOtherModelsTitle: 'Modèles d’agents vocaux Realtime',
    openAiOtherModelsBody: 'L’audio de gpt-realtime-2.1 coûte $32/M tokens en entrée et $64/M en sortie ; gpt-realtime-2.1-mini coûte $10/M en entrée et $20/M en sortie. Ce sont des agents vocaux généraux facturés selon les audio token utilisés par Response, contrairement à gpt-realtime-translate, dédié à l’interprétation et facturé selon l’audio duration ; ils ne sont donc pas proposés dans le sélecteur d’interprétation. À la date de vérification, aucun ID officiel gpt-live-1 ou gpt-live-1-mini n’est publié ; ces ID non vérifiés ne sont pas proposés non plus.',
    securityTitle: 'Protection des clés et du budget',
    securityIntro: 'Une alerte de budget seule ne peut pas empêcher un incident de facturation. Utilisez les quatre couches suivantes.',
    safeguards: [
      {
        title: 'Réduire d’abord les quotas et limites de projet',
        body: 'Réduisez les quotas Google ajustables de requêtes et de débit au volume réel. Dans OpenAI Admin Projects, configurez des rate limits par modèle et un project hard spend limit. Un quota Google seul n’est pas un plafond exact en dollars.',
      },
      {
        title: 'Vérifier le type de budget',
        body: 'Les alerts-only budgets Google n’arrêtent pas l’utilisation. Les spend caps sont en Preview et ne couvrent que les eligible services ; vérifiez la compatibilité et combinez petits quotas et automatisation Pub/Sub pour les services non pris en charge.',
      },
      {
        title: 'Séparer BYOK et clés partagées',
        body: 'Le flux BYOK personnel conserve la clé dans l’onglet ou l’appareil et l’envoie à une fonction Vercel de même origine pour l’échanger contre un client secret de courte durée. Seul ce secret atteint WebRTC. Un service multiutilisateur avec une clé opérateur doit la garder uniquement dans les variables serveur et ajouter authentification et rate limits.',
      },
      {
        title: 'Moindre privilège par clé',
        body: 'Appliquez aux clés Google les restrictions API et application prises en charge, et séparez développement et production. N’incluez jamais les clés dans les journaux, erreurs ou HTML de sous-titres exporté.',
      },
    ],
    alternativesTitle: 'Autres solutions Voice AI',
    alternativesIntro: 'La plupart des prix ci-dessous couvrent une seule étape STT ou TTS. Additionnez STT + traduction + TTS avant de les comparer à un interprète intégré.',
    freeLabel: 'Départ gratuit',
    cautionLabel: 'À vérifier',
    officialPricing: 'Tarif officiel',
    freeTitle: 'Parcours gratuits ou presque gratuits',
    freeOptions: [
      {
        title: 'Navigateur d’abord',
        body: 'Utilisez on-device Translator dans Chrome de bureau compatible et speechSynthesis de la plateforme. Web Speech peut utiliser les serveurs du fournisseur du navigateur ; ne promettez ni fonctionnement hors ligne ni SLA.',
      },
      {
        title: 'Gemini Free tier',
        body: 'Utile pour l’apprentissage personnel et les essais, sous réserve des rate limits et conditions d’utilisation des données. Ne le considérez pas comme une garantie de coût en production.',
      },
      {
        title: 'Open source local',
        body: 'whisper.cpp STT + un modèle de traduction local + un TTS de la famille Piper peuvent supprimer les frais API. Téléchargements, performances mobiles, batterie, hébergement et licences restent des coûts réels.',
      },
      {
        title: 'Crédits d’essai',
        body: 'Utilisez les crédits uniques AssemblyAI, Deepgram ou Gladia pour comparer la qualité, sans les compter comme quota gratuit mensuel récurrent.',
      },
    ],
    methodologyTitle: 'Périmètre et réserves',
    methodology: 'Il s’agit d’un estimateur de conception normalisé à partir des public list prices, pas d’une facture. Taxes, change, serveur/egress, stockage, plusieurs channel, nouvelles tentatives, prompt text token et remises régionales ou de volume sont exclus. Avant lancement, comparez le SKU actuel de la console au usage d’une petite session réelle.',
    source: 'Source',
    links: {
      geminiPricing: 'Tarifs Gemini',
      cloudStt: 'Tarifs Cloud STT',
      cloudTts: 'Tarifs Cloud TTS',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Coûts Realtime',
      realtime21Model: 'Modèle gpt-realtime-2.1',
      realtime21MiniModel: 'Modèle gpt-realtime-2.1-mini',
      chatGptApiBilling: 'Facturation ChatGPT et API',
      budgetAlerts: 'Alertes de budget',
      spendCaps: 'Plafonds de dépenses',
      apiKeySecurity: 'Sécurité des clés API',
      openAiWebRtcSecurity: 'Sécurité OpenAI WebRTC',
      openAiProjectControls: 'Contrôles des projets OpenAI',
    },
  },
  de: {
    pageEyebrow: 'Preise · Architektur · Schutzmaßnahmen',
    pageTitle: 'Kostenplan für Sprach-KI',
    pageIntro: 'Dieser Vergleich trennt offizielle Listenpreise von Annahmen anhand der zwei tatsächlichen LikeParrot-Pfade. Beginnen Sie mit dem Rechner und prüfen Sie danach die günstigste Architektur und kostenlose Optionen.',
    verified: 'Preise geprüft am',
    usdNotice: 'Alle Anbieterpreise sind in USD angegeben und können sich ändern.',
    recommendationTitle: 'Günstigste Implementierungsreihenfolge',
    recommendationIntro: 'Die App ist am günstigsten, wenn sie zuerst Gerätefunktionen nutzt und nur die fehlende Stufe über eine kostenpflichtige API abwickelt, statt alle drei Stufen an einen Cloud-Anbieter zu binden.',
    steps: [
      {
        title: '1. „Text zuerst“ als Standard',
        body: 'Versuchen Sie Web Speech → Chrome Translator → Geräte-TTS. Wo dies unterstützt wird, betragen die direkten API-Kosten $0 und die textbasierte Aufzeichnung ist einfacher.',
      },
      {
        title: '2. Nur die fehlende Stufe ersetzen',
        body: 'Auf Mobilgeräten ohne Browser-Übersetzung bleiben STT und Geräte-TTS erhalten; nur der Text geht zur Übersetzung an Flash-Lite. Cloud STT V2 oder ein günstiges STT wird nur bei unzureichender Erkennungsqualität aktiviert.',
      },
      {
        title: '3. „Ton zuerst“-Verbindungen kurz halten',
        body: 'Gemini berechnet tatsächliche audio token für Ein- und Ausgabe; OpenAI Translate und Eingangstranskription berechnen die verbundene audio duration einschließlich Stille zwischen Sätzen. Bei Inaktivität trennen und die Sitzung direkt nach Gesprächsende beenden.',
      },
    ],
    decisionTitle: 'Empfehlung für diese App',
    decisions: [
      'Niedrigste Kosten: Browser-Pfad „Text zuerst“ bevorzugen und Server-Fallback nur für nicht unterstützte Stufen verwenden',
      'Natürliche Simultanübersetzung + Aufzeichnung der Ausgangsuntertitel: kostenpflichtiges Gemini Live ist meist geeigneter',
      'OpenAI: reine Übersetzung $2.04/Eingangsaudiostunde; aktuelle LikeParrot-Konfiguration mit Ausgangsaufzeichnung $3.06/Stunde',
      'Gemini Free tier kostet $0, Eingaben können aber zur Produktverbesserung genutzt werden; für vertrauliche Gespräche Paid tier verwenden',
    ],
    googleTitle: 'Google-Preisstruktur',
    googleIntro: 'Der integrierte Gemini-Stream und eine Cloud-Speech-Pipeline sind separate Produkte und Abrechnungsbereiche.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid: Eingangsaudio $3.50/M tokens + Ausgangsaudio $21/M tokens · 25 tokens/Sek.',
    geminiLiveBody: '60 Minuten Eingang ($0.315) plus 60 Minuten übersetzte Ausgabe ($1.89) kosten $2.205, also etwa $2.21. Google nennt einen kombinierten effektiven Preis von ungefähr $0.0368/Min. Bei Trennung während Inaktivität oder kürzerer Ausgabe sinken die Kosten proportional.',
    freeTierTitle: 'Kostenlose Stufe',
    geminiFree: 'Die Developer API führt einen Free tier für $0 mit rate limits auf; Anfragen können zur Produktverbesserung genutzt werden. Beim Paid tier ist diese Nutzung als ausgeschlossen angegeben.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: 'Standard recognition $0.016/Min. für die ersten 500,000 Monatsminuten · dynamic batch $0.003/Min.',
    cloudSttBody: 'Eine Live-Lern-App nutzt den Standard-streaming-Preis, hier mit $0.96 pro Eingangsaudiostunde geschätzt. Die ersten 60 Minuten monatlich gelten für die V1-SKUs, nicht für V2 Standard.',
    cloudTtsTitle: 'Cloud Text-to-Speech ist optional',
    cloudTtsBody: 'Gespeicherte Aufzeichnungen werden derzeit mit Geräte-TTS für $0 abgespielt. Cloud TTS würde Zeichenabrechnung hinzufügen: Standard/WaveNet $4/M characters (4M monatlich frei), Neural2 $16/M (1M frei) oder Chirp 3 HD $30/M (1M frei).',
    translationAssumptionTitle: 'Gemini-3.5-Flash-Lite-Übersetzungsschätzung',
    translationAssumptionBody: 'Die offiziellen Preise sind $0.30/M input text tokens und $2.50/M output text tokens. Die etwa $0.03–$0.06/Eingangsaudiostunde im Rechner setzen rund 43,000 Zeichen/Stunde und je 10.75K–21.5K tokens für Ein- und Ausgabe voraus; prompt token sind ausgeschlossen. Google verkauft dies nicht als Stundenprodukt.',
    googleLinks: 'Offizielle Google-Quellen',
    openAiTitle: 'OpenAI-Preisstruktur',
    openAiIntro: 'Das spezielle Dolmetschmodell wird anders als allgemeine Realtime-Sprachagenten abgerechnet. Diese App nutzt eine separate OpenAI-API-Abrechnung und API-Guthaben; ChatGPT-Plus-/Pro-Abonnements enthalten keine API-Nutzung.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: 'Übersetzungsaudio $0.034/Min. · $2.04/Eingangsaudiostunde · kein Free tier',
    openAiTranslateBody: 'Dies ist der base-Preis von gpt-realtime-translate. Die offizielle Translation-Sitzung sendet während der Verbindung durchgehend Audio, einschließlich Stille zwischen Sätzen; der Rechner verwendet daher 100 % Eingang während der Verbindung. Zum Sparen die Sitzung direkt nach Gesprächsende beenden.',
    openAiTranscriptTitle: 'Aktuelle LikeParrot-Konfiguration: $3.06/Eingangsaudiostunde',
    openAiTranscriptBody: 'Die aktuelle Implementierung aktiviert zusätzlich gpt-realtime-whisper input transcription, um Ausgangssätze zu speichern. Laut Realtime-Kostenleitfaden gilt dafür eine separate rate card: $0.034 + $0.017 = $0.051/Min. Der base-Preis von $2.04/Stunde gilt nur bei deaktivierter Ausgangsaufzeichnung.',
    openAiOtherModelsTitle: 'Realtime-Sprachagentenmodelle',
    openAiOtherModelsBody: 'Audio für gpt-realtime-2.1 kostet $32/M input tokens und $64/M output tokens; gpt-realtime-2.1-mini kostet $10/M input und $20/M output. Dies sind allgemeine Sprachagenten, die nach den je Response verwendeten audio token abgerechnet werden, anders als das nach audio duration berechnete Dolmetschmodell gpt-realtime-translate. Daher erscheinen sie nicht im Dolmetscher-Wähler. Zum Prüfdatum sind keine offiziellen IDs gpt-live-1 oder gpt-live-1-mini veröffentlicht; auch diese unbestätigten IDs werden nicht angeboten.',
    securityTitle: 'Schutz für Schlüssel und Budget',
    securityIntro: 'Ein Budgetalarm allein verhindert keinen Abrechnungsvorfall. Verwenden Sie alle vier folgenden Ebenen.',
    safeguards: [
      {
        title: 'Quotas und Projektlimits zuerst senken',
        body: 'Googles anpassbare Anfrage- und Durchsatz-quotas auf das reale Volumen senken. In OpenAI Admin Projects pro Modell rate limits und ein project hard spend limit setzen. Eine Google-quota allein ist keine genaue Dollar-Obergrenze.',
      },
      {
        title: 'Budgettyp prüfen',
        body: 'Googles alerts-only budgets stoppen die Nutzung nicht. Spend caps sind Preview und gelten nur für eligible services; Unterstützung prüfen und für nicht unterstützte Dienste kleine quotas mit Pub/Sub-Automatisierung kombinieren.',
      },
      {
        title: 'BYOK und geteilte Schlüssel trennen',
        body: 'Der persönliche BYOK-Ablauf hält den Nutzerschlüssel im Tab oder Gerätespeicher und sendet ihn an eine gleichursprüngliche Vercel-Funktion, die ihn gegen ein kurzlebiges client secret tauscht. Nur dieses secret erreicht WebRTC. Ein Mehrbenutzerdienst mit Betreiber-Schlüssel muss ihn ausschließlich in Server-Umgebungsvariablen halten und Authentifizierung plus rate limits ergänzen.',
      },
      {
        title: 'Minimale Rechte je Schlüssel',
        body: 'Für Google-Schlüssel API- und unterstützte application-Einschränkungen setzen und Entwicklung von Produktion trennen. Schlüssel niemals in Logs, Fehlern oder exportiertem Untertitel-HTML speichern.',
      },
    ],
    alternativesTitle: 'Weitere Voice-AI-Alternativen',
    alternativesIntro: 'Die meisten Preise unten decken nur eine STT- oder TTS-Stufe ab. Vor dem Vergleich mit einem integrierten Dolmetscher STT + Übersetzung + TTS addieren.',
    freeLabel: 'Kostenloser Start',
    cautionLabel: 'Zu prüfen',
    officialPricing: 'Offizielle Preise',
    freeTitle: 'Kostenlose oder nahezu kostenlose Wege',
    freeOptions: [
      {
        title: 'Browser zuerst',
        body: 'Nutzen Sie on-device Translator im unterstützten Desktop-Chrome und platform speechSynthesis. Web Speech kann Server des Browseranbieters verwenden; daher weder Offline-Betrieb noch SLA versprechen.',
      },
      {
        title: 'Gemini Free tier',
        body: 'Nützlich für persönliches Lernen und Tests, vorbehaltlich rate limits und Datennutzungsbedingungen. Nicht als Produktionskostengarantie behandeln.',
      },
      {
        title: 'Lokale Open-Source-Lösung',
        body: 'whisper.cpp STT + lokales Übersetzungsmodell + Piper-Familien-TTS können API-Kosten vermeiden. Modell-Downloads, mobile Leistung, Akku, Hosting und Lizenzen bleiben reale Kosten.',
      },
      {
        title: 'Testguthaben',
        body: 'Einmalige Guthaben von AssemblyAI, Deepgram oder Gladia zum Qualitätsvergleich nutzen, aber nicht als wiederkehrendes monatliches Freikontingent einplanen.',
      },
    ],
    methodologyTitle: 'Umfang und Hinweise',
    methodology: 'Dies ist ein aus öffentlichen list prices normalisierter Designrechner, keine Rechnung. Ausgeschlossen sind Steuern, Wechselgebühren, Server/egress, Speicher, mehrere channel, Wiederholungen, prompt text token sowie regionale oder Mengenrabatte. Vor dem Start den aktuellen Konsolen-SKU mit dem usage einer kleinen echten Sitzung vergleichen.',
    source: 'Quelle',
    links: {
      geminiPricing: 'Gemini-Preise',
      cloudStt: 'Cloud-STT-Preise',
      cloudTts: 'Cloud-TTS-Preise',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Realtime-Kosten',
      realtime21Model: 'gpt-realtime-2.1-Modell',
      realtime21MiniModel: 'gpt-realtime-2.1-mini-Modell',
      chatGptApiBilling: 'ChatGPT- und API-Abrechnung',
      budgetAlerts: 'Budgetalarme',
      spendCaps: 'Ausgabenlimits',
      apiKeySecurity: 'API-Schlüsselsicherheit',
      openAiWebRtcSecurity: 'OpenAI-WebRTC-Sicherheit',
      openAiProjectControls: 'OpenAI-Projektsteuerung',
    },
  },
  vi: {
    pageEyebrow: 'Giá · kiến trúc · biện pháp bảo vệ',
    pageTitle: 'Kế hoạch chi phí AI giọng nói',
    pageIntro: 'So sánh này tách giá niêm yết chính thức khỏi giả định theo hai lộ trình thực tế của LikeParrot. Hãy bắt đầu với máy tính, rồi xem kiến trúc rẻ nhất và các lựa chọn miễn phí.',
    verified: 'Ngày kiểm tra giá',
    usdNotice: 'Mọi giá của nhà cung cấp đều tính bằng USD và có thể thay đổi.',
    recommendationTitle: 'Thứ tự triển khai tiết kiệm nhất',
    recommendationIntro: 'Ứng dụng tiết kiệm nhất khi ưu tiên khả năng của thiết bị và chỉ đưa bước còn thiếu sang API trả phí, thay vì giao cả ba bước cho một nhà cung cấp đám mây.',
    steps: [
      {
        title: '1. Mặc định dùng Văn bản trước',
        body: 'Thử Web Speech → Chrome Translator → TTS của thiết bị. Ở môi trường được hỗ trợ, hóa đơn API trực tiếp là $0 và bản ghi tạo từ văn bản trước cũng dễ duy trì hơn.',
      },
      {
        title: '2. Chỉ thay bước còn thiếu',
        body: 'Trên thiết bị di động không có dịch trong trình duyệt, giữ STT và TTS của thiết bị, chỉ gửi văn bản tới Flash-Lite để dịch. Chỉ bật Cloud STT V2 hoặc STT giá thấp khi chất lượng nhận dạng chưa đủ.',
      },
      {
        title: '3. Giữ kết nối Âm thanh trước thật ngắn',
        body: 'Gemini tính phí audio token đầu vào/đầu ra thực tế; OpenAI Translate và chép lời đầu vào tính theo audio duration trong thời gian kết nối, kể cả khoảng lặng giữa các câu. Ngắt kết nối khi không dùng và kết thúc phiên ngay khi cuộc trò chuyện xong.',
      },
    ],
    decisionTitle: 'Khuyến nghị cho ứng dụng này',
    decisions: [
      'Chi phí thấp nhất: ưu tiên lộ trình Văn bản trước trên trình duyệt, chỉ dùng máy chủ dự phòng cho bước không được hỗ trợ',
      'Phiên dịch đồng thời tự nhiên + ghi phụ đề nguồn: Gemini Live trả phí thường phù hợp hơn',
      'OpenAI: chỉ dịch là $2.04/giờ âm thanh đầu vào; cấu hình ghi nguồn hiện tại của LikeParrot là $3.06/giờ',
      'Gemini Free tier có giá $0 nhưng đầu vào có thể được dùng để cải thiện sản phẩm; nên dùng Paid tier cho cuộc trò chuyện nhạy cảm',
    ],
    googleTitle: 'Cấu trúc giá của Google',
    googleIntro: 'Luồng tích hợp Gemini và quy trình Cloud Speech là các sản phẩm và phạm vi tính phí riêng biệt.',
    geminiLiveTitle: 'Gemini 3.5 Live Translate',
    geminiLivePrice: 'Paid: audio đầu vào $3.50/M tokens + audio đầu ra $21/M tokens · 25 tokens/giây',
    geminiLiveBody: '60 phút đầu vào ($0.315) cộng 60 phút đầu ra đã dịch ($1.89) có giá $2.205, tức khoảng $2.21. Google nêu giá hiệu dụng kết hợp khoảng $0.0368/phút. Chi phí giảm theo tỷ lệ khi ngắt kết nối lúc không dùng hoặc khi đầu ra ngắn hơn.',
    freeTierTitle: 'Gói miễn phí',
    geminiFree: 'Developer API ghi Free tier ở mức $0 với rate limit; yêu cầu có thể được dùng để cải thiện sản phẩm. Paid tier được ghi là không dùng cho mục đích đó.',
    cloudSttTitle: 'Cloud Speech-to-Text V2',
    cloudSttPrice: 'Standard recognition $0.016/phút cho 500,000 phút đầu mỗi tháng · dynamic batch $0.003/phút',
    cloudSttBody: 'Ứng dụng học trực tiếp dùng mức Standard streaming, ước tính ở đây là $0.96 mỗi giờ âm thanh đầu vào. 60 phút miễn phí đầu mỗi tháng áp dụng cho các SKU V1, không áp dụng cho V2 Standard.',
    cloudTtsTitle: 'Cloud Text-to-Speech là tùy chọn',
    cloudTtsBody: 'Phát lại bản ghi hiện dùng TTS của thiết bị với giá $0. Cloud TTS sẽ thêm phí theo ký tự: Standard/WaveNet $4/M characters (miễn phí 4M/tháng), Neural2 $16/M (miễn phí 1M) hoặc Chirp 3 HD $30/M (miễn phí 1M).',
    translationAssumptionTitle: 'Ước tính dịch Gemini 3.5 Flash-Lite',
    translationAssumptionBody: 'Giá chính thức là $0.30/M text tokens đầu vào và $2.50/M đầu ra. Khoảng $0.03–$0.06/giờ âm thanh đầu vào trong máy tính giả định khoảng 43,000 ký tự/giờ và 10.75K–21.5K tokens ở mỗi phía; chưa gồm prompt token. Google không bán dịch vụ này như một sản phẩm tính theo giờ.',
    googleLinks: 'Nguồn chính thức của Google',
    openAiTitle: 'Cấu trúc giá của OpenAI',
    openAiIntro: 'Mô hình phiên dịch chuyên dụng được tính khác với các tác nhân giọng nói Realtime thông thường. Ứng dụng này sử dụng thanh toán và tín dụng OpenAI API riêng; gói ChatGPT Plus/Pro không bao gồm mức sử dụng API.',
    openAiTranslateTitle: 'gpt-realtime-translate',
    openAiTranslatePrice: 'Audio dịch $0.034/phút · $2.04/giờ âm thanh đầu vào · không có Free tier',
    openAiTranslateBody: 'Đây là giá base của gpt-realtime-translate. Phiên Translation chính thức tiếp tục gửi âm thanh khi đang kết nối, kể cả khoảng lặng giữa các câu, nên máy tính mặc định đầu vào là 100% trong lúc kết nối. Hãy tiết kiệm bằng cách kết thúc phiên ngay khi cuộc trò chuyện hoàn tất.',
    openAiTranscriptTitle: 'Cấu hình LikeParrot hiện tại: $3.06/giờ âm thanh đầu vào',
    openAiTranscriptBody: 'Cách triển khai hiện tại còn bật chép lời đầu vào gpt-realtime-whisper để lưu câu nguồn. Hướng dẫn chi phí Realtime nêu input transcription dùng rate card riêng: $0.034 + $0.017 = $0.051/phút. Chỉ dùng giá base $2.04/giờ khi tắt ghi nguồn.',
    openAiOtherModelsTitle: 'Mô hình tác nhân giọng nói Realtime',
    openAiOtherModelsBody: 'Audio của gpt-realtime-2.1 có giá $32/M tokens đầu vào và $64/M đầu ra; gpt-realtime-2.1-mini có giá $10/M đầu vào và $20/M đầu ra. Đây là các tác nhân giọng nói đa dụng tính phí theo audio token dùng trong mỗi Response, khác với gpt-realtime-translate chuyên phiên dịch và tính theo audio duration, nên chúng không có trong bộ chọn phiên dịch. Tại ngày kiểm tra, chưa có ID mô hình chính thức gpt-live-1 hay gpt-live-1-mini; các ID chưa xác minh này cũng không được cung cấp.',
    securityTitle: 'Bảo vệ khóa và ngân sách',
    securityIntro: 'Chỉ cảnh báo ngân sách không thể ngăn sự cố tính phí. Hãy dùng cả bốn lớp sau.',
    safeguards: [
      {
        title: 'Giảm quota và giới hạn dự án trước',
        body: 'Giảm quota yêu cầu và thông lượng có thể điều chỉnh của Google theo lượng người dùng thực tế. Trong OpenAI Admin Projects, đặt rate limit theo mô hình và project hard spend limit. Chỉ quota Google không phải hard cap chính xác theo USD.',
      },
      {
        title: 'Kiểm tra loại ngân sách',
        body: 'Alerts-only budget của Google không dừng mức sử dụng. Spend cap đang ở Preview và chỉ áp dụng cho eligible services; hãy kiểm tra hỗ trợ và kết hợp quota nhỏ với tự động hóa Pub/Sub cho dịch vụ không được hỗ trợ.',
      },
      {
        title: 'Tách BYOK khỏi khóa dùng chung',
        body: 'Luồng BYOK cá nhân giữ khóa người dùng trong tab hoặc bộ nhớ thiết bị rồi gửi tới hàm Vercel cùng nguồn để đổi lấy client secret ngắn hạn. Chỉ secret đó tới WebRTC. Dịch vụ nhiều người dùng với khóa của nhà vận hành phải giữ khóa chỉ trong biến môi trường máy chủ và thêm xác thực cùng rate limit.',
      },
      {
        title: 'Quyền tối thiểu cho từng khóa',
        body: 'Áp dụng cả giới hạn API và application được hỗ trợ cho khóa Google, đồng thời tách môi trường phát triển khỏi sản xuất. Không bao giờ đưa khóa vào log, lỗi hay HTML phụ đề đã xuất.',
      },
    ],
    alternativesTitle: 'Các phương án Voice AI khác',
    alternativesIntro: 'Phần lớn giá dưới đây chỉ bao phủ một bước STT hoặc TTS. Hãy cộng STT + dịch + TTS trước khi so sánh với trình phiên dịch tích hợp.',
    freeLabel: 'Bắt đầu miễn phí',
    cautionLabel: 'Cần kiểm tra',
    officialPricing: 'Giá chính thức',
    freeTitle: 'Các lộ trình miễn phí hoặc gần như miễn phí',
    freeOptions: [
      {
        title: 'Ưu tiên trình duyệt',
        body: 'Dùng on-device Translator trong Chrome máy tính được hỗ trợ và speechSynthesis của nền tảng. Web Speech có thể dùng máy chủ của nhà cung cấp trình duyệt, vì vậy không nên cam kết chạy ngoại tuyến hay SLA.',
      },
      {
        title: 'Gemini Free tier',
        body: 'Hữu ích cho học cá nhân và thử nghiệm, tùy thuộc rate limit và điều khoản dùng dữ liệu. Không xem đây là bảo đảm chi phí sản xuất.',
      },
      {
        title: 'Nguồn mở cục bộ',
        body: 'whisper.cpp STT + mô hình dịch cục bộ + TTS dòng Piper có thể bỏ phí API. Việc tải mô hình, hiệu năng di động, pin, lưu trữ và giấy phép vẫn là chi phí thực.',
      },
      {
        title: 'Tín dụng dùng thử',
        body: 'Dùng tín dụng một lần của AssemblyAI, Deepgram hoặc Gladia để so sánh chất lượng, nhưng không tính như hạn mức miễn phí hàng tháng lặp lại.',
      },
    ],
    methodologyTitle: 'Phạm vi và lưu ý',
    methodology: 'Đây là công cụ ước tính thiết kế được chuẩn hóa từ public list price, không phải hóa đơn. Chưa gồm thuế, phí đổi ngoại tệ, máy chủ/egress, lưu trữ, nhiều channel, lần thử lại, prompt text token và chiết khấu khu vực hoặc số lượng. Trước khi ra mắt, hãy so sánh SKU hiện tại trong bảng điều khiển với usage của một phiên thực nhỏ.',
    source: 'Nguồn',
    links: {
      geminiPricing: 'Giá Gemini',
      cloudStt: 'Giá Cloud STT',
      cloudTts: 'Giá Cloud TTS',
      realtimeTranslate: 'Realtime Translate',
      realtimeWhisper: 'Realtime Whisper',
      realtimeCosts: 'Chi phí Realtime',
      realtime21Model: 'Mô hình gpt-realtime-2.1',
      realtime21MiniModel: 'Mô hình gpt-realtime-2.1-mini',
      chatGptApiBilling: 'Thanh toán ChatGPT và API',
      budgetAlerts: 'Cảnh báo ngân sách',
      spendCaps: 'Giới hạn chi tiêu',
      apiKeySecurity: 'Bảo mật khóa API',
      openAiWebRtcSecurity: 'Bảo mật OpenAI WebRTC',
      openAiProjectControls: 'Kiểm soát dự án OpenAI',
    },
  },
} as const;

function OfficialLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:border-indigo-400/60 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function DetailBlock({
  title,
  price,
  body,
}: {
  title: string;
  price?: string;
  body: string;
}) {
  return (
    <div className="border-t border-[var(--app-border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="text-sm font-bold">{title}</h3>
      {price && <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">{price}</p>}
      <p className="mt-1.5 text-sm leading-6 text-[var(--app-muted)]">{body}</p>
    </div>
  );
}

export function BillingPlanPage({ uiLanguageCode }: BillingPlanPageProps) {
  const locale = resolveBillingLocale(uiLanguageCode);
  const t = COPY[locale];

  return (
    <div lang={BILLING_LOCALE_TAGS[locale]} className="w-full space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-7">
      <header className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">{t.pageEyebrow}</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-4xl">{t.pageTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)] sm:text-base">{t.pageIntro}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 px-3 py-2 text-xs leading-5 text-[var(--app-muted)]">
            <p><span className="font-semibold text-[var(--app-text)]">{t.verified}</span> · {PRICING_LAST_VERIFIED}</p>
            <p>{t.usdNotice}</p>
          </div>
        </div>
      </header>

      <CostCalculator locale={locale} />

      <section aria-labelledby="billing-cheapest-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Route className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="billing-cheapest-title" className="text-xl font-bold tracking-tight">{t.recommendationTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{t.recommendationIntro}</p>
          </div>
        </div>

        <ol className="mt-5 grid gap-3 lg:grid-cols-3">
          {t.steps.map((step) => (
            <li key={step.title} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 p-4">
              <h3 className="font-bold text-emerald-400">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4">
          <h3 className="flex items-center gap-2 font-bold text-indigo-300 [[data-theme=light]_&]:text-indigo-800">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t.decisionTitle}
          </h3>
          <ul className="mt-3 space-y-2">
            {t.decisions.map((decision) => (
              <li key={decision} className="flex items-start gap-2 text-sm leading-6 text-[var(--app-muted)]">
                <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="billing-google-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
          <div className="flex items-start gap-3 border-b border-[var(--app-border)] pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
              <Cloud className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="billing-google-title" className="text-xl font-bold tracking-tight">{t.googleTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{t.googleIntro}</p>
            </div>
          </div>
          <div className="pt-4">
            <DetailBlock title={t.geminiLiveTitle} price={t.geminiLivePrice} body={t.geminiLiveBody} />
            <DetailBlock title={t.freeTierTitle} body={t.geminiFree} />
            <DetailBlock title={t.cloudSttTitle} price={t.cloudSttPrice} body={t.cloudSttBody} />
            <DetailBlock title={t.cloudTtsTitle} body={t.cloudTtsBody} />
            <DetailBlock title={t.translationAssumptionTitle} body={t.translationAssumptionBody} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <OfficialLink href={PRICING_SOURCES.geminiPricing}>{t.links.geminiPricing}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.googleSttPricing}>{t.links.cloudStt}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.googleTtsPricing}>{t.links.cloudTts}</OfficialLink>
          </div>
        </section>

        <section aria-labelledby="billing-openai-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
          <div className="flex items-start gap-3 border-b border-[var(--app-border)] pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="billing-openai-title" className="text-xl font-bold tracking-tight">{t.openAiTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{t.openAiIntro}</p>
            </div>
          </div>
          <div className="pt-4">
            <DetailBlock title={t.openAiTranslateTitle} price={t.openAiTranslatePrice} body={t.openAiTranslateBody} />
            <DetailBlock title={t.openAiTranscriptTitle} body={t.openAiTranscriptBody} />
            <DetailBlock title={t.openAiOtherModelsTitle} body={t.openAiOtherModelsBody} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <OfficialLink href={PRICING_SOURCES.openAiTranslate}>{t.links.realtimeTranslate}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.openAiTranscribe}>{t.links.realtimeWhisper}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.openAiRealtime21}>{t.links.realtime21Model}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.openAiRealtime21Mini}>{t.links.realtime21MiniModel}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.openAiRealtimeCosts}>{t.links.realtimeCosts}</OfficialLink>
            <OfficialLink href={PRICING_SOURCES.openAiChatGptApiBilling}>{t.links.chatGptApiBilling}</OfficialLink>
          </div>
        </section>
      </div>

      <section aria-labelledby="billing-security-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="billing-security-title" className="text-xl font-bold tracking-tight">{t.securityTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{t.securityIntro}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {t.safeguards.map((item, index) => {
            const icons = [Gauge, WalletCards, LockKeyhole, ShieldCheck] as const;
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <article key={item.title} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 p-4">
                <h3 className="flex items-center gap-2 font-bold">
                  <Icon className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
              </article>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <OfficialLink href={PRICING_SOURCES.googleBudgets}>{t.links.budgetAlerts}</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.googleSpendCaps}>{t.links.spendCaps}</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.googleApiKeySecurity}>{t.links.apiKeySecurity}</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.openAiWebRtc}>{t.links.openAiWebRtcSecurity}</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.openAiProjectControls}>{t.links.openAiProjectControls}</OfficialLink>
        </div>
      </section>

      <section aria-labelledby="billing-alternatives-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
            <Server className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="billing-alternatives-title" className="text-xl font-bold tracking-tight">{t.alternativesTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{t.alternativesIntro}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {VOICE_ALTERNATIVES.map((provider) => (
            <article key={provider.id} className="flex flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 p-4">
              <div>
                <h3 className="font-bold">{provider.name}</h3>
                <p className="mt-0.5 text-xs font-semibold text-cyan-400">{localized(provider.role, locale)}</p>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6">{localized(provider.price, locale)}</p>
              <dl className="mt-3 space-y-2 text-xs leading-5 text-[var(--app-muted)]">
                <div>
                  <dt className="font-bold text-[var(--app-text)]">{t.freeLabel}</dt>
                  <dd>{localized(provider.free, locale)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--app-text)]">{t.cautionLabel}</dt>
                  <dd>{localized(provider.caveat, locale)}</dd>
                </div>
              </dl>
              <a
                href={provider.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {t.officialPricing}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="billing-free-title" className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Laptop className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="billing-free-title" className="pt-1.5 text-xl font-bold tracking-tight">{t.freeTitle}</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {t.freeOptions.map((option) => (
            <article key={option.title} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]/60 p-4">
              <h3 className="font-bold text-emerald-400">{option.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{option.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <OfficialLink href={PRICING_SOURCES.chromeTranslator}>Chrome Translator</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.webSpeech}>Web Speech API</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.whisperCpp}>whisper.cpp</OfficialLink>
          <OfficialLink href={PRICING_SOURCES.piper}>Piper TTS</OfficialLink>
        </div>
      </section>

      <aside className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200 [[data-theme=light]_&]:text-rose-900">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-bold">{t.methodologyTitle}</h2>
          <p className="mt-1 opacity-90">{t.methodology}</p>
        </div>
      </aside>
    </div>
  );
}
