import type { MobileDictationComposerCopy } from '../components/MobileDictationComposer';
import type { WorkflowPickerCopyOverrides } from '../components/WorkflowPicker';
import type {
  WorkflowAvailability,
  WorkflowCapability,
  WorkflowProfile,
  WorkflowProfileId,
} from './workflowProfiles';

type SupportedLocale = 'en' | 'ko' | 'ja' | 'zh-TW' | 'zh' | 'es' | 'fr' | 'de' | 'vi';

interface LocalePack {
  locale: SupportedLocale;
  picker: Pick<
    WorkflowPickerCopyOverrides,
    | 'title'
    | 'description'
    | 'groupLabels'
    | 'activeFlowTitle'
    | 'automaticResolvedPrefix'
    | 'requirementsLabel'
    | 'availableLabel'
    | 'unavailableLabel'
    | 'selectedLabel'
    | 'showFlowLabel'
    | 'hideFlowLabel'
    | 'closeLabel'
    | 'useAutomaticLabel'
    | 'usingAutomaticLabel'
    | 'automaticBadge'
    | 'locationLabels'
  >;
  composer: MobileDictationComposerCopy;
  terms: {
    automaticLabel: string;
    automaticDescription: string;
    fast: string;
    stable: string;
    desktopChromeLocal: string;
    desktopWebSpeechGemini: string;
    desktopWebSpeechAzure: string;
    mobileBergamot: string;
    mobileGemini: string;
    mobileAzure: string;
    geminiLiveDescription: string;
    openAiLiveDescription: string;
    azureLiveInterpreterDescription: string;
    azureSpeechTranslationDescription: string;
    localFastDescription: string;
    localStableDescription: string;
    desktopGeminiDescription: string;
    desktopAzureDescription: string;
    mobileBergamotDescription: string;
    mobileGeminiDescription: string;
    mobileAzureDescription: string;
  };
  flow: {
    inspectLabel: string;
    inspectDetail: string;
    resolveLabel: string;
    resolveDetail: string;
    runLabel: string;
    runDetail: string;
    captureLabel: string;
    captureDetail: string;
    liveTranslateLabel: string;
    liveTranslateDetail: string;
    modelAudioLabel: string;
    modelAudioDetail: string;
    saveTranscriptLabel: string;
    saveTranscriptDetail: string;
    recognizeFastLabel: string;
    recognizeFastDetail: string;
    recognizeStableLabel: string;
    recognizeStableDetail: string;
    saveSourceLabel: string;
    saveSourceDetail: string;
    translateLabel: string;
    translateLocalDetail: string;
    translateNetworkDetail: string;
    deviceTtsLabel: string;
    deviceTtsDetail: string;
    updateLabel: string;
    updateDetail: string;
    editorLabel: string;
    editorDetail: string;
    keyboardLabel: string;
    keyboardDetail: string;
    submitLabel: string;
    submitDetail: string;
    mobileTtsDetail: string;
    mobileUpdateDetail: string;
  };
  requirements: {
    completeFlow: string;
    dictationIsInput: string;
    geminiKey: string;
    openAiKey: string;
    azureKey: string;
    azureSpeechKey: string;
    microphone: string;
    secure: string;
    websocketAudio: string;
    webrtc: string;
    desktopChrome: string;
    webSpeech: string;
    chromeTranslator: string;
    bergamot: string;
    desktopWebSpeech: string;
    network: string;
    deviceVoice: string;
    mobileKeyboard: string;
    startKeyboardDictation: string;
  };
  capabilities: Record<WorkflowCapability, string>;
  disabled: {
    requires: string;
    geminiKey: string;
    openAiKey: string;
    azureKey: string;
    azureSpeechKey: string;
    cloudFallbackOff: string;
    mobileNeedsProvider: string;
    noCompleteFlow: string;
  };
}

const EN: LocalePack = {
  locale: 'en',
  picker: {
    title: 'Choose a complete workflow',
    description: 'Each option shows the actual input, translation, speech output, and transcript-storage flow.',
    groupLabels: { automatic: 'Automatic', 'live-audio': 'Live audio', desktop: 'Desktop text workflows', mobile: 'Mobile keyboard workflows' },
    activeFlowTitle: 'Active flow', automaticResolvedPrefix: 'Automatic selected', requirementsLabel: 'Requirements',
    availableLabel: 'Available', unavailableLabel: 'Unavailable', selectedLabel: 'Selected',
    showFlowLabel: 'Show full flow', hideFlowLabel: 'Hide full flow', closeLabel: 'Close workflow menu',
    useAutomaticLabel: 'Use automatic routing', usingAutomaticLabel: 'Automatic routing is on', automaticBadge: 'Auto',
    locationLabels: { device: 'Device', browser: 'Browser', network: 'Network', storage: 'Saved locally' },
  },
  composer: {
    title: 'Mobile keyboard dictation', inputLabel: 'Source text',
    instructions: 'Tap the field, then tap the microphone on your phone keyboard. Review the text before submitting.',
    languageHintPrefix: 'Use a keyboard configured for', placeholder: 'Dictate, type, or paste what you want to translate…',
    submit: 'Translate and speak', submitting: 'Translating…', clear: 'Clear',
    shortcutHint: 'On a hardware keyboard, press Ctrl/Command + Enter to submit.', characterCountLabel: 'characters',
    emptyError: 'Enter or dictate some text first.', submitError: 'The text could not be submitted. Your source text is still here.',
    openKeyboardMic: 'Open the phone keyboard microphone',
  },
  terms: {
    automaticLabel: 'Automatic routing (smart fallback)', automaticDescription: 'Choose a complete workflow from device capabilities, saved credentials, and the cloud-fallback setting.',
    fast: 'fast', stable: 'stable', desktopChromeLocal: 'Desktop Chrome on-device',
    desktopWebSpeechGemini: 'Desktop Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'Desktop Web Speech + Azure AI Translator',
    mobileBergamot: 'Mobile keyboard dictation + Bergamot',
    mobileGemini: 'Mobile keyboard dictation + Gemini 3.5 Flash-Lite', mobileAzure: 'Mobile keyboard dictation + Azure AI Translator',
    geminiLiveDescription: 'Microphone audio and translated audio share one bidirectional Gemini Live session; available text is saved locally.',
    openAiLiveDescription: 'Microphone audio and translated audio share one bidirectional OpenAI Realtime session; available text is saved locally.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: 'Desktop Web Speech input with a short endpoint delay, Chrome on-device translation, and device TTS.',
    localStableDescription: 'Desktop Web Speech input with a longer endpoint delay, Chrome on-device translation, and device TTS.',
    desktopGeminiDescription: 'Stable desktop Web Speech input, Gemini text translation, and device TTS.',
    desktopAzureDescription: 'Stable desktop Web Speech input, Azure text translation, and device TTS.',
    mobileBergamotDescription: 'Editable keyboard dictation or typing, on-device Bergamot translation, and device TTS. The first language pair downloads a compact model, then text stays on this device.',
    mobileGeminiDescription: 'Editable keyboard dictation or typing, Gemini text translation, and device TTS.',
    mobileAzureDescription: 'Editable keyboard dictation or typing, Azure text translation, and device TTS.',
  },
  flow: {
    inspectLabel: 'Inspect this device', inspectDetail: 'Check device type, browser APIs, saved provider credentials, and the cloud-fallback setting.',
    resolveLabel: 'Select a complete workflow', resolveDetail: 'Prefer an eligible on-device route, then use a network route only when cloud fallback is enabled.',
    runLabel: 'Run the resolved flow', runDetail: 'After resolution, the active input-to-record flow replaces these routing steps.',
    captureLabel: 'Stream microphone audio', captureDetail: 'After permission is granted, the browser sends microphone audio to the live session.',
    liveTranslateLabel: 'Translate with {provider}', liveTranslateDetail: 'Speech recognition, translation, and audio-response generation run together in one live session.',
    modelAudioLabel: 'Play translated model audio', modelAudioDetail: 'The browser plays translated audio as the live model returns it.',
    saveTranscriptLabel: 'Save available text locally', saveTranscriptDetail: 'Source and translated text supplied by the session are added to local transcript history.',
    recognizeFastLabel: 'Recognize speech (fast)', recognizeFastDetail: 'Short uh-pauses are ignored. About 2–3 sentences are sent after a ~1.2s gap. Fast and stable differ only by that wait.',
    recognizeStableLabel: 'Recognize speech (stable)', recognizeStableDetail: 'Short uh-pauses are ignored. About 3–4 sentences are sent after a ~1.5s gap. Fast and stable use the same recognizer and translator.',
    saveSourceLabel: 'Save source text first', saveSourceDetail: 'The source transcript is recorded before translation starts.',
    translateLabel: 'Translate with {provider}', translateLocalDetail: 'Chrome uses a downloaded language pack on this computer; text is not sent to a translation provider.',
    translateNetworkDetail: 'The saved source text is sent to {provider}.',
    deviceTtsLabel: 'Speak with device TTS', deviceTtsDetail: 'Listening stays open. Translation audio plays through Web Audio so the next utterance is not dropped. The transcript follows.',
    updateLabel: 'Update the same record', updateDetail: 'The existing source entry is marked complete or failed, so its source text never disappears.',
    editorLabel: 'Open the source-text field', editorDetail: 'Tap the real text field to display the phone or tablet keyboard.',
    keyboardLabel: 'Dictate from the keyboard or type', keyboardDetail: 'You start the keyboard microphone; the PWA receives editable text and does not control mobile dictation.',
    submitLabel: 'Confirm and save source text', submitDetail: 'Tap Translate and speak; the source is saved before any network request.',
    mobileTtsDetail: 'The device reads the translated text with an installed target-language voice.',
    mobileUpdateDetail: 'Translation status and output are attached to the already-saved source entry.',
  },
  requirements: {
    completeFlow: 'At least one complete workflow below must be available.', dictationIsInput: 'Keyboard dictation creates text; it is not a translation engine.',
    geminiKey: 'Saved Gemini API key', openAiKey: 'Saved OpenAI API key', azureKey: 'Saved Azure Translator key and region when required',
    azureSpeechKey: 'Saved Azure Speech key and region',
    microphone: 'Microphone permission', secure: 'Secure HTTPS connection', websocketAudio: 'WebSocket and Web Audio support', webrtc: 'WebRTC support',
    desktopChrome: 'Desktop Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API and downloaded language pack',
    bergamot: 'WebAssembly workers for on-device Bergamot',
    desktopWebSpeech: 'Desktop browser with Web Speech support', network: 'Network connection', deviceVoice: 'Installed target-language TTS voice',
    mobileKeyboard: 'Phone or tablet keyboard', startKeyboardDictation: 'You start dictation from the keyboard microphone',
  },
  capabilities: {
    secure_context: 'a secure HTTPS connection', microphone_capture: 'browser microphone capture', websocket: 'WebSocket support',
    webrtc: 'WebRTC support', audio_context: 'Web Audio support', desktop_device: 'a desktop or laptop', desktop_chrome: 'desktop Chrome',
    mobile_device: 'a phone or tablet', web_speech: 'the Web Speech API', translator_api: 'the Chrome Translator API',
    speech_synthesis: 'device text-to-speech', editable_text: 'editable text input',
    web_assembly: 'WebAssembly workers',
  },
  disabled: {
    requires: 'Requires {items}.', geminiKey: 'Save a Gemini API key in Settings.', openAiKey: 'Save an OpenAI API key in Settings.',
    azureKey: 'Save an Azure Translator API key in Settings.',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: 'Automatic cloud fallback is off. Choose a cloud workflow explicitly or enable cloud fallback in Settings.',
    mobileNeedsProvider: 'Mobile keyboard dictation only creates text. Use Bergamot on this device, or save a Gemini or Azure Translator API key.',
    noCompleteFlow: 'No complete workflow matches this device and the currently saved API keys.',
  },
};

const KO: LocalePack = {
  locale: 'ko',
  picker: {
    title: '전체 워크플로 선택', description: '각 선택지는 실제 입력, 번역, 음성 출력, 기록 저장 흐름 전체를 보여 줍니다.',
    groupLabels: { automatic: '자동', 'live-audio': '실시간 오디오', desktop: '데스크탑 텍스트 워크플로', mobile: '모바일 키보드 워크플로' },
    activeFlowTitle: '현재 실행 흐름', automaticResolvedPrefix: '자동 선택 결과', requirementsLabel: '필요 조건',
    availableLabel: '사용 가능', unavailableLabel: '사용 불가', selectedLabel: '선택됨',
    showFlowLabel: '실행 흐름 보기', hideFlowLabel: '실행 흐름 닫기', closeLabel: '워크플로 닫기',
    useAutomaticLabel: '자동 경로로', usingAutomaticLabel: '자동 경로가 적용 중입니다', automaticBadge: '자동',
    locationLabels: { device: '기기', browser: '브라우저', network: '네트워크', storage: '기기에 저장' },
  },
  composer: {
    title: '모바일 키보드 받아쓰기', inputLabel: '원문 텍스트',
    instructions: '입력칸을 누른 뒤 휴대전화 키보드의 마이크를 누르세요. 전송 전에 인식된 글을 확인할 수 있습니다.',
    languageHintPrefix: '다음 언어로 설정된 키보드를 사용하세요:', placeholder: '번역할 내용을 받아쓰기, 직접 입력 또는 붙여넣기 하세요…',
    submit: '번역하고 읽기', submitting: '번역 중…', clear: '지우기',
    shortcutHint: '하드웨어 키보드에서는 Ctrl/Command + Enter로 전송합니다.', characterCountLabel: '자',
    emptyError: '먼저 내용을 입력하거나 받아쓰기 하세요.', submitError: '텍스트를 전송하지 못했습니다. 원문은 입력칸에 그대로 남아 있습니다.',
    openKeyboardMic: '휴대전화 키보드 마이크 열기',
  },
  terms: {
    automaticLabel: '자동 경로 선택(스마트 대체)', automaticDescription: '기기 기능, 저장된 API 키, 클라우드 대체 설정에 맞는 완전한 워크플로를 선택합니다.',
    fast: '빠름', stable: '안정형', desktopChromeLocal: '데스크탑 Chrome 기기 내 번역',
    desktopWebSpeechGemini: '데스크탑 Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: '데스크탑 Web Speech + Azure AI Translator',
    mobileBergamot: '모바일 키보드 받아쓰기 + Bergamot',
    mobileGemini: '모바일 키보드 받아쓰기 + Gemini 3.5 Flash-Lite', mobileAzure: '모바일 키보드 받아쓰기 + Azure AI Translator',
    geminiLiveDescription: '마이크 입력과 번역 음성이 하나의 Gemini Live 양방향 세션을 이용하고, 제공되는 텍스트는 기기에 저장됩니다.',
    openAiLiveDescription: '마이크 입력과 번역 음성이 하나의 OpenAI Realtime 양방향 세션을 이용하고, 제공되는 텍스트는 기기에 저장됩니다.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter가 마이크 오디오를 음성-음성 통역으로 스트리밍하며 입력 언어를 자동 감지합니다.',
    azureSpeechTranslationDescription: 'Azure Speech Translation이 마이크 오디오를 스트리밍하고 원문 전사와 합성된 대상 언어 음성을 제공합니다.',
    localFastDescription: '짧은 발화 종료 지연의 데스크탑 Web Speech 입력, Chrome 기기 내 번역, 기기 TTS 조합입니다.',
    localStableDescription: '더 긴 발화 종료 지연의 데스크탑 Web Speech 입력, Chrome 기기 내 번역, 기기 TTS 조합입니다.',
    desktopGeminiDescription: '안정형 데스크탑 Web Speech 입력, Gemini 텍스트 번역, 기기 TTS 조합입니다.',
    desktopAzureDescription: '안정형 데스크탑 Web Speech 입력, Azure 텍스트 번역, 기기 TTS 조합입니다.',
    mobileBergamotDescription: '수정 가능한 키보드 받아쓰기 또는 입력, 기기 내 Bergamot 번역, 기기 TTS 조합입니다. 언어쌍 모델을 처음 한 번 받은 뒤에는 텍스트가 이 기기에 머뭅니다.',
    mobileGeminiDescription: '수정 가능한 키보드 받아쓰기 또는 입력, Gemini 텍스트 번역, 기기 TTS 조합입니다.',
    mobileAzureDescription: '수정 가능한 키보드 받아쓰기 또는 입력, Azure 텍스트 번역, 기기 TTS 조합입니다.',
  },
  flow: {
    inspectLabel: '이 기기 확인', inspectDetail: '기기 종류, 브라우저 API, 저장된 API 키와 클라우드 대체 설정을 확인합니다.',
    resolveLabel: '전체 워크플로 선택', resolveDetail: '사용 가능한 기기 내 경로를 우선하고, 클라우드 대체가 켜졌을 때만 네트워크 경로를 사용합니다.',
    runLabel: '선택된 흐름 실행', runDetail: '경로가 결정되면 이 안내 대신 실제 입력부터 기록까지의 흐름을 표시합니다.',
    captureLabel: '마이크 오디오 스트리밍', captureDetail: '권한을 허용하면 브라우저가 마이크 오디오를 실시간 세션으로 전송합니다.',
    liveTranslateLabel: '{provider}로 번역', liveTranslateDetail: '음성 인식, 번역, 응답 음성 생성이 하나의 실시간 세션에서 함께 처리됩니다.',
    modelAudioLabel: '번역된 모델 음성 재생', modelAudioDetail: '실시간 모델이 보내는 번역 음성을 도착하는 대로 브라우저가 재생합니다.',
    saveTranscriptLabel: '제공된 텍스트를 기기에 저장', saveTranscriptDetail: '세션이 제공한 원문과 번역문을 로컬 기록에 추가합니다.',
    recognizeFastLabel: '음성 인식(빠름)', recognizeFastDetail: '짧은 말 이음은 무시하고, 약 1.2초 쉼에서 문장 2~3개를 번역으로 넘깁니다. 안정형과 인식·번역 엔진은 같고 쉼 길이만 다릅니다.',
    recognizeStableLabel: '음성 인식(안정형)', recognizeStableDetail: '짧은 말 이음은 무시하고, 약 1.5초 쉼에서 문장 3~4개를 번역으로 넘깁니다. 빠름과 인식·번역 엔진은 같고 쉼 길이만 다릅니다.',
    saveSourceLabel: '원문 먼저 저장', saveSourceDetail: '번역을 시작하기 전에 인식된 원문을 기록합니다.',
    translateLabel: '{provider}로 번역', translateLocalDetail: 'Chrome이 이 컴퓨터에 내려받은 언어 팩으로 번역하며 번역 업체로 텍스트를 보내지 않습니다.',
    translateNetworkDetail: '저장된 원문을 {provider}로 전송합니다.',
    deviceTtsLabel: '기기 TTS로 읽기', deviceTtsDetail: '마이크는 계속 켜 둡니다. 번역 음성은 Web Audio로 재생해 다음 말을 놓치지 않고, 기록은 뒤에서 붙습니다.',
    updateLabel: '같은 기록 갱신', updateDetail: '기존 원문 기록을 완료 또는 실패 상태로 바꾸므로 원문이 사라지지 않습니다.',
    editorLabel: '원문 입력칸 열기', editorDetail: '실제 텍스트 입력칸을 눌러 휴대전화나 태블릿 키보드를 표시합니다.',
    keyboardLabel: '키보드로 받아쓰기 또는 입력', keyboardDetail: '사용자가 키보드 마이크를 시작하며, PWA는 수정 가능한 텍스트만 받고 모바일 받아쓰기를 제어하지 않습니다.',
    submitLabel: '원문 확인 후 저장', submitDetail: '번역하고 읽기를 누르면 네트워크 요청 전에 원문부터 저장합니다.',
    mobileTtsDetail: '기기에 설치된 대상 언어 음성으로 번역문을 읽습니다.',
    mobileUpdateDetail: '이미 저장된 원문 기록에 번역 상태와 결과를 붙입니다.',
  },
  requirements: {
    completeFlow: '아래 워크플로 중 하나 이상을 완전히 사용할 수 있어야 합니다.', dictationIsInput: '키보드 받아쓰기는 텍스트 입력 도구이며 번역 엔진이 아닙니다.',
    geminiKey: '저장된 Gemini API 키', openAiKey: '저장된 OpenAI API 키', azureKey: '저장된 Azure Translator API 키와 필요한 경우 리전', azureSpeechKey: '저장된 Azure Speech 키와 리전',
    microphone: '마이크 권한', secure: '안전한 HTTPS 연결', websocketAudio: 'WebSocket과 Web Audio 지원', webrtc: 'WebRTC 지원',
    desktopChrome: '데스크탑 Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API와 내려받은 언어 팩',
    bergamot: '기기 내 Bergamot를 위한 WebAssembly 워커',
    desktopWebSpeech: 'Web Speech를 지원하는 데스크탑 브라우저', network: '네트워크 연결', deviceVoice: '설치된 대상 언어 TTS 음성',
    mobileKeyboard: '휴대전화 또는 태블릿 키보드', startKeyboardDictation: '사용자가 키보드 마이크에서 받아쓰기를 시작해야 함',
  },
  capabilities: {
    secure_context: '안전한 HTTPS 연결', microphone_capture: '브라우저 마이크 입력', websocket: 'WebSocket 지원', webrtc: 'WebRTC 지원',
    audio_context: 'Web Audio 지원', desktop_device: '데스크탑 또는 노트북', desktop_chrome: '데스크탑 Chrome',
    mobile_device: '휴대전화 또는 태블릿', web_speech: 'Web Speech API', translator_api: 'Chrome Translator API',
    speech_synthesis: '기기 텍스트 읽기 기능', editable_text: '수정 가능한 텍스트 입력',
    web_assembly: 'WebAssembly 워커',
  },
  disabled: {
    requires: '{items}이(가) 필요합니다.', geminiKey: '설정에 Gemini API 키를 저장하세요.', openAiKey: '설정에 OpenAI API 키를 저장하세요.',
    azureKey: '설정에 Azure Translator API 키를 저장하세요.',
    azureSpeechKey: '설정에 Azure Speech API 키와 리전을 저장하세요.',
    cloudFallbackOff: '자동 클라우드 대체가 꺼져 있습니다. 클라우드 워크플로를 직접 선택하거나 설정에서 클라우드 대체를 켜세요.',
    mobileNeedsProvider: '모바일 키보드 받아쓰기는 텍스트만 만듭니다. 이 기기에서 Bergamot를 쓰거나 Gemini 또는 Azure Translator API 키를 저장하세요.',
    noCompleteFlow: '이 기기와 현재 저장된 API 키로 실행할 수 있는 전체 워크플로가 없습니다.',
  },
};

const JA: LocalePack = {
  locale: 'ja',
  picker: {
    title: '完全なワークフローを選択', description: '各項目には、実際の入力、翻訳、音声出力、履歴保存の流れが表示されます。',
    groupLabels: { automatic: '自動', 'live-audio': 'ライブ音声', desktop: 'デスクトップのテキストワークフロー', mobile: 'モバイルキーボードのワークフロー' },
    activeFlowTitle: '現在の処理フロー', automaticResolvedPrefix: '自動選択', requirementsLabel: '必要条件',
    availableLabel: '利用可能', unavailableLabel: '利用不可', selectedLabel: '選択中',
    showFlowLabel: '処理フローを表示', hideFlowLabel: '処理フローを閉じる', closeLabel: 'ワークフローを閉じる',
    useAutomaticLabel: '自動経路を使う', usingAutomaticLabel: '自動経路が適用されています', automaticBadge: '自動',
    locationLabels: { device: '端末', browser: 'ブラウザ', network: 'ネットワーク', storage: '端末内に保存' },
  },
  composer: {
    title: 'モバイルキーボード音声入力', inputLabel: '原文テキスト',
    instructions: '入力欄をタップし、スマートフォンのキーボードにあるマイクをタップしてください。送信前にテキストを確認できます。',
    languageHintPrefix: '次の言語用に設定したキーボードを使用:', placeholder: '翻訳する内容を音声入力、入力、または貼り付け…',
    submit: '翻訳して読み上げ', submitting: '翻訳中…', clear: '消去',
    shortcutHint: 'ハードウェアキーボードでは Ctrl/Command + Enter で送信します。', characterCountLabel: '文字',
    emptyError: '先にテキストを入力または音声入力してください。', submitError: 'テキストを送信できませんでした。原文は入力欄に残っています。',
    openKeyboardMic: 'スマホのキーボードマイクを開く',
  },
  terms: {
    automaticLabel: '自動ルーティング（スマート代替）', automaticDescription: '端末機能、保存済み API キー、クラウド代替設定から完全なワークフローを選びます。',
    fast: '高速', stable: '安定', desktopChromeLocal: 'デスクトップ Chrome オンデバイス翻訳',
    desktopWebSpeechGemini: 'デスクトップ Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'デスクトップ Web Speech + Azure AI Translator',
    mobileBergamot: 'モバイルキーボード音声入力 + Bergamot',
    mobileGemini: 'モバイルキーボード音声入力 + Gemini 3.5 Flash-Lite', mobileAzure: 'モバイルキーボード音声入力 + Azure AI Translator',
    geminiLiveDescription: 'マイク音声と翻訳音声を一つの双方向 Gemini Live セッションで処理し、提供されたテキストを端末内に保存します。',
    openAiLiveDescription: 'マイク音声と翻訳音声を一つの双方向 OpenAI Realtime セッションで処理し、提供されたテキストを端末内に保存します。',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: '短い発話終了待ちの Web Speech 入力、Chrome の端末内翻訳、端末 TTS を使用します。',
    localStableDescription: '長めの発話終了待ちの Web Speech 入力、Chrome の端末内翻訳、端末 TTS を使用します。',
    desktopGeminiDescription: '安定型デスクトップ Web Speech 入力、Gemini テキスト翻訳、端末 TTS を使用します。',
    desktopAzureDescription: '安定型デスクトップ Web Speech 入力、Azure テキスト翻訳、端末 TTS を使用します。',
    mobileBergamotDescription: '編集可能なキーボード音声入力または文字入力、端末内 Bergamot 翻訳、端末 TTS を使用します。',
    mobileGeminiDescription: '編集可能なキーボード音声入力または文字入力、Gemini テキスト翻訳、端末 TTS を使用します。',
    mobileAzureDescription: '編集可能なキーボード音声入力または文字入力、Azure テキスト翻訳、端末 TTS を使用します。',
  },
  flow: {
    inspectLabel: 'この端末を確認', inspectDetail: '端末の種類、ブラウザ API、保存済み API キー、クラウド代替設定を確認します。',
    resolveLabel: '完全なワークフローを選択', resolveDetail: '利用可能な端末内経路を優先し、クラウド代替が有効な場合だけネットワーク経路を使います。',
    runLabel: '選択したフローを実行', runDetail: '経路決定後は、この手順を実際の入力から履歴保存までの流れに置き換えます。',
    captureLabel: 'マイク音声をストリーミング', captureDetail: '許可後、ブラウザがマイク音声をライブセッションへ送ります。',
    liveTranslateLabel: '{provider} で翻訳', liveTranslateDetail: '音声認識、翻訳、応答音声の生成を一つのライブセッションで処理します。',
    modelAudioLabel: '翻訳済みモデル音声を再生', modelAudioDetail: 'ライブモデルから届いた翻訳音声をブラウザが順次再生します。',
    saveTranscriptLabel: '提供されたテキストを端末内に保存', saveTranscriptDetail: 'セッションが提供した原文と翻訳文をローカル履歴に追加します。',
    recognizeFastLabel: '音声認識（高速）', recognizeFastDetail: 'デスクトップ Web Speech が短い発話終了待ちを使用します。',
    recognizeStableLabel: '音声認識（安定）', recognizeStableDetail: 'より確実な文の区切りのため、デスクトップ Web Speech が長めに待ちます。',
    saveSourceLabel: '原文を先に保存', saveSourceDetail: '翻訳開始前に認識した原文を履歴へ保存します。',
    translateLabel: '{provider} で翻訳', translateLocalDetail: 'Chrome がこのパソコンにダウンロードした言語パックで翻訳し、翻訳事業者へテキストを送りません。',
    translateNetworkDetail: '保存済みの原文を {provider} へ送信します。',
    deviceTtsLabel: '端末 TTS で読み上げ', deviceTtsDetail: 'インストール済みの対象言語音声で完成した翻訳をブラウザが読み上げます。',
    updateLabel: '同じ履歴を更新', updateDetail: '既存の原文を完了または失敗に更新するため、原文は消えません。',
    editorLabel: '原文入力欄を開く', editorDetail: '実際のテキスト欄をタップしてスマートフォンまたはタブレットのキーボードを表示します。',
    keyboardLabel: 'キーボードで音声入力または文字入力', keyboardDetail: 'キーボードのマイクは利用者が開始します。PWA は編集可能な文字だけを受け取り、モバイル音声入力を制御しません。',
    submitLabel: '原文を確認して保存', submitDetail: '「翻訳して読み上げ」をタップすると、ネットワーク要求より先に原文を保存します。',
    mobileTtsDetail: '端末にある対象言語音声で翻訳文を読み上げます。', mobileUpdateDetail: '保存済みの原文履歴に翻訳状態と結果を追加します。',
  },
  requirements: {
    completeFlow: '以下の完全なワークフローを少なくとも一つ利用できる必要があります。', dictationIsInput: 'キーボード音声入力はテキスト入力手段であり、翻訳エンジンではありません。',
    geminiKey: '保存済み Gemini API キー', openAiKey: '保存済み OpenAI API キー', azureKey: '保存済み Azure Translator API キーと、必要な場合はリージョン',
    azureSpeechKey: '保存済み Azure Speech キーとリージョン',
    microphone: 'マイク権限', secure: '安全な HTTPS 接続', websocketAudio: 'WebSocket と Web Audio 対応', webrtc: 'WebRTC 対応',
    desktopChrome: 'デスクトップ Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API とダウンロード済み言語パック',
    bergamot: '端末内 Bergamot 用の WebAssembly ワーカー',
    desktopWebSpeech: 'Web Speech 対応デスクトップブラウザ', network: 'ネットワーク接続', deviceVoice: 'インストール済み対象言語 TTS 音声',
    mobileKeyboard: 'スマートフォンまたはタブレットのキーボード', startKeyboardDictation: '利用者がキーボードのマイクから音声入力を開始すること',
  },
  capabilities: {
    secure_context: '安全な HTTPS 接続', microphone_capture: 'ブラウザのマイク入力', websocket: 'WebSocket 対応', webrtc: 'WebRTC 対応',
    audio_context: 'Web Audio 対応', desktop_device: 'デスクトップまたはノートパソコン', desktop_chrome: 'デスクトップ Chrome',
    mobile_device: 'スマートフォンまたはタブレット', web_speech: 'Web Speech API', translator_api: 'Chrome Translator API',
    speech_synthesis: '端末のテキスト読み上げ', editable_text: '編集可能なテキスト入力',
    web_assembly: 'WebAssembly ワーカー',
  },
  disabled: {
    requires: '{items} が必要です。', geminiKey: '設定に Gemini API キーを保存してください。', openAiKey: '設定に OpenAI API キーを保存してください。',
    azureKey: '設定に Azure Translator API キーを保存してください。',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: '自動クラウド代替が無効です。クラウドワークフローを直接選ぶか、設定でクラウド代替を有効にしてください。',
    mobileNeedsProvider: 'モバイルキーボード音声入力はテキストだけを作ります。翻訳には Gemini または Azure Translator API キーを保存してください。',
    noCompleteFlow: 'この端末と現在保存されている API キーに合う完全なワークフローがありません。',
  },
};

const ZH_TW: LocalePack = {
  locale: 'zh-TW',
  picker: {
    title: '選擇完整工作流程', description: '每個選項都會顯示實際的輸入、翻譯、語音輸出與逐字稿儲存流程。',
    groupLabels: { automatic: '自動', 'live-audio': '即時音訊', desktop: '桌面文字工作流程', mobile: '行動鍵盤工作流程' },
    activeFlowTitle: '目前流程', automaticResolvedPrefix: '自動選擇結果', requirementsLabel: '需求',
    availableLabel: '可用', unavailableLabel: '無法使用', selectedLabel: '已選取',
    showFlowLabel: '顯示完整流程', hideFlowLabel: '隱藏完整流程', closeLabel: '關閉工作流程選單',
    useAutomaticLabel: '改用自動路徑', usingAutomaticLabel: '目前使用自動路徑', automaticBadge: '自動',
    locationLabels: { device: '裝置', browser: '瀏覽器', network: '網路', storage: '儲存在本機' },
  },
  composer: {
    title: '行動鍵盤語音輸入', inputLabel: '原文文字',
    instructions: '點選輸入欄，再點手機鍵盤上的麥克風。送出前請先檢查辨識出的文字。',
    languageHintPrefix: '請使用設定為此語言的鍵盤：', placeholder: '說出、輸入或貼上要翻譯的內容…',
    submit: '翻譯並朗讀', submitting: '翻譯中…', clear: '清除',
    shortcutHint: '使用實體鍵盤時，按 Ctrl/Command + Enter 送出。', characterCountLabel: '個字元',
    emptyError: '請先輸入文字或使用語音輸入。', submitError: '無法送出文字，原文仍保留在輸入欄中。',
    openKeyboardMic: '開啟手機鍵盤麥克風',
  },
  terms: {
    automaticLabel: '自動路由（智慧備援）', automaticDescription: '依裝置功能、已儲存的 API 金鑰與雲端備援設定選擇完整工作流程。',
    fast: '快速', stable: '穩定', desktopChromeLocal: '桌面版 Chrome 裝置端翻譯',
    desktopWebSpeechGemini: '桌面 Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: '桌面 Web Speech + Azure AI Translator',
    mobileBergamot: '行動鍵盤語音輸入 + Bergamot',
    mobileGemini: '行動鍵盤語音輸入 + Gemini 3.5 Flash-Lite', mobileAzure: '行動鍵盤語音輸入 + Azure AI Translator',
    geminiLiveDescription: '麥克風音訊與翻譯音訊共用一個雙向 Gemini Live 工作階段，並在本機儲存可取得的文字。',
    openAiLiveDescription: '麥克風音訊與翻譯音訊共用一個雙向 OpenAI Realtime 工作階段，並在本機儲存可取得的文字。',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: '使用較短收音結束延遲的桌面 Web Speech、Chrome 裝置端翻譯及裝置 TTS。',
    localStableDescription: '使用較長收音結束延遲的桌面 Web Speech、Chrome 裝置端翻譯及裝置 TTS。',
    desktopGeminiDescription: '穩定型桌面 Web Speech 輸入、Gemini 文字翻譯與裝置 TTS。', desktopAzureDescription: '穩定型桌面 Web Speech 輸入、Azure 文字翻譯與裝置 TTS。',
    mobileBergamotDescription: '可編輯的鍵盤語音或文字輸入、裝置端 Bergamot 翻譯與裝置 TTS。',
    mobileGeminiDescription: '可編輯的鍵盤語音或文字輸入、Gemini 文字翻譯與裝置 TTS。', mobileAzureDescription: '可編輯的鍵盤語音或文字輸入、Azure 文字翻譯與裝置 TTS。',
  },
  flow: {
    inspectLabel: '檢查此裝置', inspectDetail: '檢查裝置類型、瀏覽器 API、已儲存的 API 金鑰與雲端備援設定。',
    resolveLabel: '選擇完整工作流程', resolveDetail: '優先使用符合條件的裝置端路徑；只有開啟雲端備援時才使用網路路徑。',
    runLabel: '執行選定流程', runDetail: '路由完成後，這些步驟會替換為實際從輸入到儲存記錄的流程。',
    captureLabel: '串流麥克風音訊', captureDetail: '授權後，瀏覽器會將麥克風音訊傳送到即時工作階段。',
    liveTranslateLabel: '使用 {provider} 翻譯', liveTranslateDetail: '語音辨識、翻譯與回應音訊生成會在同一個即時工作階段中完成。',
    modelAudioLabel: '播放模型翻譯音訊', modelAudioDetail: '瀏覽器會在即時模型傳回音訊時立即播放。',
    saveTranscriptLabel: '在本機儲存可取得的文字', saveTranscriptDetail: '將工作階段提供的原文與翻譯加入本機逐字稿記錄。',
    recognizeFastLabel: '辨識語音（快速）', recognizeFastDetail: '桌面 Web Speech 使用較短的發話結束延遲。',
    recognizeStableLabel: '辨識語音（穩定）', recognizeStableDetail: '桌面 Web Speech 會多等待一些時間，以更可靠地判斷句子邊界。',
    saveSourceLabel: '先儲存原文', saveSourceDetail: '開始翻譯前先記錄辨識出的原文。',
    translateLabel: '使用 {provider} 翻譯', translateLocalDetail: 'Chrome 使用此電腦已下載的語言套件翻譯，不會把文字傳給翻譯供應商。',
    translateNetworkDetail: '將已儲存的原文傳送至 {provider}。',
    deviceTtsLabel: '使用裝置 TTS 朗讀', deviceTtsDetail: '瀏覽器使用已安裝的目標語言語音朗讀完整翻譯。',
    updateLabel: '更新同一筆記錄', updateDetail: '將原有原文記錄標為完成或失敗，因此原文不會消失。',
    editorLabel: '開啟原文輸入欄', editorDetail: '點選真正的文字欄位，以顯示手機或平板鍵盤。',
    keyboardLabel: '用鍵盤語音輸入或打字', keyboardDetail: '由你啟動鍵盤麥克風；PWA 只接收可編輯文字，不控制行動裝置的語音輸入。',
    submitLabel: '確認並儲存原文', submitDetail: '點選「翻譯並朗讀」後，會在任何網路要求之前先儲存原文。',
    mobileTtsDetail: '裝置使用已安裝的目標語言語音朗讀翻譯文字。', mobileUpdateDetail: '把翻譯狀態與結果附加到已儲存的原文記錄。',
  },
  requirements: {
    completeFlow: '下列完整工作流程中至少要有一個可用。', dictationIsInput: '鍵盤語音輸入只會產生文字，並不是翻譯引擎。',
    geminiKey: '已儲存的 Gemini API 金鑰', openAiKey: '已儲存的 OpenAI API 金鑰', azureKey: '已儲存的 Azure Translator API 金鑰，以及需要時的區域',
    azureSpeechKey: '已儲存的 Azure Speech 金鑰與區域',
    microphone: '麥克風權限', secure: '安全的 HTTPS 連線', websocketAudio: '支援 WebSocket 與 Web Audio', webrtc: '支援 WebRTC',
    desktopChrome: '桌面版 Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API 與已下載的語言套件',
    bergamot: '裝置端 Bergamot 所需的 WebAssembly worker',
    desktopWebSpeech: '支援 Web Speech 的桌面瀏覽器', network: '網路連線', deviceVoice: '已安裝的目標語言 TTS 語音',
    mobileKeyboard: '手機或平板鍵盤', startKeyboardDictation: '由使用者從鍵盤麥克風啟動語音輸入',
  },
  capabilities: {
    secure_context: '安全的 HTTPS 連線', microphone_capture: '瀏覽器麥克風擷取', websocket: 'WebSocket 支援', webrtc: 'WebRTC 支援',
    audio_context: 'Web Audio 支援', desktop_device: '桌上型或筆記型電腦', desktop_chrome: '桌面版 Chrome',
    mobile_device: '手機或平板', web_speech: 'Web Speech API', translator_api: 'Chrome Translator API',
    speech_synthesis: '裝置文字轉語音', editable_text: '可編輯文字輸入',
    web_assembly: 'WebAssembly worker',
  },
  disabled: {
    requires: '需要 {items}。', geminiKey: '請在設定中儲存 Gemini API 金鑰。', openAiKey: '請在設定中儲存 OpenAI API 金鑰。',
    azureKey: '請在設定中儲存 Azure Translator API 金鑰。',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: '自動雲端備援已關閉。請直接選擇雲端工作流程，或在設定中開啟雲端備援。',
    mobileNeedsProvider: '行動鍵盤語音輸入只會產生文字。請儲存 Gemini 或 Azure Translator API 金鑰以進行翻譯。',
    noCompleteFlow: '沒有符合此裝置和目前已儲存 API 金鑰的完整工作流程。',
  },
};

const ZH: LocalePack = {
  ...ZH_TW,
  locale: 'zh',
  picker: {
    title: '选择完整工作流程', description: '每个选项都会显示实际的输入、翻译、语音输出和转写记录存储流程。',
    groupLabels: { automatic: '自动', 'live-audio': '实时音频', desktop: '桌面文本工作流程', mobile: '移动键盘工作流程' },
    activeFlowTitle: '当前流程', automaticResolvedPrefix: '自动选择结果', requirementsLabel: '要求',
    availableLabel: '可用', unavailableLabel: '不可用', selectedLabel: '已选择',
    showFlowLabel: '显示完整流程', hideFlowLabel: '隐藏完整流程', closeLabel: '关闭工作流程菜单',
    useAutomaticLabel: '改用自动路径', usingAutomaticLabel: '当前使用自动路径', automaticBadge: '自动',
    locationLabels: { device: '设备', browser: '浏览器', network: '网络', storage: '保存在本机' },
  },
  composer: {
    title: '移动键盘语音输入', inputLabel: '原文文本',
    instructions: '点按输入框，再点按手机键盘上的麦克风。提交前请检查识别出的文本。',
    languageHintPrefix: '请使用配置为此语言的键盘：', placeholder: '说出、输入或粘贴要翻译的内容…',
    submit: '翻译并朗读', submitting: '翻译中…', clear: '清除',
    shortcutHint: '使用实体键盘时，按 Ctrl/Command + Enter 提交。', characterCountLabel: '个字符',
    emptyError: '请先输入文本或使用语音输入。', submitError: '无法提交文本，原文仍保留在输入框中。',
    openKeyboardMic: '打开手机键盘麦克风',
  },
  terms: {
    ...ZH_TW.terms,
    automaticLabel: '自动路由（智能回退）', automaticDescription: '根据设备功能、已保存的 API 密钥和云端回退设置选择完整工作流程。',
    fast: '快速', stable: '稳定', desktopChromeLocal: '桌面版 Chrome 设备端翻译',
    desktopWebSpeechGemini: '桌面 Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: '桌面 Web Speech + Azure AI Translator',
    mobileBergamot: '移动键盘语音输入 + Bergamot',
    mobileGemini: '移动键盘语音输入 + Gemini 3.5 Flash-Lite', mobileAzure: '移动键盘语音输入 + Azure AI Translator',
    geminiLiveDescription: '麦克风音频和翻译音频共用一个双向 Gemini Live 会话，并在本机保存可用文本。',
    openAiLiveDescription: '麦克风音频和翻译音频共用一个双向 OpenAI Realtime 会话，并在本机保存可用文本。',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: '使用较短结束等待的桌面 Web Speech 输入、Chrome 设备端翻译和设备 TTS。',
    localStableDescription: '使用较长结束等待的桌面 Web Speech 输入、Chrome 设备端翻译和设备 TTS。',
    desktopGeminiDescription: '稳定型桌面 Web Speech 输入、Gemini 文本翻译和设备 TTS。', desktopAzureDescription: '稳定型桌面 Web Speech 输入、Azure 文本翻译和设备 TTS。',
    mobileBergamotDescription: '可编辑的键盘语音或文字输入、设备端 Bergamot 翻译和设备 TTS。',
    mobileGeminiDescription: '可编辑的键盘语音或文字输入、Gemini 文本翻译和设备 TTS。', mobileAzureDescription: '可编辑的键盘语音或文字输入、Azure 文本翻译和设备 TTS。',
  },
  flow: {
    inspectLabel: '检查此设备', inspectDetail: '检查设备类型、浏览器 API、已保存的 API 密钥和云端回退设置。',
    resolveLabel: '选择完整工作流程', resolveDetail: '优先使用符合条件的设备端路径；仅在启用云端回退时使用网络路径。',
    runLabel: '运行选定流程', runDetail: '路由完成后，这些步骤会替换为实际从输入到保存记录的流程。',
    captureLabel: '串流麦克风音频', captureDetail: '授权后，浏览器会将麦克风音频发送到实时会话。',
    liveTranslateLabel: '使用 {provider} 翻译', liveTranslateDetail: '语音识别、翻译和响应音频生成会在同一个实时会话中完成。',
    modelAudioLabel: '播放模型翻译音频', modelAudioDetail: '浏览器会在实时模型返回音频时立即播放。',
    saveTranscriptLabel: '在本机保存可用文本', saveTranscriptDetail: '将会话提供的原文和译文添加到本机转写记录。',
    recognizeFastLabel: '语音识别（快速）', recognizeFastDetail: '桌面 Web Speech 使用较短的发言结束延迟。',
    recognizeStableLabel: '语音识别（稳定）', recognizeStableDetail: '桌面 Web Speech 会多等待一会儿，以更可靠地判断句子边界。',
    saveSourceLabel: '先保存原文', saveSourceDetail: '开始翻译前先记录识别出的原文。',
    translateLabel: '使用 {provider} 翻译', translateLocalDetail: 'Chrome 使用此电脑已下载的语言包翻译，不会把文本发给翻译提供商。',
    translateNetworkDetail: '将已保存的原文发送至 {provider}。',
    deviceTtsLabel: '使用设备 TTS 朗读', deviceTtsDetail: '浏览器使用已安装的目标语言语音朗读完整译文。',
    updateLabel: '更新同一条记录', updateDetail: '将原有原文记录标为完成或失败，因此原文不会消失。',
    editorLabel: '打开原文输入框', editorDetail: '点按真实文本框，以显示手机或平板键盘。',
    keyboardLabel: '用键盘语音输入或打字', keyboardDetail: '由您启动键盘麦克风；PWA 只接收可编辑文本，不控制移动设备语音输入。',
    submitLabel: '确认并保存原文', submitDetail: '点按“翻译并朗读”后，会在任何网络请求前先保存原文。',
    mobileTtsDetail: '设备使用已安装的目标语言语音朗读译文。', mobileUpdateDetail: '将翻译状态和结果附加到已保存的原文记录。',
  },
  requirements: {
    completeFlow: '下列完整工作流程中至少要有一个可用。', dictationIsInput: '键盘语音输入只会生成文本，并不是翻译引擎。',
    geminiKey: '已保存的 Gemini API 密钥', openAiKey: '已保存的 OpenAI API 密钥', azureKey: '已保存的 Azure Translator API 密钥以及需要时的区域',
    azureSpeechKey: '已保存的 Azure Speech 密钥和区域',
    microphone: '麦克风权限', secure: '安全的 HTTPS 连接', websocketAudio: '支持 WebSocket 和 Web Audio', webrtc: '支持 WebRTC',
    desktopChrome: '桌面版 Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API 和已下载的语言包',
    bergamot: '设备端 Bergamot 所需的 WebAssembly worker',
    desktopWebSpeech: '支持 Web Speech 的桌面浏览器', network: '网络连接', deviceVoice: '已安装的目标语言 TTS 语音',
    mobileKeyboard: '手机或平板键盘', startKeyboardDictation: '由用户从键盘麦克风启动语音输入',
  },
  capabilities: {
    secure_context: '安全的 HTTPS 连接', microphone_capture: '浏览器麦克风采集', websocket: 'WebSocket 支持', webrtc: 'WebRTC 支持',
    audio_context: 'Web Audio 支持', desktop_device: '台式机或笔记本电脑', desktop_chrome: '桌面版 Chrome', mobile_device: '手机或平板',
    web_speech: 'Web Speech API', translator_api: 'Chrome Translator API', speech_synthesis: '设备文本转语音', editable_text: '可编辑文本输入',
    web_assembly: 'WebAssembly worker',
  },
  disabled: {
    requires: '需要 {items}。', geminiKey: '请在设置中保存 Gemini API 密钥。', openAiKey: '请在设置中保存 OpenAI API 密钥。',
    azureKey: '请在设置中保存 Azure Translator API 密钥。',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: '自动云端回退已关闭。请直接选择云端工作流程，或在设置中启用云端回退。',
    mobileNeedsProvider: '移动键盘语音输入只会生成文本。请保存 Gemini 或 Azure Translator API 密钥以进行翻译。',
    noCompleteFlow: '没有符合此设备和当前已保存 API 密钥的完整工作流程。',
  },
};

const ES: LocalePack = {
  ...EN,
  locale: 'es',
  picker: {
    title: 'Elige un flujo completo', description: 'Cada opción muestra el flujo real de entrada, traducción, salida de voz y guardado de la transcripción.',
    groupLabels: { automatic: 'Automático', 'live-audio': 'Audio en directo', desktop: 'Flujos de texto para escritorio', mobile: 'Flujos con teclado móvil' },
    activeFlowTitle: 'Flujo activo', automaticResolvedPrefix: 'Selección automática', requirementsLabel: 'Requisitos',
    availableLabel: 'Disponible', unavailableLabel: 'No disponible', selectedLabel: 'Seleccionado',
    showFlowLabel: 'Mostrar flujo completo', hideFlowLabel: 'Ocultar flujo completo', closeLabel: 'Cerrar menú de flujo',
    useAutomaticLabel: 'Usar ruta automática', usingAutomaticLabel: 'La ruta automática está activa', automaticBadge: 'Auto',
    locationLabels: { device: 'Dispositivo', browser: 'Navegador', network: 'Red', storage: 'Guardado localmente' },
  },
  composer: {
    title: 'Dictado con el teclado móvil', inputLabel: 'Texto de origen',
    instructions: 'Toca el campo y después el micrófono del teclado del teléfono. Revisa el texto antes de enviarlo.',
    languageHintPrefix: 'Usa un teclado configurado para', placeholder: 'Dicta, escribe o pega lo que quieras traducir…',
    submit: 'Traducir y leer', submitting: 'Traduciendo…', clear: 'Borrar',
    shortcutHint: 'Con un teclado físico, pulsa Ctrl/Command + Enter para enviar.', characterCountLabel: 'caracteres',
    emptyError: 'Primero escribe o dicta algún texto.', submitError: 'No se pudo enviar el texto. El original sigue en el campo.',
    openKeyboardMic: 'Abrir el micrófono del teclado del teléfono',
  },
  terms: {
    automaticLabel: 'Ruta automática (alternativa inteligente)', automaticDescription: 'Elige un flujo completo según el dispositivo, las claves API guardadas y la opción de alternativa en la nube.',
    fast: 'rápido', stable: 'estable', desktopChromeLocal: 'Chrome de escritorio, traducción en el dispositivo',
    desktopWebSpeechGemini: 'Web Speech de escritorio + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'Web Speech de escritorio + Azure AI Translator',
    mobileBergamot: 'Dictado con teclado móvil + Bergamot',
    mobileGemini: 'Dictado con teclado móvil + Gemini 3.5 Flash-Lite', mobileAzure: 'Dictado con teclado móvil + Azure AI Translator',
    geminiLiveDescription: 'El audio del micrófono y el traducido comparten una sesión bidireccional de Gemini Live; el texto disponible se guarda localmente.',
    openAiLiveDescription: 'El audio del micrófono y el traducido comparten una sesión bidireccional de OpenAI Realtime; el texto disponible se guarda localmente.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: 'Web Speech de escritorio con pausa final corta, traducción de Chrome en el dispositivo y TTS del dispositivo.',
    localStableDescription: 'Web Speech de escritorio con pausa final más larga, traducción de Chrome en el dispositivo y TTS del dispositivo.',
    desktopGeminiDescription: 'Entrada estable con Web Speech de escritorio, traducción de texto con Gemini y TTS del dispositivo.',
    desktopAzureDescription: 'Entrada estable con Web Speech de escritorio, traducción de texto con Azure y TTS del dispositivo.',
    mobileBergamotDescription: 'Dictado editable o escritura con teclado, traducción Bergamot en el dispositivo y TTS del dispositivo.',
    mobileGeminiDescription: 'Dictado editable o escritura con teclado, traducción con Gemini y TTS del dispositivo.',
    mobileAzureDescription: 'Dictado editable o escritura con teclado, traducción con Azure y TTS del dispositivo.',
  },
  flow: {
    inspectLabel: 'Comprobar este dispositivo', inspectDetail: 'Comprueba el tipo de dispositivo, las API del navegador, las claves guardadas y la alternativa en la nube.',
    resolveLabel: 'Elegir un flujo completo', resolveDetail: 'Da prioridad a una ruta local válida y solo usa la red si está habilitada la alternativa en la nube.',
    runLabel: 'Ejecutar el flujo resuelto', runDetail: 'Tras resolverlo, el flujo real desde la entrada hasta el registro sustituye estos pasos.',
    captureLabel: 'Transmitir audio del micrófono', captureDetail: 'Tras conceder permiso, el navegador envía el audio a la sesión en directo.',
    liveTranslateLabel: 'Traducir con {provider}', liveTranslateDetail: 'El reconocimiento, la traducción y la generación de audio se procesan juntos en una sesión en directo.',
    modelAudioLabel: 'Reproducir el audio traducido del modelo', modelAudioDetail: 'El navegador reproduce el audio a medida que llega del modelo.',
    saveTranscriptLabel: 'Guardar localmente el texto disponible', saveTranscriptDetail: 'El original y la traducción proporcionados por la sesión se añaden al historial local.',
    recognizeFastLabel: 'Reconocer voz (rápido)', recognizeFastDetail: 'Web Speech de escritorio utiliza una espera final más corta.',
    recognizeStableLabel: 'Reconocer voz (estable)', recognizeStableDetail: 'Web Speech espera más para detectar con mayor fiabilidad el final de la frase.',
    saveSourceLabel: 'Guardar primero el original', saveSourceDetail: 'El texto reconocido se guarda antes de iniciar la traducción.',
    translateLabel: 'Traducir con {provider}', translateLocalDetail: 'Chrome traduce con un paquete descargado en este equipo y no envía el texto a un proveedor.',
    translateNetworkDetail: 'El original guardado se envía a {provider}.',
    deviceTtsLabel: 'Leer con el TTS del dispositivo', deviceTtsDetail: 'El navegador lee la traducción con una voz instalada para el idioma de destino.',
    updateLabel: 'Actualizar el mismo registro', updateDetail: 'La entrada original se marca como completa o fallida, por lo que nunca desaparece.',
    editorLabel: 'Abrir el campo de texto original', editorDetail: 'Toca el campo de texto real para mostrar el teclado del teléfono o la tableta.',
    keyboardLabel: 'Dictar desde el teclado o escribir', keyboardDetail: 'Tú inicias el micrófono del teclado; la PWA solo recibe texto editable y no controla el dictado móvil.',
    submitLabel: 'Confirmar y guardar el original', submitDetail: 'Al tocar Traducir y leer, el original se guarda antes de cualquier solicitud de red.',
    mobileTtsDetail: 'El dispositivo lee la traducción con una voz instalada para el idioma de destino.',
    mobileUpdateDetail: 'El estado y el resultado se añaden a la entrada original ya guardada.',
  },
  requirements: {
    completeFlow: 'Debe estar disponible al menos uno de los flujos completos siguientes.', dictationIsInput: 'El dictado del teclado crea texto; no es un motor de traducción.',
    geminiKey: 'Clave API de Gemini guardada', openAiKey: 'Clave API de OpenAI guardada', azureKey: 'Clave de Azure Translator guardada y región cuando sea necesaria',
    azureSpeechKey: 'Clave y región de Azure Speech guardadas',
    microphone: 'Permiso para el micrófono', secure: 'Conexión HTTPS segura', websocketAudio: 'Compatibilidad con WebSocket y Web Audio', webrtc: 'Compatibilidad con WebRTC',
    desktopChrome: 'Chrome de escritorio', webSpeech: 'API Web Speech', chromeTranslator: 'API Chrome Translator y paquete de idioma descargado',
    bergamot: 'Workers de WebAssembly para Bergamot en el dispositivo',
    desktopWebSpeech: 'Navegador de escritorio compatible con Web Speech', network: 'Conexión de red', deviceVoice: 'Voz TTS instalada para el idioma de destino',
    mobileKeyboard: 'Teclado de teléfono o tableta', startKeyboardDictation: 'El usuario inicia el dictado desde el micrófono del teclado',
  },
  capabilities: {
    secure_context: 'una conexión HTTPS segura', microphone_capture: 'captura del micrófono en el navegador', websocket: 'compatibilidad con WebSocket',
    webrtc: 'compatibilidad con WebRTC', audio_context: 'compatibilidad con Web Audio', desktop_device: 'un equipo de escritorio o portátil',
    desktop_chrome: 'Chrome de escritorio', mobile_device: 'un teléfono o una tableta', web_speech: 'la API Web Speech',
    translator_api: 'la API Chrome Translator', speech_synthesis: 'texto a voz del dispositivo', editable_text: 'entrada de texto editable',
    web_assembly: 'workers de WebAssembly',
  },
  disabled: {
    requires: 'Requiere {items}.', geminiKey: 'Guarda una clave API de Gemini en Ajustes.', openAiKey: 'Guarda una clave API de OpenAI en Ajustes.',
    azureKey: 'Guarda una clave API de Azure Translator en Ajustes.',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: 'La alternativa automática en la nube está desactivada. Elige un flujo de nube o actívala en Ajustes.',
    mobileNeedsProvider: 'El dictado del teclado móvil solo crea texto. Guarda una clave de Gemini o Azure Translator para traducirlo.',
    noCompleteFlow: 'Ningún flujo completo coincide con este dispositivo y las claves API guardadas.',
  },
};

const FR: LocalePack = {
  ...EN,
  locale: 'fr',
  picker: {
    title: 'Choisir un flux complet', description: 'Chaque option présente le parcours réel : saisie, traduction, sortie vocale et enregistrement de la transcription.',
    groupLabels: { automatic: 'Automatique', 'live-audio': 'Audio en direct', desktop: 'Flux texte sur ordinateur', mobile: 'Flux avec clavier mobile' },
    activeFlowTitle: 'Flux actif', automaticResolvedPrefix: 'Choix automatique', requirementsLabel: 'Prérequis',
    availableLabel: 'Disponible', unavailableLabel: 'Indisponible', selectedLabel: 'Sélectionné',
    showFlowLabel: 'Afficher le flux complet', hideFlowLabel: 'Masquer le flux complet', closeLabel: 'Fermer le menu des flux',
    useAutomaticLabel: 'Utiliser le parcours automatique', usingAutomaticLabel: 'Le parcours automatique est actif', automaticBadge: 'Auto',
    locationLabels: { device: 'Appareil', browser: 'Navigateur', network: 'Réseau', storage: 'Enregistré localement' },
  },
  composer: {
    title: 'Dictée du clavier mobile', inputLabel: 'Texte source',
    instructions: 'Touchez le champ, puis le microphone du clavier du téléphone. Vérifiez le texte avant de l’envoyer.',
    languageHintPrefix: 'Utilisez un clavier configuré pour', placeholder: 'Dictez, saisissez ou collez le texte à traduire…',
    submit: 'Traduire et lire', submitting: 'Traduction…', clear: 'Effacer',
    shortcutHint: 'Avec un clavier physique, appuyez sur Ctrl/Commande + Entrée pour envoyer.', characterCountLabel: 'caractères',
    emptyError: 'Saisissez ou dictez d’abord du texte.', submitError: 'Le texte n’a pas pu être envoyé. La source reste dans le champ.',
    openKeyboardMic: 'Ouvrir le micro du clavier du téléphone',
  },
  terms: {
    automaticLabel: 'Routage automatique (repli intelligent)', automaticDescription: 'Choisit un flux complet selon l’appareil, les clés API enregistrées et le réglage de repli cloud.',
    fast: 'rapide', stable: 'stable', desktopChromeLocal: 'Chrome sur ordinateur, traduction locale',
    desktopWebSpeechGemini: 'Web Speech sur ordinateur + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'Web Speech sur ordinateur + Azure AI Translator',
    mobileBergamot: 'Dictée au clavier mobile + Bergamot',
    mobileGemini: 'Dictée au clavier mobile + Gemini 3.5 Flash-Lite', mobileAzure: 'Dictée au clavier mobile + Azure AI Translator',
    geminiLiveDescription: 'L’audio du micro et l’audio traduit partagent une session bidirectionnelle Gemini Live ; le texte disponible est enregistré localement.',
    openAiLiveDescription: 'L’audio du micro et l’audio traduit partagent une session bidirectionnelle OpenAI Realtime ; le texte disponible est enregistré localement.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: 'Saisie Web Speech sur ordinateur avec délai de fin court, traduction locale Chrome et TTS de l’appareil.',
    localStableDescription: 'Saisie Web Speech sur ordinateur avec délai de fin plus long, traduction locale Chrome et TTS de l’appareil.',
    desktopGeminiDescription: 'Saisie Web Speech stable sur ordinateur, traduction texte Gemini et TTS de l’appareil.',
    desktopAzureDescription: 'Saisie Web Speech stable sur ordinateur, traduction texte Azure et TTS de l’appareil.',
    mobileBergamotDescription: 'Dictée clavier modifiable ou saisie, traduction Bergamot sur l’appareil et TTS de l’appareil.',
    mobileGeminiDescription: 'Dictée clavier modifiable ou saisie, traduction texte Gemini et TTS de l’appareil.',
    mobileAzureDescription: 'Dictée clavier modifiable ou saisie, traduction texte Azure et TTS de l’appareil.',
  },
  flow: {
    inspectLabel: 'Examiner cet appareil', inspectDetail: 'Vérifie le type d’appareil, les API du navigateur, les clés enregistrées et le repli cloud.',
    resolveLabel: 'Choisir un flux complet', resolveDetail: 'Privilégie une voie locale admissible et n’utilise le réseau que si le repli cloud est activé.',
    runLabel: 'Exécuter le flux retenu', runDetail: 'Une fois résolu, le parcours réel de la saisie à l’enregistrement remplace ces étapes.',
    captureLabel: 'Transmettre l’audio du micro', captureDetail: 'Après autorisation, le navigateur envoie l’audio du micro à la session en direct.',
    liveTranslateLabel: 'Traduire avec {provider}', liveTranslateDetail: 'Reconnaissance, traduction et génération de la réponse audio sont réunies dans une session en direct.',
    modelAudioLabel: 'Lire l’audio traduit du modèle', modelAudioDetail: 'Le navigateur lit l’audio traduit à mesure qu’il arrive du modèle.',
    saveTranscriptLabel: 'Enregistrer localement le texte disponible', saveTranscriptDetail: 'La source et la traduction fournies par la session rejoignent l’historique local.',
    recognizeFastLabel: 'Reconnaître la parole (rapide)', recognizeFastDetail: 'Web Speech sur ordinateur utilise un délai de fin de parole plus court.',
    recognizeStableLabel: 'Reconnaître la parole (stable)', recognizeStableDetail: 'Web Speech attend davantage pour détecter plus sûrement la fin de la phrase.',
    saveSourceLabel: 'Enregistrer d’abord la source', saveSourceDetail: 'Le texte source reconnu est enregistré avant le début de la traduction.',
    translateLabel: 'Traduire avec {provider}', translateLocalDetail: 'Chrome utilise un pack de langue téléchargé sur cet ordinateur et n’envoie pas le texte à un prestataire.',
    translateNetworkDetail: 'Le texte source enregistré est envoyé à {provider}.',
    deviceTtsLabel: 'Lire avec le TTS de l’appareil', deviceTtsDetail: 'Le navigateur lit la traduction avec une voix cible installée.',
    updateLabel: 'Mettre à jour la même entrée', updateDetail: 'L’entrée source existante passe à terminée ou échouée ; la source ne disparaît donc jamais.',
    editorLabel: 'Ouvrir le champ de texte source', editorDetail: 'Touchez le vrai champ texte pour afficher le clavier du téléphone ou de la tablette.',
    keyboardLabel: 'Dicter au clavier ou saisir', keyboardDetail: 'Vous lancez le microphone du clavier ; la PWA ne reçoit que du texte modifiable et ne pilote pas la dictée mobile.',
    submitLabel: 'Confirmer et enregistrer la source', submitDetail: 'Touchez Traduire et lire : la source est enregistrée avant toute requête réseau.',
    mobileTtsDetail: 'L’appareil lit la traduction avec une voix cible installée.', mobileUpdateDetail: 'L’état et le résultat sont ajoutés à l’entrée source déjà enregistrée.',
  },
  requirements: {
    completeFlow: 'Au moins un des flux complets ci-dessous doit être disponible.', dictationIsInput: 'La dictée du clavier produit du texte ; ce n’est pas un moteur de traduction.',
    geminiKey: 'Clé API Gemini enregistrée', openAiKey: 'Clé API OpenAI enregistrée', azureKey: 'Clé Azure Translator enregistrée et région si nécessaire',
    azureSpeechKey: 'Clé et région Azure Speech enregistrées',
    microphone: 'Autorisation du microphone', secure: 'Connexion HTTPS sécurisée', websocketAudio: 'Prise en charge de WebSocket et Web Audio', webrtc: 'Prise en charge de WebRTC',
    desktopChrome: 'Chrome sur ordinateur', webSpeech: 'API Web Speech', chromeTranslator: 'API Chrome Translator et pack de langue téléchargé',
    bergamot: 'Workers WebAssembly pour Bergamot sur l’appareil',
    desktopWebSpeech: 'Navigateur de bureau compatible avec Web Speech', network: 'Connexion réseau', deviceVoice: 'Voix TTS cible installée',
    mobileKeyboard: 'Clavier de téléphone ou tablette', startKeyboardDictation: 'L’utilisateur lance la dictée depuis le microphone du clavier',
  },
  capabilities: {
    secure_context: 'une connexion HTTPS sécurisée', microphone_capture: 'la capture du microphone par le navigateur', websocket: 'la prise en charge de WebSocket',
    webrtc: 'la prise en charge de WebRTC', audio_context: 'la prise en charge de Web Audio', desktop_device: 'un ordinateur de bureau ou portable',
    desktop_chrome: 'Chrome sur ordinateur', mobile_device: 'un téléphone ou une tablette', web_speech: 'l’API Web Speech',
    translator_api: 'l’API Chrome Translator', speech_synthesis: 'la synthèse vocale de l’appareil', editable_text: 'une saisie de texte modifiable',
    web_assembly: 'des workers WebAssembly',
  },
  disabled: {
    requires: 'Nécessite {items}.', geminiKey: 'Enregistrez une clé API Gemini dans les réglages.', openAiKey: 'Enregistrez une clé API OpenAI dans les réglages.',
    azureKey: 'Enregistrez une clé API Azure Translator dans les réglages.',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: 'Le repli automatique vers le cloud est désactivé. Choisissez un flux cloud ou activez le repli dans les réglages.',
    mobileNeedsProvider: 'La dictée du clavier mobile ne produit que du texte. Enregistrez une clé Gemini ou Azure Translator pour le traduire.',
    noCompleteFlow: 'Aucun flux complet ne correspond à cet appareil et aux clés API enregistrées.',
  },
};

const DE: LocalePack = {
  ...EN,
  locale: 'de',
  picker: {
    title: 'Vollständigen Ablauf auswählen', description: 'Jede Option zeigt den tatsächlichen Ablauf von Eingabe, Übersetzung, Sprachausgabe und Protokollspeicherung.',
    groupLabels: { automatic: 'Automatisch', 'live-audio': 'Live-Audio', desktop: 'Desktop-Textabläufe', mobile: 'Abläufe mit mobiler Tastatur' },
    activeFlowTitle: 'Aktiver Ablauf', automaticResolvedPrefix: 'Automatisch ausgewählt', requirementsLabel: 'Voraussetzungen',
    availableLabel: 'Verfügbar', unavailableLabel: 'Nicht verfügbar', selectedLabel: 'Ausgewählt',
    showFlowLabel: 'Gesamten Ablauf anzeigen', hideFlowLabel: 'Ablauf ausblenden', closeLabel: 'Ablaufmenü schließen',
    useAutomaticLabel: 'Automatische Route verwenden', usingAutomaticLabel: 'Automatische Route ist aktiv', automaticBadge: 'Auto',
    locationLabels: { device: 'Gerät', browser: 'Browser', network: 'Netzwerk', storage: 'Lokal gespeichert' },
  },
  composer: {
    title: 'Diktat über die mobile Tastatur', inputLabel: 'Ausgangstext',
    instructions: 'Tippe auf das Feld und dann auf das Mikrofon der Telefontastatur. Prüfe den Text vor dem Absenden.',
    languageHintPrefix: 'Verwende eine Tastatur für', placeholder: 'Zu übersetzenden Inhalt diktieren, eingeben oder einfügen…',
    submit: 'Übersetzen und vorlesen', submitting: 'Übersetzung läuft…', clear: 'Löschen',
    shortcutHint: 'Mit Hardwaretastatur sendet Strg/Befehl + Eingabe.', characterCountLabel: 'Zeichen',
    emptyError: 'Gib zuerst Text ein oder diktiere ihn.', submitError: 'Der Text konnte nicht gesendet werden. Der Ausgangstext bleibt im Feld.',
    openKeyboardMic: 'Mikrofon der Handytastatur öffnen',
  },
  terms: {
    automaticLabel: 'Automatische Route (intelligenter Rückgriff)', automaticDescription: 'Wählt anhand der Gerätefunktionen, gespeicherten API-Schlüssel und Cloud-Rückgriffseinstellung einen vollständigen Ablauf.',
    fast: 'schnell', stable: 'stabil', desktopChromeLocal: 'Desktop-Chrome, Übersetzung auf dem Gerät',
    desktopWebSpeechGemini: 'Desktop Web Speech + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'Desktop Web Speech + Azure AI Translator',
    mobileBergamot: 'Diktat per mobiler Tastatur + Bergamot',
    mobileGemini: 'Diktat per mobiler Tastatur + Gemini 3.5 Flash-Lite', mobileAzure: 'Diktat per mobiler Tastatur + Azure AI Translator',
    geminiLiveDescription: 'Mikrofon- und Übersetzungsaudio laufen bidirektional in einer Gemini Live-Sitzung; verfügbarer Text wird lokal gespeichert.',
    openAiLiveDescription: 'Mikrofon- und Übersetzungsaudio laufen bidirektional in einer OpenAI Realtime-Sitzung; verfügbarer Text wird lokal gespeichert.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: 'Desktop Web Speech mit kurzer Sprechende-Wartezeit, lokale Chrome-Übersetzung und Geräte-TTS.',
    localStableDescription: 'Desktop Web Speech mit längerer Sprechende-Wartezeit, lokale Chrome-Übersetzung und Geräte-TTS.',
    desktopGeminiDescription: 'Stabile Desktop-Web-Speech-Eingabe, Gemini-Textübersetzung und Geräte-TTS.',
    desktopAzureDescription: 'Stabile Desktop-Web-Speech-Eingabe, Azure-Textübersetzung und Geräte-TTS.',
    mobileBergamotDescription: 'Bearbeitbares Tastaturdiktat oder Texteingabe, Bergamot-Übersetzung auf dem Gerät und Geräte-TTS.',
    mobileGeminiDescription: 'Bearbeitbares Tastaturdiktat oder Texteingabe, Gemini-Textübersetzung und Geräte-TTS.',
    mobileAzureDescription: 'Bearbeitbares Tastaturdiktat oder Texteingabe, Azure-Textübersetzung und Geräte-TTS.',
  },
  flow: {
    inspectLabel: 'Dieses Gerät prüfen', inspectDetail: 'Prüft Gerätetyp, Browser-APIs, gespeicherte Schlüssel und die Cloud-Rückgriffseinstellung.',
    resolveLabel: 'Vollständigen Ablauf wählen', resolveDetail: 'Bevorzugt einen geeigneten lokalen Weg und nutzt das Netzwerk nur bei aktiviertem Cloud-Rückgriff.',
    runLabel: 'Ermittelten Ablauf ausführen', runDetail: 'Nach der Auswahl ersetzt der tatsächliche Weg von der Eingabe bis zum Eintrag diese Schritte.',
    captureLabel: 'Mikrofonaudio streamen', captureDetail: 'Nach der Freigabe sendet der Browser das Mikrofonaudio an die Live-Sitzung.',
    liveTranslateLabel: 'Mit {provider} übersetzen', liveTranslateDetail: 'Erkennung, Übersetzung und Audioantwort werden gemeinsam in einer Live-Sitzung verarbeitet.',
    modelAudioLabel: 'Übersetztes Modellaudio abspielen', modelAudioDetail: 'Der Browser spielt die Übersetzung ab, sobald sie vom Live-Modell eintrifft.',
    saveTranscriptLabel: 'Verfügbaren Text lokal speichern', saveTranscriptDetail: 'Von der Sitzung gelieferter Ausgangs- und Zieltext werden dem lokalen Verlauf hinzugefügt.',
    recognizeFastLabel: 'Sprache erkennen (schnell)', recognizeFastDetail: 'Desktop Web Speech nutzt eine kürzere Verzögerung am Sprechende.',
    recognizeStableLabel: 'Sprache erkennen (stabil)', recognizeStableDetail: 'Desktop Web Speech wartet länger, um Satzgrenzen zuverlässiger zu erkennen.',
    saveSourceLabel: 'Ausgangstext zuerst speichern', saveSourceDetail: 'Der erkannte Ausgangstext wird vor Beginn der Übersetzung gespeichert.',
    translateLabel: 'Mit {provider} übersetzen', translateLocalDetail: 'Chrome übersetzt mit einem auf diesem Computer geladenen Sprachpaket und sendet den Text nicht an einen Anbieter.',
    translateNetworkDetail: 'Der gespeicherte Ausgangstext wird an {provider} gesendet.',
    deviceTtsLabel: 'Mit Geräte-TTS vorlesen', deviceTtsDetail: 'Der Browser liest die fertige Übersetzung mit einer installierten Zielsprachenstimme vor.',
    updateLabel: 'Denselben Eintrag aktualisieren', updateDetail: 'Der vorhandene Ausgangseintrag wird als fertig oder fehlgeschlagen markiert und verschwindet daher nie.',
    editorLabel: 'Feld für den Ausgangstext öffnen', editorDetail: 'Tippe auf das echte Textfeld, um die Telefon- oder Tablet-Tastatur anzuzeigen.',
    keyboardLabel: 'Über die Tastatur diktieren oder tippen', keyboardDetail: 'Du startest das Tastaturmikrofon; die PWA erhält nur bearbeitbaren Text und steuert das mobile Diktat nicht.',
    submitLabel: 'Ausgangstext bestätigen und speichern', submitDetail: 'Beim Tippen auf Übersetzen und vorlesen wird die Quelle vor jeder Netzwerkanfrage gespeichert.',
    mobileTtsDetail: 'Das Gerät liest die Übersetzung mit einer installierten Zielsprachenstimme vor.',
    mobileUpdateDetail: 'Übersetzungsstatus und Ergebnis werden an den bereits gespeicherten Ausgangseintrag angefügt.',
  },
  requirements: {
    completeFlow: 'Mindestens einer der folgenden vollständigen Abläufe muss verfügbar sein.', dictationIsInput: 'Tastaturdiktat erzeugt Text; es ist keine Übersetzungsengine.',
    geminiKey: 'Gespeicherter Gemini-API-Schlüssel', openAiKey: 'Gespeicherter OpenAI-API-Schlüssel', azureKey: 'Gespeicherter Azure-Translator-Schlüssel und bei Bedarf Region',
    azureSpeechKey: 'Gespeicherter Azure-Speech-Schlüssel und Region',
    microphone: 'Mikrofonberechtigung', secure: 'Sichere HTTPS-Verbindung', websocketAudio: 'WebSocket- und Web-Audio-Unterstützung', webrtc: 'WebRTC-Unterstützung',
    desktopChrome: 'Desktop-Chrome', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API und heruntergeladenes Sprachpaket',
    bergamot: 'WebAssembly-Worker für Bergamot auf dem Gerät',
    desktopWebSpeech: 'Desktop-Browser mit Web-Speech-Unterstützung', network: 'Netzwerkverbindung', deviceVoice: 'Installierte TTS-Stimme der Zielsprache',
    mobileKeyboard: 'Telefon- oder Tablet-Tastatur', startKeyboardDictation: 'Der Nutzer startet das Diktat über das Tastaturmikrofon',
  },
  capabilities: {
    secure_context: 'eine sichere HTTPS-Verbindung', microphone_capture: 'Mikrofonaufnahme im Browser', websocket: 'WebSocket-Unterstützung',
    webrtc: 'WebRTC-Unterstützung', audio_context: 'Web-Audio-Unterstützung', desktop_device: 'einen Desktop oder Laptop', desktop_chrome: 'Desktop-Chrome',
    mobile_device: 'ein Telefon oder Tablet', web_speech: 'die Web Speech API', translator_api: 'die Chrome Translator API',
    speech_synthesis: 'Text-to-Speech des Geräts', editable_text: 'bearbeitbare Texteingabe',
    web_assembly: 'WebAssembly-Worker',
  },
  disabled: {
    requires: 'Benötigt {items}.', geminiKey: 'Speichere einen Gemini-API-Schlüssel in den Einstellungen.', openAiKey: 'Speichere einen OpenAI-API-Schlüssel in den Einstellungen.',
    azureKey: 'Speichere einen Azure-Translator-API-Schlüssel in den Einstellungen.',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: 'Der automatische Cloud-Rückgriff ist aus. Wähle einen Cloud-Ablauf oder aktiviere ihn in den Einstellungen.',
    mobileNeedsProvider: 'Das mobile Tastaturdiktat erzeugt nur Text. Speichere zum Übersetzen einen Gemini- oder Azure-Translator-Schlüssel.',
    noCompleteFlow: 'Kein vollständiger Ablauf passt zu diesem Gerät und den gespeicherten API-Schlüsseln.',
  },
};

const VI: LocalePack = {
  ...EN,
  locale: 'vi',
  picker: {
    title: 'Chọn quy trình hoàn chỉnh', description: 'Mỗi lựa chọn hiển thị đúng luồng nhập liệu, dịch, phát giọng nói và lưu bản ghi.',
    groupLabels: { automatic: 'Tự động', 'live-audio': 'Âm thanh trực tiếp', desktop: 'Quy trình văn bản trên máy tính', mobile: 'Quy trình bàn phím di động' },
    activeFlowTitle: 'Luồng đang dùng', automaticResolvedPrefix: 'Tự động chọn', requirementsLabel: 'Yêu cầu',
    availableLabel: 'Có thể dùng', unavailableLabel: 'Không thể dùng', selectedLabel: 'Đã chọn',
    showFlowLabel: 'Hiện luồng đầy đủ', hideFlowLabel: 'Ẩn luồng đầy đủ', closeLabel: 'Đóng menu quy trình',
    useAutomaticLabel: 'Dùng đường dẫn tự động', usingAutomaticLabel: 'Đang dùng đường dẫn tự động', automaticBadge: 'Tự động',
    locationLabels: { device: 'Thiết bị', browser: 'Trình duyệt', network: 'Mạng', storage: 'Lưu cục bộ' },
  },
  composer: {
    title: 'Nhập giọng nói bằng bàn phím di động', inputLabel: 'Văn bản nguồn',
    instructions: 'Chạm vào ô, rồi chạm mic trên bàn phím điện thoại. Hãy kiểm tra văn bản trước khi gửi.',
    languageHintPrefix: 'Dùng bàn phím được cài cho', placeholder: 'Đọc, nhập hoặc dán nội dung cần dịch…',
    submit: 'Dịch và đọc', submitting: 'Đang dịch…', clear: 'Xóa',
    shortcutHint: 'Với bàn phím vật lý, nhấn Ctrl/Command + Enter để gửi.', characterCountLabel: 'ký tự',
    emptyError: 'Hãy nhập hoặc đọc một đoạn văn bản trước.', submitError: 'Không gửi được văn bản. Nội dung nguồn vẫn còn trong ô.',
    openKeyboardMic: 'Mở micro bàn phím điện thoại',
  },
  terms: {
    automaticLabel: 'Định tuyến tự động (chuyển hướng thông minh)', automaticDescription: 'Chọn quy trình hoàn chỉnh dựa trên khả năng thiết bị, khóa API đã lưu và cài đặt chuyển sang đám mây.',
    fast: 'nhanh', stable: 'ổn định', desktopChromeLocal: 'Chrome máy tính, dịch trên thiết bị',
    desktopWebSpeechGemini: 'Web Speech máy tính + Gemini 3.5 Flash-Lite', desktopWebSpeechAzure: 'Web Speech máy tính + Azure AI Translator',
    mobileBergamot: 'Nhập giọng nói bằng bàn phím + Bergamot',
    mobileGemini: 'Nhập giọng nói bằng bàn phím + Gemini 3.5 Flash-Lite', mobileAzure: 'Nhập giọng nói bằng bàn phím + Azure AI Translator',
    geminiLiveDescription: 'Âm thanh mic và âm thanh dịch dùng chung một phiên Gemini Live hai chiều; văn bản có sẵn được lưu cục bộ.',
    openAiLiveDescription: 'Âm thanh mic và âm thanh dịch dùng chung một phiên OpenAI Realtime hai chiều; văn bản có sẵn được lưu cục bộ.',
    azureLiveInterpreterDescription: 'Azure Speech Live Interpreter streams microphone audio to speech-to-speech translation with automatic source-language detection.',
    azureSpeechTranslationDescription: 'Azure Speech Translation streams microphone audio, returns a source transcript, and plays synthesized target-language audio.',
    localFastDescription: 'Web Speech máy tính với thời gian chờ kết thúc ngắn, Chrome dịch trên thiết bị và TTS của thiết bị.',
    localStableDescription: 'Web Speech máy tính với thời gian chờ kết thúc dài hơn, Chrome dịch trên thiết bị và TTS của thiết bị.',
    desktopGeminiDescription: 'Đầu vào Web Speech ổn định trên máy tính, dịch văn bản Gemini và TTS của thiết bị.',
    desktopAzureDescription: 'Đầu vào Web Speech ổn định trên máy tính, dịch văn bản Azure và TTS của thiết bị.',
    mobileBergamotDescription: 'Nhập giọng nói có thể sửa hoặc gõ bằng bàn phím, dịch Bergamot trên thiết bị và TTS của thiết bị.',
    mobileGeminiDescription: 'Nhập giọng nói có thể sửa hoặc gõ bằng bàn phím, dịch văn bản Gemini và TTS của thiết bị.',
    mobileAzureDescription: 'Nhập giọng nói có thể sửa hoặc gõ bằng bàn phím, dịch văn bản Azure và TTS của thiết bị.',
  },
  flow: {
    inspectLabel: 'Kiểm tra thiết bị này', inspectDetail: 'Kiểm tra loại thiết bị, API trình duyệt, khóa đã lưu và cài đặt chuyển sang đám mây.',
    resolveLabel: 'Chọn quy trình hoàn chỉnh', resolveDetail: 'Ưu tiên đường chạy hợp lệ trên thiết bị và chỉ dùng mạng khi đã bật chuyển sang đám mây.',
    runLabel: 'Chạy luồng đã chọn', runDetail: 'Sau khi chọn, luồng thực tế từ nhập liệu đến lưu bản ghi sẽ thay thế các bước này.',
    captureLabel: 'Truyền âm thanh mic', captureDetail: 'Sau khi được cấp quyền, trình duyệt gửi âm thanh mic đến phiên trực tiếp.',
    liveTranslateLabel: 'Dịch bằng {provider}', liveTranslateDetail: 'Nhận dạng, dịch và tạo âm thanh phản hồi được xử lý cùng nhau trong một phiên trực tiếp.',
    modelAudioLabel: 'Phát âm thanh dịch từ mô hình', modelAudioDetail: 'Trình duyệt phát âm thanh dịch ngay khi mô hình trực tiếp trả về.',
    saveTranscriptLabel: 'Lưu cục bộ văn bản có sẵn', saveTranscriptDetail: 'Văn bản nguồn và bản dịch do phiên cung cấp được thêm vào lịch sử cục bộ.',
    recognizeFastLabel: 'Nhận dạng giọng nói (nhanh)', recognizeFastDetail: 'Web Speech máy tính dùng thời gian chờ kết thúc lời nói ngắn hơn.',
    recognizeStableLabel: 'Nhận dạng giọng nói (ổn định)', recognizeStableDetail: 'Web Speech chờ lâu hơn để xác định ranh giới câu đáng tin cậy hơn.',
    saveSourceLabel: 'Lưu văn bản nguồn trước', saveSourceDetail: 'Bản ghi nguồn được lưu trước khi bắt đầu dịch.',
    translateLabel: 'Dịch bằng {provider}', translateLocalDetail: 'Chrome dịch bằng gói ngôn ngữ đã tải trên máy này và không gửi văn bản cho nhà cung cấp.',
    translateNetworkDetail: 'Văn bản nguồn đã lưu được gửi đến {provider}.',
    deviceTtsLabel: 'Đọc bằng TTS của thiết bị', deviceTtsDetail: 'Trình duyệt đọc bản dịch hoàn chỉnh bằng giọng ngôn ngữ đích đã cài.',
    updateLabel: 'Cập nhật cùng bản ghi', updateDetail: 'Mục nguồn hiện có được đánh dấu hoàn tất hoặc thất bại nên văn bản nguồn không biến mất.',
    editorLabel: 'Mở ô văn bản nguồn', editorDetail: 'Chạm vào ô văn bản thật để hiện bàn phím điện thoại hoặc máy tính bảng.',
    keyboardLabel: 'Đọc bằng bàn phím hoặc gõ', keyboardDetail: 'Bạn tự bật mic bàn phím; PWA chỉ nhận văn bản có thể sửa và không điều khiển tính năng đọc chính tả.',
    submitLabel: 'Xác nhận và lưu nguồn', submitDetail: 'Khi chạm Dịch và đọc, nguồn được lưu trước mọi yêu cầu mạng.',
    mobileTtsDetail: 'Thiết bị đọc bản dịch bằng giọng ngôn ngữ đích đã cài.', mobileUpdateDetail: 'Trạng thái và kết quả dịch được gắn vào mục nguồn đã lưu.',
  },
  requirements: {
    completeFlow: 'Phải có ít nhất một quy trình hoàn chỉnh bên dưới dùng được.', dictationIsInput: 'Nhập giọng nói từ bàn phím chỉ tạo văn bản; đó không phải công cụ dịch.',
    geminiKey: 'Khóa API Gemini đã lưu', openAiKey: 'Khóa API OpenAI đã lưu', azureKey: 'Khóa Azure Translator đã lưu và khu vực nếu cần',
    azureSpeechKey: 'Khóa và khu vực Azure Speech đã lưu',
    microphone: 'Quyền dùng mic', secure: 'Kết nối HTTPS an toàn', websocketAudio: 'Hỗ trợ WebSocket và Web Audio', webrtc: 'Hỗ trợ WebRTC',
    desktopChrome: 'Chrome trên máy tính', webSpeech: 'Web Speech API', chromeTranslator: 'Chrome Translator API và gói ngôn ngữ đã tải',
    bergamot: 'Worker WebAssembly cho Bergamot trên thiết bị',
    desktopWebSpeech: 'Trình duyệt máy tính hỗ trợ Web Speech', network: 'Kết nối mạng', deviceVoice: 'Giọng TTS ngôn ngữ đích đã cài',
    mobileKeyboard: 'Bàn phím điện thoại hoặc máy tính bảng', startKeyboardDictation: 'Người dùng bắt đầu đọc từ mic bàn phím',
  },
  capabilities: {
    secure_context: 'kết nối HTTPS an toàn', microphone_capture: 'thu mic trong trình duyệt', websocket: 'hỗ trợ WebSocket', webrtc: 'hỗ trợ WebRTC',
    audio_context: 'hỗ trợ Web Audio', desktop_device: 'máy tính để bàn hoặc xách tay', desktop_chrome: 'Chrome trên máy tính',
    mobile_device: 'điện thoại hoặc máy tính bảng', web_speech: 'Web Speech API', translator_api: 'Chrome Translator API',
    speech_synthesis: 'đọc văn bản trên thiết bị', editable_text: 'ô nhập văn bản có thể sửa',
    web_assembly: 'worker WebAssembly',
  },
  disabled: {
    requires: 'Cần {items}.', geminiKey: 'Hãy lưu khóa API Gemini trong Cài đặt.', openAiKey: 'Hãy lưu khóa API OpenAI trong Cài đặt.',
    azureKey: 'Hãy lưu khóa API Azure Translator trong Cài đặt.',
    azureSpeechKey: 'Save an Azure Speech API key and region in Settings.',
    cloudFallbackOff: 'Chuyển hướng tự động sang đám mây đang tắt. Hãy chọn trực tiếp một quy trình đám mây hoặc bật tùy chọn này trong Cài đặt.',
    mobileNeedsProvider: 'Nhập giọng nói bằng bàn phím di động chỉ tạo văn bản. Hãy lưu khóa Gemini hoặc Azure Translator để dịch.',
    noCompleteFlow: 'Không có quy trình hoàn chỉnh nào phù hợp với thiết bị và các khóa API hiện đã lưu.',
  },
};

const LOCALES: Record<SupportedLocale, LocalePack> = {
  en: EN,
  ko: KO,
  ja: JA,
  'zh-TW': ZH_TW,
  zh: ZH,
  es: ES,
  fr: FR,
  de: DE,
  vi: VI,
};

const normalizeLocale = (languageCode?: string): SupportedLocale => {
  const normalized = languageCode?.trim().replaceAll('_', '-').toLowerCase() ?? '';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized === 'zh-tw' || normalized.startsWith('zh-hant')) return 'zh-TW';
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('vi')) return 'vi';
  return 'en';
};

const format = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  );

const profileLabel = (id: WorkflowProfileId, pack: LocalePack): string => {
  switch (id) {
    case 'auto': return pack.terms.automaticLabel;
    case 'gemini-3.5-live-translate-preview': return 'Gemini 3.5 Live Translate Preview';
    case 'gpt-realtime-translate': return 'OpenAI GPT Realtime Translate';
    case 'azure-speech-live-interpreter': return 'Azure Speech Live Interpreter';
    case 'azure-speech-translation': return 'Azure Speech Translation';
    case 'desktop-chrome-on-device-fast': return `${pack.terms.desktopChromeLocal} — ${pack.terms.fast}`;
    case 'desktop-chrome-on-device-stable': return `${pack.terms.desktopChromeLocal} — ${pack.terms.stable}`;
    case 'desktop-webspeech-gemini-stable': return `${pack.terms.desktopWebSpeechGemini} — ${pack.terms.stable}`;
    case 'desktop-webspeech-azure-stable': return `${pack.terms.desktopWebSpeechAzure} — ${pack.terms.stable}`;
    case 'mobile-dictation-bergamot': return pack.terms.mobileBergamot;
    case 'mobile-dictation-gemini': return pack.terms.mobileGemini;
    case 'mobile-dictation-azure': return pack.terms.mobileAzure;
  }
};

const profileDescription = (id: WorkflowProfileId, pack: LocalePack): string => {
  switch (id) {
    case 'auto': return pack.terms.automaticDescription;
    case 'gemini-3.5-live-translate-preview': return pack.terms.geminiLiveDescription;
    case 'gpt-realtime-translate': return pack.terms.openAiLiveDescription;
    case 'azure-speech-live-interpreter': return pack.terms.azureLiveInterpreterDescription;
    case 'azure-speech-translation': return pack.terms.azureSpeechTranslationDescription;
    case 'desktop-chrome-on-device-fast': return pack.terms.localFastDescription;
    case 'desktop-chrome-on-device-stable': return pack.terms.localStableDescription;
    case 'desktop-webspeech-gemini-stable': return pack.terms.desktopGeminiDescription;
    case 'desktop-webspeech-azure-stable': return pack.terms.desktopAzureDescription;
    case 'mobile-dictation-bergamot': return pack.terms.mobileBergamotDescription;
    case 'mobile-dictation-gemini': return pack.terms.mobileGeminiDescription;
    case 'mobile-dictation-azure': return pack.terms.mobileAzureDescription;
  }
};

const providerForProfile = (id: WorkflowProfileId): string => {
  if (id === 'gemini-3.5-live-translate-preview') return 'Gemini Live';
  if (id === 'gpt-realtime-translate') return 'OpenAI Realtime';
  if (id === 'azure-speech-live-interpreter') return 'Azure Speech Live Interpreter';
  if (id === 'azure-speech-translation') return 'Azure Speech Translation';
  if (id === 'desktop-chrome-on-device-fast' || id === 'desktop-chrome-on-device-stable') {
    return 'Chrome Translator';
  }
  if (id === 'mobile-dictation-bergamot') return 'Bergamot';
  if (id === 'desktop-webspeech-azure-stable' || id === 'mobile-dictation-azure') {
    return 'Azure AI Translator';
  }
  return 'Gemini 3.5 Flash-Lite';
};

const localizedSteps = (
  profile: WorkflowProfile,
  pack: LocalePack
): { labels: readonly string[]; details: readonly string[] } => {
  const { flow } = pack;
  const provider = providerForProfile(profile.id);
  if (profile.id === 'auto') {
    return {
      labels: [flow.inspectLabel, flow.resolveLabel, flow.runLabel],
      details: [flow.inspectDetail, flow.resolveDetail, flow.runDetail],
    };
  }
  if (profile.kind === 'realtime-audio') {
    return {
      labels: [
        flow.captureLabel,
        format(flow.liveTranslateLabel, { provider }),
        flow.modelAudioLabel,
        flow.saveTranscriptLabel,
      ],
      details: [flow.captureDetail, flow.liveTranslateDetail, flow.modelAudioDetail, flow.saveTranscriptDetail],
    };
  }
  if (profile.inputMethod === 'mobile_keyboard') {
    return {
      labels: [
        flow.editorLabel,
        flow.keyboardLabel,
        flow.submitLabel,
        format(flow.translateLabel, { provider }),
        flow.deviceTtsLabel,
        flow.updateLabel,
      ],
      details: [
        flow.editorDetail,
        flow.keyboardDetail,
        flow.submitDetail,
        format(flow.translateNetworkDetail, { provider }),
        flow.mobileTtsDetail,
        flow.mobileUpdateDetail,
      ],
    };
  }
  const isFast = profile.endpointProfile === 'fast';
  const isLocal = profile.translationMethod === 'chrome_translator';
  return {
    labels: [
      isFast ? flow.recognizeFastLabel : flow.recognizeStableLabel,
      flow.saveSourceLabel,
      format(flow.translateLabel, { provider }),
      flow.deviceTtsLabel,
      flow.updateLabel,
    ],
    details: [
      isFast ? flow.recognizeFastDetail : flow.recognizeStableDetail,
      flow.saveSourceDetail,
      isLocal ? flow.translateLocalDetail : format(flow.translateNetworkDetail, { provider }),
      flow.deviceTtsDetail,
      flow.updateDetail,
    ],
  };
};

const localizedRequirements = (profile: WorkflowProfile, pack: LocalePack): readonly string[] => {
  const r = pack.requirements;
  switch (profile.id) {
    case 'auto': return [r.completeFlow, r.dictationIsInput];
    case 'gemini-3.5-live-translate-preview': return [r.geminiKey, r.microphone, r.secure, r.websocketAudio];
    case 'gpt-realtime-translate': return [r.openAiKey, r.microphone, r.secure, r.webrtc];
    case 'azure-speech-live-interpreter':
    case 'azure-speech-translation':
      return [r.azureSpeechKey, r.microphone, r.secure, r.websocketAudio];
    case 'desktop-chrome-on-device-fast':
    case 'desktop-chrome-on-device-stable':
      return [r.desktopChrome, r.webSpeech, r.chromeTranslator, r.deviceVoice];
    case 'desktop-webspeech-gemini-stable': return [r.desktopWebSpeech, r.geminiKey, r.network, r.deviceVoice];
    case 'desktop-webspeech-azure-stable': return [r.desktopWebSpeech, r.azureKey, r.network, r.deviceVoice];
    case 'mobile-dictation-bergamot': return [r.mobileKeyboard, r.startKeyboardDictation, r.bergamot, r.deviceVoice];
    case 'mobile-dictation-gemini': return [r.mobileKeyboard, r.startKeyboardDictation, r.geminiKey, r.network, r.deviceVoice];
    case 'mobile-dictation-azure': return [r.mobileKeyboard, r.startKeyboardDictation, r.azureKey, r.network, r.deviceVoice];
  }
};

const joinLocalized = (items: readonly string[], locale: SupportedLocale): string => {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
};

const localizedDisabledReason = (
  profile: WorkflowProfile,
  state: WorkflowAvailability | undefined,
  pack: LocalePack
): string | undefined => {
  if (!state || state.available) return undefined;
  const reasons: string[] = [];
  if (state.missingCapabilities.length > 0) {
    const capabilityNames = state.missingCapabilities.map((capability) => pack.capabilities[capability]);
    reasons.push(format(pack.disabled.requires, {
      items: joinLocalized(capabilityNames, pack.locale),
    }));
  }
  if (state.missingCredential === 'gemini') reasons.push(pack.disabled.geminiKey);
  if (state.missingCredential === 'openai') reasons.push(pack.disabled.openAiKey);
  if (state.missingCredential === 'azure') reasons.push(pack.disabled.azureKey);
  if (state.missingCredential === 'azureSpeech') reasons.push(pack.disabled.azureSpeechKey);
  if (reasons.length > 0) return reasons.join(' ');

  const originalReason = state.disabledReason?.toLowerCase() ?? '';
  if (profile.id === 'auto' && originalReason.includes('cloud fallback') && originalReason.includes('off')) {
    return pack.disabled.cloudFallbackOff;
  }
  if (profile.id === 'auto' && originalReason.includes('mobile keyboard')) {
    return pack.disabled.mobileNeedsProvider;
  }
  return pack.disabled.noCompleteFlow;
};

export const getWorkflowPickerCopy = (
  languageCode: string,
  profiles: readonly WorkflowProfile[],
  availability: Partial<Record<WorkflowProfileId, WorkflowAvailability>>
): WorkflowPickerCopyOverrides => {
  const pack = LOCALES[normalizeLocale(languageCode)];
  const profileLabels: Partial<Record<WorkflowProfileId, string>> = {};
  const profileDescriptions: Partial<Record<WorkflowProfileId, string>> = {};
  const profileRequirements: Partial<Record<WorkflowProfileId, readonly string[]>> = {};
  const profileStepLabels: Partial<Record<WorkflowProfileId, readonly string[]>> = {};
  const profileStepDetails: Partial<Record<WorkflowProfileId, readonly string[]>> = {};
  const disabledReasons: Partial<Record<WorkflowProfileId, string>> = {};

  for (const profile of profiles) {
    profileLabels[profile.id] = profileLabel(profile.id, pack);
    profileDescriptions[profile.id] = profileDescription(profile.id, pack);
    profileRequirements[profile.id] = localizedRequirements(profile, pack);
    const steps = localizedSteps(profile, pack);
    profileStepLabels[profile.id] = steps.labels;
    profileStepDetails[profile.id] = steps.details;
    const disabledReason = localizedDisabledReason(profile, availability[profile.id], pack);
    if (disabledReason) disabledReasons[profile.id] = disabledReason;
  }

  return {
    ...pack.picker,
    profileLabels,
    profileDescriptions,
    profileRequirements,
    profileStepLabels,
    profileStepDetails,
    disabledReasons,
  };
};

export const getMobileDictationComposerCopy = (
  languageCode: string
): Partial<MobileDictationComposerCopy> => LOCALES[normalizeLocale(languageCode)].composer;
