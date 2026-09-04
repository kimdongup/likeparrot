import { getUiStrings } from '../constants/translations';
import type {
  PipelineSelections,
  Stage1Option,
  Stage2Option,
  Stage3Option,
} from '../types';

export interface PipelineCombinationGuide {
  summary: string;
  situation: string;
  speed: string;
  accuracy: string;
  privacy: string;
  requirements: string;
  caution: string;
}

type GuideLanguage = 'ko' | 'en' | 'ja' | 'zh-TW' | 'zh' | 'es' | 'fr' | 'de' | 'vi';

interface EngineGuideCopy {
  situation: string;
  speed: string;
  accuracy: string;
  privacy: string;
  requirements: string;
  caution: string;
}

interface GuideCopy {
  engines: Record<Stage2Option, EngineGuideCopy>;
  profiles: {
    fastPipelinedStream: string;
    fastPipelinedAuto: string;
    fastPipelinedComplete: string;
    fastStandard: string;
    stablePipelinedStream: string;
    stablePipelinedAuto: string;
    stablePipelinedComplete: string;
    stableStandard: string;
  };
  inputSpeed: Record<Stage1Option, string>;
  inputAccuracy: Record<Stage1Option, string>;
  outputSpeed: {
    standard: string;
    stream: string;
    auto: string;
    complete: string;
  };
  outputAccuracy: {
    standard: string;
    stream: string;
    complete: string;
  };
  outputCaution: {
    auto: string;
    complete: string;
  };
}

const BERGAMOT_GUIDE: EngineGuideCopy = {
  situation: 'Best on a phone or tablet PWA when you want translation without an API key.',
  speed: 'The first language pair downloads a compact model; later sentences stay on-device.',
  accuracy: 'Quality follows Firefox Translations models. Everyday phrases work well; names and CJK can be weaker than cloud engines.',
  privacy: 'After the model download, source text is translated in the browser and is not sent to a translation provider.',
  requirements: 'Requires WebAssembly workers, a secure page, and enough storage for the selected language pair.',
  caution: 'The first download can take time on a mobile network. iOS Safari may run out of memory on some devices.',
};

const GUIDE_COPY: Record<GuideLanguage, GuideCopy> = {
  en: {
    engines: {
      auto: {
        situation: 'Useful when device support and network conditions vary and you do not want to choose an engine in advance.',
        speed: 'Translation speed depends on the engine selected at runtime and whether that engine is ready.',
        accuracy: 'Translation quality follows the engine selected at runtime and can vary between sessions.',
        privacy: 'Translation stays on-device when an eligible desktop browser exposes Translator. Otherwise, the transcript is sent only to a configured Gemini or Azure engine.',
        requirements: 'Requires Web Speech and browser TTS. It checks the browser Translator API first, then configured Gemini and Azure credentials. Firefox and mobile browsers are excluded from the local route.',
        caution: 'Speed, quality, and data handling depend on the engine selected at runtime. Check the active engine indicator.',
      },
      chrome_nano: {
        situation: 'Best on a supported desktop browser when privacy and low repeat-practice latency matter most.',
        speed: 'After the language model is ready, translation is fast and avoids a network round trip.',
        accuracy: 'Useful for short everyday sentences; quality depends on the language pair and downloaded model.',
        privacy: 'Translation runs on the device with a downloaded model. Web Speech STT may still use a server depending on the browser and operating system.',
        requirements: 'Requires an eligible desktop Chrome, Edge, or Safari exposing the Translator API and a downloadable model for the selected language pair. Safari currently falls back because it does not expose this web API.',
        caution: 'It is not available on every browser, mobile device, or language pair, and the first model download can take time.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: 'Good for free conversation and longer sentences where context, idioms, and natural phrasing matter.',
        speed: 'Translation arrives as a stream, so completed phrases can be used before the full result is ready.',
        accuracy: 'Strong with context and natural phrasing, although paraphrases or omissions are still possible.',
        privacy: 'The speech transcript is sent to the Gemini API for translation, so this is not a fully offline mode.',
        requirements: 'Requires a valid Gemini API key and a stable network connection.',
        caution: 'Network latency and API quotas apply. Review important phrases against the source transcript.',
      },
      turbo_fastpath: {
        situation: 'Useful as the official network route when browser translation is unavailable or consistent cross-browser behavior is required.',
        speed: 'Azure typically responds quickly to short text, but network latency still applies.',
        accuracy: 'Designed for production text translation and supports every language offered by this app.',
        privacy: 'The transcript is sent through this app’s server endpoint to Azure and does not work offline.',
        requirements: 'Requires an Azure Translator resource, a saved subscription key, and a region for regional resources. The F0 tier can be used when available.',
        caution: 'Azure quotas and account terms apply. Do not save a key persistently on a shared device.',
      },
    },
    profiles: {
      fastPipelinedStream: 'Fast confirmation of short, clear speech with immediate playback of completed phrases suits travel role-play and quick-response drills.',
      fastPipelinedAuto: 'Fast confirmation of short, clear speech with early phrase playback when the selected engine supports streaming suits conversation drills.',
      fastPipelinedComplete: 'Fast confirmation of short, clear speech followed by immediate playback of the complete translation suits travel role-play and response drills.',
      fastStandard: 'Fast confirmation of short speech followed by natural playback of the complete translation suits sentence-by-sentence shadowing.',
      stablePipelinedStream: 'Stable endpoint detection with early playback of completed phrases suits lessons and interview practice with pauses or longer answers.',
      stablePipelinedAuto: 'Stable endpoint detection with early phrase playback when available suits lessons and interview practice with pauses or longer answers.',
      stablePipelinedComplete: 'Stable endpoint detection followed by immediate playback of the complete translation suits lessons and interview practice with longer answers.',
      stableStandard: 'Waiting for long or careful speech to finish before playing the complete sentence suits presentations and accuracy-focused study.',
    },
    inputSpeed: {
      webspeech_fast: 'Desktop speech is finalized after about 600 ms of ending silence. Android uses Chrome’s native speech end detection.',
      webspeech_std: 'Desktop speech is finalized after about 1000 ms of ending silence. Android uses Chrome’s native speech end detection to avoid cutting long speech.',
    },
    inputAccuracy: {
      webspeech_fast: 'Works well for short, clear speech but may mistake a long mid-sentence pause for the end.',
      webspeech_std: 'Reduces premature splits when you speak slowly or pause within a sentence.',
    },
    outputSpeed: {
      standard: 'Playback starts after the entire translation is complete, so first audio is later but the flow is stable.',
      stream: 'Completed Gemini phrases enter the TTS queue immediately, allowing speech to start before the full translation finishes.',
      auto: 'Completed phrases play early when automatic routing selects Gemini streaming. Chrome and network engines play after the full result, much like standard output.',
      complete: 'This engine does not provide partial phrases, so TTS starts after the full result and offers little timing advantage over standard output.',
    },
    outputAccuracy: {
      standard: 'Speaking a complete sentence generally produces smoother prosody and sentence flow.',
      stream: 'Translation accuracy is unchanged, but phrase boundaries can make prosody less continuous when Gemini streaming is used.',
      complete: 'Because this engine returns the full translation at once, sentence flow is similar to standard output.',
    },
    outputCaution: {
      auto: 'Early phrase playback is faster only when automatic routing actually selects Gemini streaming.',
      complete: 'This engine does not stream partial translations, so phrase playback does not provide a speed advantage.',
    },
  },
  ko: {
    engines: {
      auto: {
        situation: '기기 지원 범위와 네트워크 상태가 달라 미리 엔진을 고르고 싶지 않을 때 유용합니다.',
        speed: '번역 속도는 실행 중 선택된 엔진과 해당 엔진의 준비 상태에 따라 달라집니다.',
        accuracy: '번역 품질은 실행 중 선택된 엔진을 따르며 세션마다 달라질 수 있습니다.',
        privacy: '지원되는 데스크톱 브라우저가 Translator API를 제공하면 기기에서 번역합니다. 그렇지 않으면 설정된 Gemini 또는 Azure로만 전사문을 보냅니다.',
        requirements: 'Web Speech와 브라우저 TTS가 필요합니다. 브라우저 Translator API를 먼저 확인한 뒤 설정된 Gemini와 Azure를 확인합니다. Firefox와 모바일 브라우저는 로컬 경로에서 제외됩니다.',
        caution: '속도, 품질, 데이터 처리 방식은 실행 중 선택된 엔진에 따라 달라집니다. 현재 엔진 표시를 확인하세요.',
      },
      chrome_nano: {
        situation: '지원되는 데스크톱 브라우저에서 개인정보 보호와 반복 연습의 짧은 지연 시간이 가장 중요할 때 적합합니다.',
        speed: '언어 모델이 준비된 뒤에는 네트워크 왕복 없이 빠르게 번역합니다.',
        accuracy: '짧은 일상 문장에 유용하며 품질은 언어 조합과 내려받은 모델에 따라 달라집니다.',
        privacy: '내려받은 모델로 기기에서 번역합니다. Web Speech STT는 브라우저와 운영체제에 따라 서버를 사용할 수도 있습니다.',
        requirements: 'Translator API를 실제 제공하는 데스크톱 Chrome·Edge·Safari 후보와 선택한 언어 조합용 모델이 필요합니다. 현재 Safari는 이 웹 API가 없어 클라우드로 넘어갑니다.',
        caution: '모든 브라우저, 모바일 기기, 언어 조합에서 사용할 수 있는 것은 아니며 최초 모델 다운로드에 시간이 걸릴 수 있습니다.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: '문맥, 관용 표현, 자연스러운 말투가 중요한 자유 대화와 긴 문장에 적합합니다.',
        speed: '번역이 스트림으로 도착하므로 전체 결과가 완성되기 전에 완료된 구절을 사용할 수 있습니다.',
        accuracy: '문맥과 자연스러운 표현에 강하지만 바꾸어 말하거나 일부 내용을 빠뜨릴 가능성은 있습니다.',
        privacy: '번역을 위해 음성 전사문이 Gemini API로 전송되므로 완전한 오프라인 모드는 아닙니다.',
        requirements: '유효한 Gemini API 키와 안정적인 네트워크 연결이 필요합니다.',
        caution: '네트워크 지연과 API 할당량의 영향을 받습니다. 중요한 표현은 원문 전사와 대조하세요.',
      },
      turbo_fastpath: {
        situation: '브라우저 번역을 사용할 수 없거나 브라우저마다 일관된 동작이 필요할 때 쓰는 공식 네트워크 경로입니다.',
        speed: '짧은 텍스트에는 보통 빠르게 응답하지만 네트워크 지연은 발생합니다.',
        accuracy: '운영용 텍스트 번역 서비스이며 이 앱에서 제공하는 모든 언어를 지원합니다.',
        privacy: '전사문이 이 앱의 서버 엔드포인트를 거쳐 Azure로 전송되며 오프라인에서는 작동하지 않습니다.',
        requirements: 'Azure Translator 리소스와 저장된 구독 키가 필요하며 지역 리소스는 리전도 필요합니다. 사용 가능하면 F0 등급을 쓸 수 있습니다.',
        caution: 'Azure 할당량과 계정 약관이 적용됩니다. 공용 기기에는 키를 계속 저장하지 마세요.',
      },
    },
    profiles: {
      fastPipelinedStream: '짧고 또렷한 말을 빠르게 확정하고 완성된 구절을 즉시 재생하므로 여행 역할극과 빠른 응답 훈련에 적합합니다.',
      fastPipelinedAuto: '짧고 또렷한 말을 빠르게 확정하고 선택된 엔진이 스트리밍을 지원할 때 구절을 일찍 재생하므로 회화 훈련에 적합합니다.',
      fastPipelinedComplete: '짧고 또렷한 말을 빠르게 확정한 뒤 전체 번역을 즉시 재생하므로 여행 역할극과 응답 훈련에 적합합니다.',
      fastStandard: '짧은 말을 빠르게 확정한 뒤 전체 번역을 자연스럽게 재생하므로 문장별 섀도잉에 적합합니다.',
      stablePipelinedStream: '발화 끝을 안정적으로 감지하고 완성된 구절을 일찍 재생하므로 중간에 쉬거나 길게 답하는 수업과 면접 연습에 적합합니다.',
      stablePipelinedAuto: '발화 끝을 안정적으로 감지하고 가능한 경우 구절을 일찍 재생하므로 중간에 쉬거나 길게 답하는 수업과 면접 연습에 적합합니다.',
      stablePipelinedComplete: '발화 끝을 안정적으로 감지한 뒤 전체 번역을 즉시 재생하므로 답변이 긴 수업과 면접 연습에 적합합니다.',
      stableStandard: '길거나 신중한 발화가 끝날 때까지 기다린 뒤 전체 문장을 재생하므로 발표와 정확성 중심 학습에 적합합니다.',
    },
    inputSpeed: {
      webspeech_fast: '데스크톱은 약 600ms의 끝 침묵 후 확정합니다. 안드로이드는 Chrome의 음성 종료 감지를 사용합니다.',
      webspeech_std: '데스크톱은 약 1000ms의 끝 침묵 후 확정합니다. 안드로이드는 긴 발화가 잘리지 않도록 Chrome의 음성 종료 감지를 사용합니다.',
    },
    inputAccuracy: {
      webspeech_fast: '짧고 또렷한 말에 잘 맞지만 문장 중간의 긴 쉼을 발화 종료로 오인할 수 있습니다.',
      webspeech_std: '천천히 말하거나 문장 중간에 쉬어도 너무 일찍 문장이 나뉘는 현상을 줄입니다.',
    },
    outputSpeed: {
      standard: '전체 번역이 완성된 뒤 재생하므로 첫 음성은 늦지만 흐름은 안정적입니다.',
      stream: '완성된 Gemini 구절을 즉시 TTS 대기열에 넣어 전체 번역이 끝나기 전에 음성을 시작할 수 있습니다.',
      auto: '자동 선택이 Gemini 스트리밍을 고르면 완성된 구절을 일찍 재생합니다. 브라우저와 Azure 엔진은 표준 출력처럼 전체 결과 뒤에 재생합니다.',
      complete: '이 엔진은 부분 구절을 제공하지 않으므로 전체 결과 뒤에 TTS가 시작되어 표준 출력보다 시간상 이점이 거의 없습니다.',
    },
    outputAccuracy: {
      standard: '완전한 문장을 한 번에 읽으면 일반적으로 억양과 문장 흐름이 더 자연스럽습니다.',
      stream: '번역 정확도는 같지만 Gemini 스트리밍에서는 구절 경계 때문에 억양의 연결이 덜 자연스러울 수 있습니다.',
      complete: '이 엔진은 전체 번역을 한 번에 반환하므로 문장 흐름이 표준 출력과 비슷합니다.',
    },
    outputCaution: {
      auto: '자동 선택이 실제로 Gemini 스트리밍을 고를 때만 구절 조기 재생이 더 빠릅니다.',
      complete: '이 엔진은 부분 번역을 스트리밍하지 않으므로 구절 재생 방식의 속도 이점이 없습니다.',
    },
  },
  ja: {
    engines: {
      auto: {
        situation: '端末の対応状況やネットワーク状態が変わり、事前にエンジンを選びたくない場合に便利です。',
        speed: '翻訳速度は実行時に選ばれたエンジンと、その準備状況によって変わります。',
        accuracy: '翻訳品質は実行時に選ばれたエンジンに左右され、セッションごとに変わる場合があります。',
        privacy: 'Chrome 翻訳が利用できる場合は端末上で翻訳します。それ以外では、文字起こしが Gemini または外部翻訳サービスに送信されることがあります。',
        requirements: 'Web Speech とブラウザの TTS が必要です。Chrome 翻訳、API キーを使う Gemini、ネットワーク代替経路から利用可能なものを自動で選びます。',
        caution: '速度、品質、データの取り扱いは実行時に選ばれたエンジンによって変わります。使用中のエンジン表示を確認してください。',
      },
      chrome_nano: {
        situation: '対応するデスクトップ版 Chrome で、プライバシーと反復練習の低遅延を最優先する場合に適しています。',
        speed: '言語モデルの準備後は、ネットワークとの往復なしで高速に翻訳します。',
        accuracy: '短い日常文に向いており、品質は言語ペアとダウンロード済みモデルによって変わります。',
        privacy: 'ダウンロード済みモデルを使って端末上で翻訳します。Web Speech STT はブラウザや OS によってサーバーを使用する場合があります。',
        requirements: '組み込み Translator API に対応するデスクトップ版 Chrome と、選択した言語ペア用にダウンロード可能なモデルが必要です。',
        caution: 'すべてのブラウザ、モバイル端末、言語ペアで利用できるわけではなく、初回のモデル取得には時間がかかる場合があります。',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: '文脈、慣用表現、自然な言い回しが重要な自由会話や長い文に適しています。',
        speed: '翻訳がストリームで届くため、全体が完成する前に完了した句を利用できます。',
        accuracy: '文脈と自然な表現に強い一方、言い換えや一部の省略が起こる可能性はあります。',
        privacy: '翻訳のために音声の文字起こしが Gemini API に送信されるため、完全なオフラインモードではありません。',
        requirements: '有効な Gemini API キーと安定したネットワーク接続が必要です。',
        caution: 'ネットワーク遅延と API の割り当て上限が適用されます。重要な表現は原文の文字起こしと照合してください。',
      },
      turbo_fastpath: {
        situation: 'ブラウザ翻訳が使えない場合や、ブラウザ間で一貫した動作が必要な場合の公式ネットワーク経路です。',
        speed: '短いテキストには通常すばやく応答しますが、ネットワーク遅延があります。',
        accuracy: '実運用向けのテキスト翻訳で、このアプリの全言語に対応します。',
        privacy: '文字起こしは本アプリのサーバー経由で Azure に送信され、オフラインでは動作しません。',
        requirements: 'Azure Translator リソース、保存済みキー、地域リソースの場合はリージョンが必要です。利用可能なら F0 を選べます。',
        caution: 'Azure のクォータと規約が適用されます。共有端末にキーを永続保存しないでください。',
      },
    },
    profiles: {
      fastPipelinedStream: '短く明瞭な発話をすばやく確定し、完了した句をすぐ再生するため、旅行のロールプレイや即答練習に適しています。',
      fastPipelinedAuto: '短く明瞭な発話をすばやく確定し、選択されたエンジンがストリーミング対応なら句を早めに再生するため、会話練習に適しています。',
      fastPipelinedComplete: '短く明瞭な発話をすばやく確定した後、翻訳全体をすぐ再生するため、旅行のロールプレイや応答練習に適しています。',
      fastStandard: '短い発話をすばやく確定し、翻訳全体を自然に再生するため、一文ずつのシャドーイングに適しています。',
      stablePipelinedStream: '発話終了を安定して検出し、完了した句を早めに再生するため、間を置く授業や長めの回答を行う面接練習に適しています。',
      stablePipelinedAuto: '発話終了を安定して検出し、可能な場合は句を早めに再生するため、間を置く授業や長めの回答を行う面接練習に適しています。',
      stablePipelinedComplete: '発話終了を安定して検出した後、翻訳全体をすぐ再生するため、長めに答える授業や面接練習に適しています。',
      stableStandard: '長い発話や慎重な発話が終わるまで待って全文を再生するため、プレゼンテーションや正確さ重視の学習に適しています。',
    },
    inputSpeed: {
      webspeech_fast: 'デスクトップでは約600 msの無音後に確定します。AndroidではChromeの音声終了検出を使います。',
      webspeech_std: 'デスクトップでは約1000 msの無音後に確定します。Androidでは長い発話を切らないようChromeの音声終了検出を使います。',
    },
    inputAccuracy: {
      webspeech_fast: '短く明瞭な発話に向きますが、文中の長い間を発話終了と誤認する場合があります。',
      webspeech_std: 'ゆっくり話したり文中で間を置いたりしたときに、早すぎる分割を抑えます。',
    },
    outputSpeed: {
      standard: '翻訳全体の完了後に再生するため最初の音声は遅くなりますが、流れは安定します。',
      stream: '完了した Gemini の句をすぐ TTS キューへ入れるため、翻訳全体が終わる前に音声を開始できます。',
      auto: '自動選択が Gemini ストリーミングを選んだ場合は、完了した句を早めに再生します。Chrome とネットワークのエンジンは標準出力と同様に全結果の後で再生します。',
      complete: 'このエンジンは部分的な句を返さないため、TTS は全結果の後に始まり、標準出力に対する時間的な利点はほとんどありません。',
    },
    outputAccuracy: {
      standard: '文全体をまとめて読み上げると、一般に抑揚と文の流れがより自然になります。',
      stream: '翻訳精度は変わりませんが、Gemini ストリーミングでは句の境界によって抑揚の連続性が下がる場合があります。',
      complete: 'このエンジンは翻訳全体を一度に返すため、文の流れは標準出力とほぼ同じです。',
    },
    outputCaution: {
      auto: '自動選択が実際に Gemini ストリーミングを選んだ場合にだけ、句の早期再生が高速化につながります。',
      complete: 'このエンジンは部分翻訳をストリーミングしないため、句単位の再生による速度上の利点はありません。',
    },
  },
  'zh-TW': {
    engines: {
      auto: {
        situation: '適合裝置支援程度與網路狀況不固定，而且不想預先選擇引擎的情況。',
        speed: '翻譯速度取決於執行時選取的引擎及其準備狀態。',
        accuracy: '翻譯品質取決於執行時選取的引擎，且不同工作階段可能有所差異。',
        privacy: '若可使用 Chrome 翻譯工具，翻譯會留在裝置上；否則逐字稿可能傳送至 Gemini 或外部翻譯服務。',
        requirements: '需要 Web Speech 與瀏覽器 TTS。系統會在 Chrome 翻譯工具、使用 API 金鑰的 Gemini 和網路備援之間自動尋找可用路徑。',
        caution: '速度、品質與資料處理方式取決於執行時選取的引擎。請查看目前使用中的引擎指示。',
      },
      chrome_nano: {
        situation: '在受支援的桌面版 Chrome 上，最重視隱私及重複練習的低延遲時最合適。',
        speed: '語言模型準備完成後可快速翻譯，且不需要網路往返。',
        accuracy: '適合簡短的日常句子；品質取決於語言組合和下載的模型。',
        privacy: '使用下載的模型在裝置上翻譯。Web Speech STT 仍可能依瀏覽器與作業系統而使用伺服器。',
        requirements: '需要支援內建 Translator API 的桌面版 Chrome，以及可供所選語言組合下載的模型。',
        caution: '並非所有瀏覽器、行動裝置或語言組合都支援，首次下載模型也可能需要一些時間。',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: '適合重視語境、慣用語和自然措辭的自由對話與較長句子。',
        speed: '翻譯以串流方式送達，因此完整結果就緒前即可使用已完成的片語。',
        accuracy: '擅長掌握語境與自然措辭，但仍可能出現改寫或省略。',
        privacy: '語音逐字稿會傳送至 Gemini API 進行翻譯，因此並非完全離線模式。',
        requirements: '需要有效的 Gemini API 金鑰和穩定的網路連線。',
        caution: '會受到網路延遲與 API 配額限制。重要內容請與原文逐字稿核對。',
      },
      turbo_fastpath: {
        situation: '瀏覽器翻譯不可用或需要跨瀏覽器一致行為時使用的官方網路路徑。',
        speed: '短文字通常回應快速，但仍有網路延遲。',
        accuracy: '為正式文字翻譯設計，支援本應用程式提供的所有語言。',
        privacy: '逐字稿會經由本應用程式伺服器傳送至 Azure，無法離線運作。',
        requirements: '需要 Azure Translator 資源、已儲存的金鑰；區域資源也需要地區。可用時可選 F0。',
        caution: '須遵守 Azure 配額與條款。請勿在共用裝置上永久儲存金鑰。',
      },
    },
    profiles: {
      fastPipelinedStream: '快速確認簡短清楚的語音並立即播放已完成的片語，適合旅遊角色扮演和快速反應練習。',
      fastPipelinedAuto: '快速確認簡短清楚的語音，並在所選引擎支援串流時提早播放片語，適合會話練習。',
      fastPipelinedComplete: '快速確認簡短清楚的語音後立即播放完整翻譯，適合旅遊角色扮演和回答練習。',
      fastStandard: '快速確認簡短語音後自然播放完整翻譯，適合逐句跟讀練習。',
      stablePipelinedStream: '穩定偵測語音終點並提早播放已完成的片語，適合會停頓或回答較長的課程與面試練習。',
      stablePipelinedAuto: '穩定偵測語音終點，並在可用時提早播放片語，適合會停頓或回答較長的課程與面試練習。',
      stablePipelinedComplete: '穩定偵測語音終點後立即播放完整翻譯，適合回答較長的課程與面試練習。',
      stableStandard: '等待較長或謹慎的發言結束後再播放完整句子，適合簡報和重視準確度的學習。',
    },
    inputSpeed: {
      webspeech_fast: '桌面版在結尾靜音約600毫秒後確認；Android使用Chrome原生語音結束偵測。',
      webspeech_std: '桌面版在結尾靜音約1000毫秒後確認；Android使用Chrome原生偵測，避免截斷長句。',
    },
    inputAccuracy: {
      webspeech_fast: '適合簡短清楚的語音，但可能把句中的較長停頓誤判為結束。',
      webspeech_std: '在緩慢說話或句中停頓時，可減少過早切分。',
    },
    outputSpeed: {
      standard: '完整翻譯完成後才開始播放，因此第一段音訊較晚，但流程穩定。',
      stream: '已完成的 Gemini 片語會立即進入 TTS 佇列，因此完整翻譯結束前即可開始播放。',
      auto: '自動選擇 Gemini 串流時會提早播放已完成的片語。Chrome 與網路引擎則像標準輸出一樣，在完整結果後播放。',
      complete: '此引擎不提供部分片語，因此 TTS 會在完整結果後開始，與標準輸出相比幾乎沒有時間優勢。',
    },
    outputAccuracy: {
      standard: '一次朗讀完整句子通常能帶來更自然的語調與句子流暢度。',
      stream: '翻譯準確度不變，但使用 Gemini 串流時，片語邊界可能使語調較不連貫。',
      complete: '此引擎一次傳回完整翻譯，因此句子流暢度與標準輸出相近。',
    },
    outputCaution: {
      auto: '只有自動選擇實際採用 Gemini 串流時，提早播放片語才會更快。',
      complete: '此引擎不會串流部分翻譯，因此逐片語播放沒有速度優勢。',
    },
  },
  zh: {
    engines: {
      auto: {
        situation: '适合设备支持情况和网络条件不固定，并且不想预先选择引擎的场景。',
        speed: '翻译速度取决于运行时选择的引擎及其准备状态。',
        accuracy: '翻译质量取决于运行时选择的引擎，不同会话之间可能有所差异。',
        privacy: '如果 Chrome 翻译器可用，翻译会在设备上完成；否则转写文本可能会发送给 Gemini 或外部翻译服务。',
        requirements: '需要 Web Speech 和浏览器 TTS。系统会在 Chrome 翻译器、使用 API 密钥的 Gemini 和网络备用方案中自动寻找可用路径。',
        caution: '速度、质量和数据处理方式取决于运行时选择的引擎。请查看当前引擎指示。',
      },
      chrome_nano: {
        situation: '在受支持的桌面版 Chrome 上，最重视隐私和重复练习的低延迟时最合适。',
        speed: '语言模型准备好后，翻译速度很快，并且无需网络往返。',
        accuracy: '适合简短的日常句子；质量取决于语言组合和下载的模型。',
        privacy: '使用下载的模型在设备上翻译。Web Speech STT 仍可能根据浏览器和操作系统使用服务器。',
        requirements: '需要支持内置 Translator API 的桌面版 Chrome，以及可为所选语言组合下载的模型。',
        caution: '并非所有浏览器、移动设备或语言组合都支持，首次下载模型也可能需要一些时间。',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: '适合重视语境、习语和自然措辞的自由对话与较长句子。',
        speed: '翻译以流式方式到达，因此完整结果就绪前即可使用已完成的短语。',
        accuracy: '擅长理解语境和生成自然表达，但仍可能出现改写或遗漏。',
        privacy: '语音转写文本会发送到 Gemini API 进行翻译，因此这不是完全离线的模式。',
        requirements: '需要有效的 Gemini API 密钥和稳定的网络连接。',
        caution: '会受到网络延迟和 API 配额的影响。重要内容请与原文转写核对。',
      },
      turbo_fastpath: {
        situation: '浏览器翻译不可用或需要跨浏览器一致行为时使用的官方网络路径。',
        speed: '短文本通常响应较快，但仍受网络延迟影响。',
        accuracy: '面向正式文本翻译，并支持本应用提供的全部语言。',
        privacy: '转写文本会经由本应用服务器发送到 Azure，无法离线工作。',
        requirements: '需要 Azure Translator 资源和已保存的密钥；区域资源还需要地区。可用时可选择 F0。',
        caution: '适用 Azure 配额和账户条款。不要在共享设备上长期保存密钥。',
      },
    },
    profiles: {
      fastPipelinedStream: '快速确认简短清晰的语音并立即播放已完成的短语，适合旅行角色扮演和快速反应训练。',
      fastPipelinedAuto: '快速确认简短清晰的语音，并在所选引擎支持流式传输时提前播放短语，适合会话训练。',
      fastPipelinedComplete: '快速确认简短清晰的语音后立即播放完整翻译，适合旅行角色扮演和回答训练。',
      fastStandard: '快速确认短句后自然播放完整翻译，适合逐句跟读。',
      stablePipelinedStream: '稳定检测语音终点并提前播放已完成的短语，适合有停顿或回答较长的课程和面试练习。',
      stablePipelinedAuto: '稳定检测语音终点，并在可用时提前播放短语，适合有停顿或回答较长的课程和面试练习。',
      stablePipelinedComplete: '稳定检测语音终点后立即播放完整翻译，适合回答较长的课程和面试练习。',
      stableStandard: '等待较长或谨慎的发言结束后再播放完整句子，适合演示和注重准确度的学习。',
    },
    inputSpeed: {
      webspeech_fast: '桌面端在结尾静音约600毫秒后确认；Android使用Chrome原生语音结束检测。',
      webspeech_std: '桌面端在结尾静音约1000毫秒后确认；Android使用Chrome原生检测以避免截断长句。',
    },
    inputAccuracy: {
      webspeech_fast: '适合简短清晰的语音，但可能把句中的较长停顿误判为结束。',
      webspeech_std: '在缓慢说话或句中停顿时，可以减少过早切分。',
    },
    outputSpeed: {
      standard: '完整翻译完成后才开始播放，因此第一段音频较晚，但流程稳定。',
      stream: '已完成的 Gemini 短语会立即进入 TTS 队列，因此完整翻译结束前即可开始播放。',
      auto: '自动选择 Gemini 流式传输时会提前播放已完成的短语。Chrome 和网络引擎则像标准输出一样，在完整结果后播放。',
      complete: '此引擎不提供部分短语，因此 TTS 会在完整结果后开始，与标准输出相比几乎没有时间优势。',
    },
    outputAccuracy: {
      standard: '一次朗读完整句子通常能获得更自然的语调和句子流畅度。',
      stream: '翻译准确度不变，但使用 Gemini 流式传输时，短语边界可能使语调不够连贯。',
      complete: '此引擎一次返回完整翻译，因此句子流畅度与标准输出相近。',
    },
    outputCaution: {
      auto: '只有自动选择实际采用 Gemini 流式传输时，提前播放短语才会更快。',
      complete: '此引擎不流式传输部分翻译，因此逐短语播放没有速度优势。',
    },
  },
  es: {
    engines: {
      auto: {
        situation: 'Resulta útil cuando la compatibilidad del dispositivo y la red varían y no quieres elegir un motor de antemano.',
        speed: 'La velocidad depende del motor elegido durante la ejecución y de si está listo.',
        accuracy: 'La calidad depende del motor elegido durante la ejecución y puede variar entre sesiones.',
        privacy: 'La traducción permanece en el dispositivo cuando está disponible el traductor de Chrome. En caso contrario, la transcripción puede enviarse a Gemini o a un servicio externo.',
        requirements: 'Requiere Web Speech y el TTS del navegador. Busca automáticamente una ruta disponible entre el traductor de Chrome, Gemini con una clave de API y la alternativa en red.',
        caution: 'La velocidad, la calidad y el tratamiento de los datos dependen del motor elegido durante la ejecución. Comprueba el indicador del motor activo.',
      },
      chrome_nano: {
        situation: 'Es ideal en Chrome de escritorio compatible cuando importan sobre todo la privacidad y la baja latencia en prácticas repetitivas.',
        speed: 'Una vez preparado el modelo de idioma, traduce rápido y evita el recorrido de ida y vuelta por la red.',
        accuracy: 'Es útil para frases cotidianas breves; la calidad depende del par de idiomas y del modelo descargado.',
        privacy: 'La traducción se realiza en el dispositivo con un modelo descargado. Web Speech STT aún puede usar un servidor según el navegador y el sistema operativo.',
        requirements: 'Requiere Chrome de escritorio con la Translator API integrada y un modelo descargable para el par de idiomas elegido.',
        caution: 'No está disponible en todos los navegadores, móviles o pares de idiomas, y la primera descarga del modelo puede tardar.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: 'Es adecuado para conversaciones libres y frases largas donde importan el contexto, los modismos y una expresión natural.',
        speed: 'La traducción llega como flujo, por lo que las frases terminadas pueden usarse antes de que esté listo el resultado completo.',
        accuracy: 'Maneja bien el contexto y la expresión natural, aunque aún puede reformular u omitir contenido.',
        privacy: 'La transcripción de voz se envía a la API de Gemini para traducirla, por lo que no es un modo totalmente sin conexión.',
        requirements: 'Requiere una clave de API de Gemini válida y una conexión de red estable.',
        caution: 'Se aplican la latencia de red y las cuotas de la API. Contrasta las expresiones importantes con la transcripción original.',
      },
      turbo_fastpath: {
        situation: 'Ruta de red oficial cuando la traducción del navegador no está disponible o se necesita un comportamiento uniforme.',
        speed: 'Suele responder rápido con textos cortos, aunque existe latencia de red.',
        accuracy: 'Está diseñada para traducción de producción y admite todos los idiomas de la aplicación.',
        privacy: 'La transcripción se envía a Azure mediante el servidor de la aplicación y no funciona sin conexión.',
        requirements: 'Requiere un recurso de Azure Translator, una clave guardada y la región si el recurso es regional. Puede usarse F0 si está disponible.',
        caution: 'Se aplican las cuotas y condiciones de Azure. No guardes la clave en un dispositivo compartido.',
      },
    },
    profiles: {
      fastPipelinedStream: 'La confirmación rápida de voz breve y clara con reproducción inmediata de las frases terminadas es ideal para simulaciones de viaje y ejercicios de respuesta rápida.',
      fastPipelinedAuto: 'La confirmación rápida de voz breve y clara con reproducción anticipada cuando el motor admite transmisión es ideal para practicar conversación.',
      fastPipelinedComplete: 'La confirmación rápida de voz breve y clara seguida de la reproducción inmediata de toda la traducción es ideal para simulaciones de viaje y ejercicios de respuesta.',
      fastStandard: 'La confirmación rápida de intervenciones breves seguida de una reproducción natural de toda la traducción es ideal para repetir frase por frase.',
      stablePipelinedStream: 'La detección estable del final y la reproducción anticipada de frases terminadas son adecuadas para clases y entrevistas con pausas o respuestas largas.',
      stablePipelinedAuto: 'La detección estable del final y la reproducción anticipada cuando está disponible son adecuadas para clases y entrevistas con pausas o respuestas largas.',
      stablePipelinedComplete: 'La detección estable del final seguida de la reproducción inmediata de toda la traducción es adecuada para clases y entrevistas con respuestas largas.',
      stableStandard: 'Esperar a que termine una intervención larga o cuidadosa antes de reproducir la frase completa es adecuado para presentaciones y estudio centrado en la precisión.',
    },
    inputSpeed: {
      webspeech_fast: 'En escritorio se confirma tras unos 600 ms de silencio; Android usa la detección de fin de voz nativa de Chrome.',
      webspeech_std: 'En escritorio se confirma tras unos 1000 ms; Android usa la detección nativa de Chrome para no cortar frases largas.',
    },
    inputAccuracy: {
      webspeech_fast: 'Funciona bien con voz breve y clara, pero puede confundir una pausa larga dentro de la frase con el final.',
      webspeech_std: 'Reduce los cortes prematuros cuando hablas despacio o haces una pausa dentro de una frase.',
    },
    outputSpeed: {
      standard: 'La reproducción comienza cuando termina toda la traducción, por lo que el primer audio tarda más, pero el flujo es estable.',
      stream: 'Las frases terminadas de Gemini entran de inmediato en la cola TTS, lo que permite empezar a hablar antes de que finalice toda la traducción.',
      auto: 'Las frases terminadas se reproducen antes si la selección automática elige la transmisión de Gemini. Los motores de Chrome y red esperan al resultado completo, como la salida estándar.',
      complete: 'Este motor no ofrece frases parciales, así que el TTS comienza tras el resultado completo y apenas gana tiempo frente a la salida estándar.',
    },
    outputAccuracy: {
      standard: 'Leer una frase completa suele producir una prosodia y un ritmo más naturales.',
      stream: 'La precisión de la traducción no cambia, pero los límites entre frases pueden reducir la continuidad de la prosodia al transmitir con Gemini.',
      complete: 'Como este motor devuelve toda la traducción de una vez, el ritmo de la frase es similar al de la salida estándar.',
    },
    outputCaution: {
      auto: 'La reproducción anticipada solo es más rápida cuando la selección automática elige realmente la transmisión de Gemini.',
      complete: 'Este motor no transmite traducciones parciales, por lo que la reproducción por frases no aporta una ventaja de velocidad.',
    },
  },
  fr: {
    engines: {
      auto: {
        situation: 'Utile lorsque la prise en charge de l’appareil et les conditions réseau varient et que vous ne souhaitez pas choisir un moteur à l’avance.',
        speed: 'La vitesse dépend du moteur sélectionné à l’exécution et de son état de préparation.',
        accuracy: 'La qualité dépend du moteur sélectionné à l’exécution et peut varier d’une session à l’autre.',
        privacy: 'La traduction reste sur l’appareil lorsque le traducteur Chrome est disponible. Sinon, la transcription peut être envoyée à Gemini ou à un service externe.',
        requirements: 'Nécessite Web Speech et le TTS du navigateur. Le système recherche automatiquement une voie disponible entre le traducteur Chrome, Gemini avec une clé API et la solution de repli réseau.',
        caution: 'La vitesse, la qualité et le traitement des données dépendent du moteur choisi à l’exécution. Vérifiez l’indicateur du moteur actif.',
      },
      chrome_nano: {
        situation: 'Idéal dans une version de bureau compatible de Chrome lorsque la confidentialité et la faible latence des exercices répétés sont prioritaires.',
        speed: 'Une fois le modèle linguistique prêt, la traduction est rapide et évite un aller-retour réseau.',
        accuracy: 'Adapté aux courtes phrases du quotidien ; la qualité dépend de la paire de langues et du modèle téléchargé.',
        privacy: 'La traduction s’effectue sur l’appareil avec un modèle téléchargé. Web Speech STT peut néanmoins utiliser un serveur selon le navigateur et le système.',
        requirements: 'Nécessite Chrome pour ordinateur avec la Translator API intégrée et un modèle téléchargeable pour la paire de langues choisie.',
        caution: 'Cette option n’est pas disponible sur tous les navigateurs, appareils mobiles ou paires de langues, et le premier téléchargement peut prendre du temps.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: 'Adapté aux conversations libres et aux phrases longues où le contexte, les expressions idiomatiques et le naturel comptent.',
        speed: 'La traduction arrive sous forme de flux, ce qui permet d’utiliser les segments terminés avant que le résultat complet soit prêt.',
        accuracy: 'Performant pour le contexte et les formulations naturelles, même si des reformulations ou omissions restent possibles.',
        privacy: 'La transcription vocale est envoyée à l’API Gemini pour être traduite ; ce mode n’est donc pas entièrement hors ligne.',
        requirements: 'Nécessite une clé API Gemini valide et une connexion réseau stable.',
        caution: 'La latence réseau et les quotas de l’API s’appliquent. Vérifiez les passages importants dans la transcription source.',
      },
      turbo_fastpath: {
        situation: 'Voie réseau officielle lorsque la traduction du navigateur est indisponible ou qu’un comportement uniforme est requis.',
        speed: 'Réponse généralement rapide pour les textes courts, avec la latence du réseau.',
        accuracy: 'Conçu pour la traduction en production et compatible avec toutes les langues de l’application.',
        privacy: 'La transcription est envoyée à Azure via le serveur de l’application et ne fonctionne pas hors ligne.',
        requirements: 'Nécessite une ressource Azure Translator, une clé enregistrée et la région pour une ressource régionale. F0 est utilisable si disponible.',
        caution: 'Les quotas et conditions Azure s’appliquent. Ne conservez pas la clé sur un appareil partagé.',
      },
    },
    profiles: {
      fastPipelinedStream: 'La validation rapide d’une parole courte et claire avec lecture immédiate des segments terminés convient aux jeux de rôle de voyage et aux exercices de réponse rapide.',
      fastPipelinedAuto: 'La validation rapide d’une parole courte et claire avec lecture anticipée lorsque le moteur permet le streaming convient aux exercices de conversation.',
      fastPipelinedComplete: 'La validation rapide d’une parole courte et claire suivie de la lecture immédiate de toute la traduction convient aux jeux de rôle de voyage et aux exercices de réponse.',
      fastStandard: 'La validation rapide d’une courte intervention suivie d’une lecture naturelle de toute la traduction convient au shadowing phrase par phrase.',
      stablePipelinedStream: 'La détection stable de la fin de parole avec lecture anticipée des segments terminés convient aux cours et entretiens comprenant des pauses ou de longues réponses.',
      stablePipelinedAuto: 'La détection stable de la fin de parole avec lecture anticipée lorsqu’elle est disponible convient aux cours et entretiens comprenant des pauses ou de longues réponses.',
      stablePipelinedComplete: 'La détection stable de la fin de parole suivie de la lecture immédiate de toute la traduction convient aux cours et entretiens comportant de longues réponses.',
      stableStandard: 'Attendre la fin d’une intervention longue ou réfléchie avant de lire la phrase entière convient aux présentations et à l’étude axée sur la précision.',
    },
    inputSpeed: {
      webspeech_fast: 'Sur ordinateur, la parole est finalisée après environ 600 ms de silence ; Android utilise la détection native de Chrome.',
      webspeech_std: 'Sur ordinateur, elle est finalisée après environ 1 000 ms ; Android utilise la détection native de Chrome pour préserver les phrases longues.',
    },
    inputAccuracy: {
      webspeech_fast: 'Convient à une parole courte et claire, mais peut prendre une longue pause au milieu d’une phrase pour la fin.',
      webspeech_std: 'Réduit les coupures prématurées lorsque vous parlez lentement ou marquez une pause dans une phrase.',
    },
    outputSpeed: {
      standard: 'La lecture commence après la traduction complète ; le premier son arrive donc plus tard, mais le déroulement reste stable.',
      stream: 'Les segments Gemini terminés entrent immédiatement dans la file TTS, ce qui permet de commencer la lecture avant la fin de la traduction.',
      auto: 'Les segments terminés sont lus plus tôt si la sélection automatique choisit le streaming Gemini. Les moteurs Chrome et réseau attendent le résultat complet, comme la sortie standard.',
      complete: 'Ce moteur ne fournit pas de segments partiels ; le TTS commence donc après le résultat complet et offre peu de gain par rapport à la sortie standard.',
    },
    outputAccuracy: {
      standard: 'La lecture d’une phrase complète produit généralement une prosodie et un enchaînement plus naturels.',
      stream: 'La précision de la traduction reste identique, mais les limites de segments peuvent rendre la prosodie moins continue avec le streaming Gemini.',
      complete: 'Comme ce moteur renvoie toute la traduction en une fois, l’enchaînement est proche de celui de la sortie standard.',
    },
    outputCaution: {
      auto: 'La lecture anticipée n’est plus rapide que si la sélection automatique choisit réellement le streaming Gemini.',
      complete: 'Ce moteur ne diffuse pas de traductions partielles ; la lecture par segments n’apporte donc aucun gain de vitesse.',
    },
  },
  de: {
    engines: {
      auto: {
        situation: 'Sinnvoll, wenn Geräteunterstützung und Netzwerkbedingungen schwanken und Sie nicht vorab eine Engine wählen möchten.',
        speed: 'Die Geschwindigkeit hängt von der zur Laufzeit ausgewählten Engine und deren Bereitschaft ab.',
        accuracy: 'Die Qualität richtet sich nach der zur Laufzeit ausgewählten Engine und kann zwischen Sitzungen variieren.',
        privacy: 'Wenn der Chrome-Übersetzer verfügbar ist, bleibt die Übersetzung auf dem Gerät. Andernfalls kann das Transkript an Gemini oder einen externen Dienst gesendet werden.',
        requirements: 'Erfordert Web Speech und Browser-TTS. Das System sucht automatisch einen verfügbaren Weg über den Chrome-Übersetzer, Gemini mit API-Schlüssel oder den Netzwerk-Fallback.',
        caution: 'Geschwindigkeit, Qualität und Datenverarbeitung hängen von der zur Laufzeit gewählten Engine ab. Prüfen Sie die Anzeige der aktiven Engine.',
      },
      chrome_nano: {
        situation: 'Ideal in unterstütztem Desktop-Chrome, wenn Datenschutz und geringe Latenz bei wiederholten Übungen besonders wichtig sind.',
        speed: 'Sobald das Sprachmodell bereit ist, erfolgt die Übersetzung schnell und ohne Netzwerk-Rundweg.',
        accuracy: 'Geeignet für kurze Alltagssätze; die Qualität hängt vom Sprachpaar und dem heruntergeladenen Modell ab.',
        privacy: 'Die Übersetzung läuft mit einem heruntergeladenen Modell auf dem Gerät. Web Speech STT kann je nach Browser und Betriebssystem dennoch einen Server verwenden.',
        requirements: 'Erfordert Desktop-Chrome mit integrierter Translator API und ein herunterladbares Modell für das ausgewählte Sprachpaar.',
        caution: 'Nicht für jeden Browser, jedes Mobilgerät oder Sprachpaar verfügbar; auch der erste Modelldownload kann dauern.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: 'Geeignet für freie Gespräche und längere Sätze, bei denen Kontext, Redewendungen und natürliche Formulierungen wichtig sind.',
        speed: 'Die Übersetzung trifft als Stream ein, sodass fertige Abschnitte schon vor dem vollständigen Ergebnis verwendet werden können.',
        accuracy: 'Stark bei Kontext und natürlicher Formulierung, auch wenn Umschreibungen oder Auslassungen möglich bleiben.',
        privacy: 'Das Sprachtranskript wird zur Übersetzung an die Gemini API gesendet; dies ist daher kein vollständig offlinefähiger Modus.',
        requirements: 'Erfordert einen gültigen Gemini-API-Schlüssel und eine stabile Netzwerkverbindung.',
        caution: 'Netzwerklatenz und API-Kontingente gelten. Prüfen Sie wichtige Formulierungen anhand des Ausgangstranskripts.',
      },
      turbo_fastpath: {
        situation: 'Offizieller Netzwerkpfad, wenn Browserübersetzung fehlt oder browserübergreifend einheitliches Verhalten nötig ist.',
        speed: 'Kurze Texte werden meist schnell beantwortet, dennoch fällt Netzwerklatenz an.',
        accuracy: 'Für produktive Textübersetzung ausgelegt und mit allen Sprachen der App kompatibel.',
        privacy: 'Das Transkript wird über den App-Server an Azure gesendet und funktioniert nicht offline.',
        requirements: 'Erfordert eine Azure-Translator-Ressource, einen gespeicherten Schlüssel und bei regionalen Ressourcen die Region. F0 ist nutzbar, falls verfügbar.',
        caution: 'Azure-Kontingente und Bedingungen gelten. Schlüssel nicht dauerhaft auf gemeinsam genutzten Geräten speichern.',
      },
    },
    profiles: {
      fastPipelinedStream: 'Schnelle Bestätigung kurzer, deutlicher Sprache mit sofortiger Wiedergabe fertiger Abschnitte eignet sich für Reiserollenspiele und schnelle Antwortübungen.',
      fastPipelinedAuto: 'Schnelle Bestätigung kurzer, deutlicher Sprache mit früher Abschnittswiedergabe bei streamingfähiger Engine eignet sich für Konversationsübungen.',
      fastPipelinedComplete: 'Schnelle Bestätigung kurzer, deutlicher Sprache mit anschließender sofortiger Wiedergabe der vollständigen Übersetzung eignet sich für Reiserollenspiele und Antwortübungen.',
      fastStandard: 'Schnelle Bestätigung kurzer Äußerungen mit anschließender natürlicher Wiedergabe der vollständigen Übersetzung eignet sich zum satzweisen Nachsprechen.',
      stablePipelinedStream: 'Stabile Endpunkterkennung mit früher Wiedergabe fertiger Abschnitte eignet sich für Unterricht und Interviewübungen mit Pausen oder längeren Antworten.',
      stablePipelinedAuto: 'Stabile Endpunkterkennung mit früher Abschnittswiedergabe, sofern verfügbar, eignet sich für Unterricht und Interviewübungen mit Pausen oder längeren Antworten.',
      stablePipelinedComplete: 'Stabile Endpunkterkennung mit anschließender sofortiger Wiedergabe der vollständigen Übersetzung eignet sich für Unterricht und Interviewübungen mit längeren Antworten.',
      stableStandard: 'Das Warten auf das Ende langer oder bedachter Äußerungen vor der vollständigen Wiedergabe eignet sich für Präsentationen und genauigkeitsorientiertes Lernen.',
    },
    inputSpeed: {
      webspeech_fast: 'Am Desktop wird nach etwa 600 ms Stille abgeschlossen; Android nutzt Chromes native Spracherkennung für das Ende.',
      webspeech_std: 'Am Desktop wird nach etwa 1000 ms abgeschlossen; Android nutzt Chromes native Enderkennung, damit lange Sätze nicht abgeschnitten werden.',
    },
    inputAccuracy: {
      webspeech_fast: 'Funktioniert gut bei kurzer, deutlicher Sprache, kann aber eine lange Pause mitten im Satz für das Ende halten.',
      webspeech_std: 'Verringert vorzeitige Trennungen, wenn Sie langsam sprechen oder mitten im Satz pausieren.',
    },
    outputSpeed: {
      standard: 'Die Wiedergabe beginnt erst nach der vollständigen Übersetzung; der erste Ton kommt später, der Ablauf bleibt jedoch stabil.',
      stream: 'Fertige Gemini-Abschnitte gelangen sofort in die TTS-Warteschlange, sodass die Ausgabe vor Abschluss der gesamten Übersetzung beginnen kann.',
      auto: 'Fertige Abschnitte werden früher wiedergegeben, wenn die automatische Auswahl Gemini-Streaming wählt. Chrome- und Netzwerk-Engines warten wie die Standardausgabe auf das vollständige Ergebnis.',
      complete: 'Diese Engine liefert keine Teilabschnitte; TTS beginnt daher nach dem vollständigen Ergebnis und bietet kaum einen Zeitvorteil gegenüber der Standardausgabe.',
    },
    outputAccuracy: {
      standard: 'Die Wiedergabe eines vollständigen Satzes erzeugt meist eine natürlichere Prosodie und einen flüssigeren Satzverlauf.',
      stream: 'Die Übersetzungsgenauigkeit bleibt gleich, doch Abschnittsgrenzen können die Prosodie beim Gemini-Streaming weniger fließend machen.',
      complete: 'Da diese Engine die gesamte Übersetzung auf einmal liefert, ähnelt der Satzfluss der Standardausgabe.',
    },
    outputCaution: {
      auto: 'Die frühe Abschnittswiedergabe ist nur schneller, wenn die automatische Auswahl tatsächlich Gemini-Streaming verwendet.',
      complete: 'Diese Engine streamt keine Teilübersetzungen, daher bringt die abschnittsweise Wiedergabe keinen Geschwindigkeitsvorteil.',
    },
  },
  vi: {
    engines: {
      auto: {
        situation: 'Hữu ích khi khả năng hỗ trợ của thiết bị và điều kiện mạng thay đổi, đồng thời bạn không muốn chọn trước một công cụ.',
        speed: 'Tốc độ dịch phụ thuộc vào công cụ được chọn khi chạy và trạng thái sẵn sàng của công cụ đó.',
        accuracy: 'Chất lượng dịch phụ thuộc vào công cụ được chọn khi chạy và có thể khác nhau giữa các phiên.',
        privacy: 'Bản dịch được xử lý trên thiết bị khi Trình dịch Chrome khả dụng. Nếu không, bản chép lời có thể được gửi đến Gemini hoặc dịch vụ dịch bên ngoài.',
        requirements: 'Cần Web Speech và TTS của trình duyệt. Hệ thống tự tìm đường khả dụng giữa Trình dịch Chrome, Gemini dùng khóa API và phương án dự phòng qua mạng.',
        caution: 'Tốc độ, chất lượng và cách xử lý dữ liệu phụ thuộc vào công cụ được chọn khi chạy. Hãy kiểm tra chỉ báo công cụ đang hoạt động.',
      },
      chrome_nano: {
        situation: 'Phù hợp nhất trên Chrome máy tính được hỗ trợ khi quyền riêng tư và độ trễ thấp cho việc luyện tập lặp lại là ưu tiên hàng đầu.',
        speed: 'Sau khi mô hình ngôn ngữ sẵn sàng, quá trình dịch diễn ra nhanh và không cần một lượt đi về qua mạng.',
        accuracy: 'Hữu ích cho các câu giao tiếp ngắn; chất lượng phụ thuộc vào cặp ngôn ngữ và mô hình đã tải xuống.',
        privacy: 'Bản dịch chạy trên thiết bị bằng mô hình đã tải xuống. Web Speech STT vẫn có thể dùng máy chủ tùy theo trình duyệt và hệ điều hành.',
        requirements: 'Cần Chrome máy tính có Translator API tích hợp và mô hình có thể tải xuống cho cặp ngôn ngữ đã chọn.',
        caution: 'Không khả dụng trên mọi trình duyệt, thiết bị di động hoặc cặp ngôn ngữ; lần tải mô hình đầu tiên cũng có thể mất thời gian.',
      },
      bergamot: BERGAMOT_GUIDE,
      gemini_stream: {
        situation: 'Phù hợp với hội thoại tự do và câu dài, nơi ngữ cảnh, thành ngữ và cách diễn đạt tự nhiên rất quan trọng.',
        speed: 'Bản dịch đến dưới dạng luồng nên có thể dùng các cụm đã hoàn tất trước khi có toàn bộ kết quả.',
        accuracy: 'Xử lý tốt ngữ cảnh và cách diễn đạt tự nhiên, dù vẫn có thể diễn đạt lại hoặc bỏ sót nội dung.',
        privacy: 'Bản chép lời giọng nói được gửi đến Gemini API để dịch, vì vậy đây không phải chế độ hoàn toàn ngoại tuyến.',
        requirements: 'Cần khóa Gemini API hợp lệ và kết nối mạng ổn định.',
        caution: 'Có độ trễ mạng và giới hạn hạn mức API. Hãy đối chiếu các câu quan trọng với bản chép lời gốc.',
      },
      turbo_fastpath: {
        situation: 'Đường mạng chính thức khi dịch trên trình duyệt không khả dụng hoặc cần hành vi nhất quán giữa các trình duyệt.',
        speed: 'Thường phản hồi nhanh với văn bản ngắn nhưng vẫn có độ trễ mạng.',
        accuracy: 'Được thiết kế cho dịch văn bản chính thức và hỗ trợ mọi ngôn ngữ của ứng dụng.',
        privacy: 'Bản chép lời được gửi đến Azure qua máy chủ ứng dụng và không hoạt động ngoại tuyến.',
        requirements: 'Cần tài nguyên Azure Translator, khóa đã lưu và vùng nếu là tài nguyên khu vực. Có thể dùng F0 khi khả dụng.',
        caution: 'Áp dụng hạn ngạch và điều khoản Azure. Không lưu khóa lâu dài trên thiết bị dùng chung.',
      },
    },
    profiles: {
      fastPipelinedStream: 'Xác nhận nhanh lời nói ngắn, rõ ràng và phát ngay các cụm đã hoàn tất, phù hợp với nhập vai khi du lịch và luyện phản xạ nhanh.',
      fastPipelinedAuto: 'Xác nhận nhanh lời nói ngắn, rõ ràng và phát sớm từng cụm khi công cụ được chọn hỗ trợ truyền luồng, phù hợp với luyện hội thoại.',
      fastPipelinedComplete: 'Xác nhận nhanh lời nói ngắn, rõ ràng rồi phát ngay toàn bộ bản dịch, phù hợp với nhập vai khi du lịch và luyện trả lời.',
      fastStandard: 'Xác nhận nhanh câu nói ngắn rồi phát tự nhiên toàn bộ bản dịch, phù hợp với luyện nói đuổi theo từng câu.',
      stablePipelinedStream: 'Phát hiện ổn định điểm kết thúc và phát sớm các cụm đã hoàn tất, phù hợp với buổi học hoặc luyện phỏng vấn có khoảng dừng hay câu trả lời dài.',
      stablePipelinedAuto: 'Phát hiện ổn định điểm kết thúc và phát sớm từng cụm khi có thể, phù hợp với buổi học hoặc luyện phỏng vấn có khoảng dừng hay câu trả lời dài.',
      stablePipelinedComplete: 'Phát hiện ổn định điểm kết thúc rồi phát ngay toàn bộ bản dịch, phù hợp với buổi học và luyện phỏng vấn có câu trả lời dài.',
      stableStandard: 'Chờ lời nói dài hoặc thận trọng kết thúc rồi mới phát toàn bộ câu, phù hợp với thuyết trình và học tập chú trọng độ chính xác.',
    },
    inputSpeed: {
      webspeech_fast: 'Trên máy tính, lời nói được chốt sau khoảng 600 ms im lặng; Android dùng phát hiện kết thúc giọng nói gốc của Chrome.',
      webspeech_std: 'Trên máy tính, lời nói được chốt sau khoảng 1000 ms; Android dùng phát hiện gốc của Chrome để tránh cắt câu dài.',
    },
    inputAccuracy: {
      webspeech_fast: 'Hoạt động tốt với lời nói ngắn, rõ ràng nhưng có thể nhầm khoảng dừng dài giữa câu là điểm kết thúc.',
      webspeech_std: 'Giảm tình trạng chia câu quá sớm khi bạn nói chậm hoặc dừng giữa câu.',
    },
    outputSpeed: {
      standard: 'Chỉ bắt đầu phát sau khi hoàn tất toàn bộ bản dịch, vì vậy âm thanh đầu tiên đến muộn hơn nhưng luồng ổn định.',
      stream: 'Các cụm Gemini đã hoàn tất được đưa ngay vào hàng đợi TTS, cho phép bắt đầu phát trước khi toàn bộ bản dịch kết thúc.',
      auto: 'Các cụm hoàn tất được phát sớm khi lựa chọn tự động dùng luồng Gemini. Công cụ Chrome và mạng đợi kết quả đầy đủ như đầu ra tiêu chuẩn.',
      complete: 'Công cụ này không cung cấp cụm từng phần nên TTS bắt đầu sau khi có kết quả đầy đủ và hầu như không nhanh hơn đầu ra tiêu chuẩn.',
    },
    outputAccuracy: {
      standard: 'Đọc trọn câu thường tạo ngữ điệu và mạch câu tự nhiên hơn.',
      stream: 'Độ chính xác bản dịch không đổi, nhưng ranh giới giữa các cụm có thể làm ngữ điệu kém liền mạch khi dùng luồng Gemini.',
      complete: 'Vì công cụ này trả về toàn bộ bản dịch cùng lúc nên mạch câu tương tự đầu ra tiêu chuẩn.',
    },
    outputCaution: {
      auto: 'Phát sớm từng cụm chỉ nhanh hơn khi lựa chọn tự động thực sự dùng luồng Gemini.',
      complete: 'Công cụ này không truyền bản dịch từng phần nên phát theo cụm không mang lại lợi thế về tốc độ.',
    },
  },
};

const normalizeGuideLanguage = (languageCode: string): GuideLanguage => {
  const normalized = languageCode.trim().toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-TW';
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh';
  const baseLanguage = normalized.split('-')[0];
  return baseLanguage === 'ko' ||
    baseLanguage === 'en' ||
    baseLanguage === 'ja' ||
    baseLanguage === 'es' ||
    baseLanguage === 'fr' ||
    baseLanguage === 'de' ||
    baseLanguage === 'vi'
    ? baseLanguage
    : 'en';
};

const joinCopy = (...parts: string[]): string => parts
  .map((part) => part.trim())
  .filter(Boolean)
  .join(' ');

/** Pure presentation-model builder for all 2 × 4 × 2 pipeline combinations. */
export const getPipelineCombinationGuide = (
  selections: PipelineSelections,
  languageCode: string
): PipelineCombinationGuide => {
  const { stage1, stage2, stage3 } = selections;
  const copy = GUIDE_COPY[normalizeGuideLanguage(languageCode)];
  const ui = getUiStrings(languageCode);
  const isFastInput = stage1 === 'webspeech_fast';
  const isPipelinedOutput = stage3 === 'tts_pipelined';
  const streamsPartialTranslation = stage2 === 'gemini_stream';
  const mayStreamPartialTranslation = stage2 === 'auto';

  const stage1Labels: Record<Stage1Option, string> = {
    webspeech_fast: ui.pipeline.fastDetection,
    webspeech_std: ui.pipeline.stableDetection,
  };
  const stage2Labels: Record<Stage2Option, string> = {
    auto: ui.pipeline.automaticRouting,
    chrome_nano: ui.pipeline.chromeTranslator,
    bergamot: ui.pipeline.bergamotTranslator,
    gemini_stream: ui.pipeline.geminiStream,
    turbo_fastpath: ui.pipeline.networkFallback,
  };
  const stage3Labels: Record<Stage3Option, string> = {
    tts_pipelined: ui.pipeline.phrasePlayback,
    tts_standard: ui.pipeline.sentencePlayback,
  };

  const conversationProfile = isFastInput
    ? isPipelinedOutput
      ? streamsPartialTranslation
        ? copy.profiles.fastPipelinedStream
        : mayStreamPartialTranslation
          ? copy.profiles.fastPipelinedAuto
          : copy.profiles.fastPipelinedComplete
      : copy.profiles.fastStandard
    : isPipelinedOutput
      ? streamsPartialTranslation
        ? copy.profiles.stablePipelinedStream
        : mayStreamPartialTranslation
          ? copy.profiles.stablePipelinedAuto
          : copy.profiles.stablePipelinedComplete
      : copy.profiles.stableStandard;

  const outputSpeed = !isPipelinedOutput
    ? copy.outputSpeed.standard
    : streamsPartialTranslation
      ? copy.outputSpeed.stream
      : mayStreamPartialTranslation
        ? copy.outputSpeed.auto
        : copy.outputSpeed.complete;
  const outputAccuracy = !isPipelinedOutput
    ? copy.outputAccuracy.standard
    : streamsPartialTranslation || mayStreamPartialTranslation
      ? copy.outputAccuracy.stream
      : copy.outputAccuracy.complete;
  const outputCaution = isPipelinedOutput && !streamsPartialTranslation
    ? mayStreamPartialTranslation
      ? copy.outputCaution.auto
      : copy.outputCaution.complete
    : '';
  const engine = copy.engines[stage2];

  return {
    summary: `${stage1Labels[stage1]} · ${stage2Labels[stage2]} · ${stage3Labels[stage3]}`,
    situation: joinCopy(conversationProfile, engine.situation),
    speed: joinCopy(copy.inputSpeed[stage1], engine.speed, outputSpeed),
    accuracy: joinCopy(copy.inputAccuracy[stage1], engine.accuracy, outputAccuracy),
    privacy: engine.privacy,
    requirements: engine.requirements,
    caution: joinCopy(engine.caution, outputCaution),
  };
};
