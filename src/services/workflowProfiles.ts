import type { PlatformCapabilities } from './platformCapabilities';

export type WorkflowProfileId =
  | 'auto'
  | 'gemini-3.5-live-translate-preview'
  | 'gpt-realtime-translate'
  | 'desktop-chrome-on-device-fast'
  | 'desktop-chrome-on-device-stable'
  | 'desktop-webspeech-gemini-stable'
  | 'desktop-webspeech-azure-stable'
  | 'mobile-dictation-gemini'
  | 'mobile-dictation-azure';

export type WorkflowGroup = 'automatic' | 'live-audio' | 'desktop' | 'mobile';

export type WorkflowKind = 'automatic' | 'realtime-audio' | 'text-pipeline';

export type WorkflowCredentialProvider = 'gemini' | 'openai' | 'azure' | null;

export type WorkflowCapability =
  | 'secure_context'
  | 'microphone_capture'
  | 'websocket'
  | 'webrtc'
  | 'audio_context'
  | 'desktop_device'
  | 'desktop_chrome'
  | 'mobile_device'
  | 'web_speech'
  | 'translator_api'
  | 'speech_synthesis'
  | 'editable_text';

export type WorkflowInputMethod =
  | 'automatic'
  | 'live_microphone'
  | 'desktop_web_speech'
  | 'mobile_keyboard';

export type WorkflowTranslationMethod =
  | 'automatic'
  | 'gemini_live'
  | 'openai_realtime'
  | 'chrome_translator'
  | 'gemini_flash_lite'
  | 'azure_translator';

export type WorkflowOutputMethod = 'automatic' | 'model_audio' | 'device_tts';

export type WorkflowEndpointProfile = 'fast' | 'stable' | null;

export interface WorkflowFlowStep {
  id: string;
  label: string;
  detail: string;
  location: 'device' | 'browser' | 'network' | 'storage';
}

export interface WorkflowProfile {
  id: WorkflowProfileId;
  label: string;
  shortLabel: string;
  description: string;
  group: WorkflowGroup;
  kind: WorkflowKind;
  inputMethod: WorkflowInputMethod;
  translationMethod: WorkflowTranslationMethod;
  outputMethod: WorkflowOutputMethod;
  endpointProfile: WorkflowEndpointProfile;
  credentialProvider: WorkflowCredentialProvider;
  requiredCapabilities: readonly WorkflowCapability[];
  requirements: readonly string[];
  steps: readonly WorkflowFlowStep[];
}

export interface WorkflowCredentialState {
  gemini: boolean;
  openai: boolean;
  azure: boolean;
}

export interface WorkflowAvailabilityContext {
  capabilities: PlatformCapabilities;
  credentials: WorkflowCredentialState;
}

export interface WorkflowAvailability {
  available: boolean;
  disabledReason?: string;
  missingCapabilities: readonly WorkflowCapability[];
  missingCredential?: Exclude<WorkflowCredentialProvider, null>;
}

export interface WorkflowResolutionOptions {
  mode?: 'text-first' | 'audio-first' | 'any';
  /** Cloud translation is opt-in for Automatic; explicit cloud profiles remain selectable. */
  allowCloudFallback?: boolean;
  preferredCloudProvider?: 'gemini' | 'azure';
  preferredRealtimeProvider?: 'gemini' | 'openai';
  desktopEndpoint?: 'fast' | 'stable';
}

export interface WorkflowResolution {
  profile: WorkflowProfile | null;
  reason?: string;
}

const liveAudioSteps = (
  provider: 'Gemini Live' | 'OpenAI Realtime'
): readonly WorkflowFlowStep[] => [
  {
    id: 'capture-audio',
    label: 'Capture microphone audio',
    detail: 'The browser streams microphone audio after the user grants permission.',
    location: 'browser',
  },
  {
    id: 'live-translation',
    label: `Translate with ${provider}`,
    detail: 'Speech recognition, translation, and response generation happen in one live session.',
    location: 'network',
  },
  {
    id: 'model-audio',
    label: 'Play translated model audio',
    detail: 'Translated audio is played as it arrives from the live model.',
    location: 'browser',
  },
  {
    id: 'save-transcript',
    label: 'Save the transcript',
    detail: 'Available source and translated text are recorded in local history.',
    location: 'storage',
  },
];

const desktopTextSteps = (
  translationLabel: string,
  endpoint: 'fast' | 'stable',
  translationLocation: 'device' | 'network'
): readonly WorkflowFlowStep[] => [
  {
    id: 'desktop-speech',
    label: `Recognize speech (${endpoint})`,
    detail: endpoint === 'fast'
      ? 'Ignores brief filler pauses, then sends about 2–3 sentences after a ~1.2s gap.'
      : 'Ignores brief filler pauses, then sends about 3–4 sentences after a ~1.5s gap.',
    location: 'browser',
  },
  {
    id: 'save-source',
    label: 'Save source text',
    detail: 'The source transcript is recorded before translation begins.',
    location: 'storage',
  },
  {
    id: 'translate-text',
    label: `Translate with ${translationLabel}`,
    detail: translationLocation === 'device'
      ? 'Chrome translates with a downloaded language pack on this computer.'
      : 'The source text is sent to the configured translation provider.',
    location: translationLocation,
  },
  {
    id: 'device-tts',
    label: 'Speak with device TTS',
    detail: 'Listening continues while phrases translate in the background. Play a transcript line to hear it with an installed voice.',
    location: 'device',
  },
  {
    id: 'update-record',
    label: 'Update the saved record',
    detail: 'The same entry is marked complete or failed without losing its source text.',
    location: 'storage',
  },
];

const mobileDictationSteps = (
  translationLabel: string
): readonly WorkflowFlowStep[] => [
  {
    id: 'focus-editor',
    label: 'Open the text editor',
    detail: 'Tap the source field to display the phone keyboard.',
    location: 'device',
  },
  {
    id: 'keyboard-dictation',
    label: 'Use keyboard dictation or typing',
    detail: 'The user taps the keyboard microphone; the web app receives editable text, not microphone control.',
    location: 'device',
  },
  {
    id: 'save-source',
    label: 'Submit and save source text',
    detail: 'The confirmed source text is recorded before any network request.',
    location: 'storage',
  },
  {
    id: 'translate-text',
    label: `Translate with ${translationLabel}`,
    detail: 'The submitted text is sent to the configured translation provider.',
    location: 'network',
  },
  {
    id: 'device-tts',
    label: 'Speak with device TTS',
    detail: 'The translated text is read by an installed target-language voice.',
    location: 'device',
  },
  {
    id: 'update-record',
    label: 'Update the saved record',
    detail: 'Translation status and output are attached to the existing source entry.',
    location: 'storage',
  },
];

export const WORKFLOW_PROFILES: readonly WorkflowProfile[] = [
  {
    id: 'auto',
    label: 'Automatic routing (smart fallback)',
    shortLabel: 'Automatic',
    description: 'Choose a complete workflow from device capabilities and saved credentials.',
    group: 'automatic',
    kind: 'automatic',
    inputMethod: 'automatic',
    translationMethod: 'automatic',
    outputMethod: 'automatic',
    endpointProfile: null,
    credentialProvider: null,
    requiredCapabilities: [],
    requirements: [
      'At least one complete workflow below must be available.',
      'Automatic routing never treats keyboard dictation itself as a translation engine.',
    ],
    steps: [
      {
        id: 'inspect-capabilities',
        label: 'Inspect this device',
        detail: 'Check mobile or desktop input, browser APIs, and saved provider credentials.',
        location: 'browser',
      },
      {
        id: 'resolve-workflow',
        label: 'Select a complete workflow',
        detail: 'Prefer an eligible local route, then an explicitly configured network route.',
        location: 'browser',
      },
      {
        id: 'run-resolved-flow',
        label: 'Run the resolved steps',
        detail: 'The active flow shown below replaces these routing steps after resolution.',
        location: 'browser',
      },
    ],
  },
  {
    id: 'gemini-3.5-live-translate-preview',
    label: 'Gemini 3.5 Live Translate Preview',
    shortLabel: 'Gemini Live',
    description: 'Bidirectional live audio translation over a Gemini WebSocket session.',
    group: 'live-audio',
    kind: 'realtime-audio',
    inputMethod: 'live_microphone',
    translationMethod: 'gemini_live',
    outputMethod: 'model_audio',
    endpointProfile: null,
    credentialProvider: 'gemini',
    requiredCapabilities: ['secure_context', 'microphone_capture', 'websocket', 'audio_context'],
    requirements: ['Gemini API key', 'Microphone permission', 'Secure connection', 'WebSocket and Web Audio support'],
    steps: liveAudioSteps('Gemini Live'),
  },
  {
    id: 'gpt-realtime-translate',
    label: 'OpenAI GPT Realtime Translate',
    shortLabel: 'GPT Realtime',
    description: 'Bidirectional live audio translation over an OpenAI WebRTC session.',
    group: 'live-audio',
    kind: 'realtime-audio',
    inputMethod: 'live_microphone',
    translationMethod: 'openai_realtime',
    outputMethod: 'model_audio',
    endpointProfile: null,
    credentialProvider: 'openai',
    requiredCapabilities: ['secure_context', 'microphone_capture', 'webrtc'],
    requirements: ['OpenAI API key', 'Microphone permission', 'Secure connection', 'WebRTC support'],
    steps: liveAudioSteps('OpenAI Realtime'),
  },
  {
    id: 'desktop-chrome-on-device-fast',
    label: 'Desktop Chrome on-device — fast',
    shortLabel: 'Chrome local · fast',
    description: 'Web Speech input, Chrome Translator, and device TTS with a short endpoint delay.',
    group: 'desktop',
    kind: 'text-pipeline',
    inputMethod: 'desktop_web_speech',
    translationMethod: 'chrome_translator',
    outputMethod: 'device_tts',
    endpointProfile: 'fast',
    credentialProvider: null,
    requiredCapabilities: ['desktop_device', 'desktop_chrome', 'web_speech', 'translator_api', 'speech_synthesis'],
    requirements: ['Desktop Chrome', 'Web Speech API', 'Chrome Translator API and language pack', 'Device TTS voice'],
    steps: desktopTextSteps('Chrome on-device Translator', 'fast', 'device'),
  },
  {
    id: 'desktop-chrome-on-device-stable',
    label: 'Desktop Chrome on-device — stable',
    shortLabel: 'Chrome local · stable',
    description: 'Web Speech input, Chrome Translator, and device TTS with a stable endpoint delay.',
    group: 'desktop',
    kind: 'text-pipeline',
    inputMethod: 'desktop_web_speech',
    translationMethod: 'chrome_translator',
    outputMethod: 'device_tts',
    endpointProfile: 'stable',
    credentialProvider: null,
    requiredCapabilities: ['desktop_device', 'desktop_chrome', 'web_speech', 'translator_api', 'speech_synthesis'],
    requirements: ['Desktop Chrome', 'Web Speech API', 'Chrome Translator API and language pack', 'Device TTS voice'],
    steps: desktopTextSteps('Chrome on-device Translator', 'stable', 'device'),
  },
  {
    id: 'desktop-webspeech-gemini-stable',
    label: 'Desktop Web Speech + Gemini Flash-Lite — stable',
    shortLabel: 'Desktop · Gemini',
    description: 'Stable Web Speech input, Gemini text translation, and device TTS.',
    group: 'desktop',
    kind: 'text-pipeline',
    inputMethod: 'desktop_web_speech',
    translationMethod: 'gemini_flash_lite',
    outputMethod: 'device_tts',
    endpointProfile: 'stable',
    credentialProvider: 'gemini',
    requiredCapabilities: ['secure_context', 'desktop_device', 'web_speech', 'speech_synthesis'],
    requirements: ['Desktop browser with Web Speech', 'Gemini API key', 'Network connection', 'Device TTS voice'],
    steps: desktopTextSteps('Gemini 3.5 Flash-Lite', 'stable', 'network'),
  },
  {
    id: 'desktop-webspeech-azure-stable',
    label: 'Desktop Web Speech + Azure Translator — stable',
    shortLabel: 'Desktop · Azure',
    description: 'Stable Web Speech input, Azure text translation, and device TTS.',
    group: 'desktop',
    kind: 'text-pipeline',
    inputMethod: 'desktop_web_speech',
    translationMethod: 'azure_translator',
    outputMethod: 'device_tts',
    endpointProfile: 'stable',
    credentialProvider: 'azure',
    requiredCapabilities: ['secure_context', 'desktop_device', 'web_speech', 'speech_synthesis'],
    requirements: ['Desktop browser with Web Speech', 'Azure Translator key and region when required', 'Network connection', 'Device TTS voice'],
    steps: desktopTextSteps('Azure AI Translator', 'stable', 'network'),
  },
  {
    id: 'mobile-dictation-gemini',
    label: 'Mobile keyboard dictation + Gemini Flash-Lite',
    shortLabel: 'Mobile · Gemini',
    description: 'Editable keyboard dictation, Gemini text translation, and device TTS.',
    group: 'mobile',
    kind: 'text-pipeline',
    inputMethod: 'mobile_keyboard',
    translationMethod: 'gemini_flash_lite',
    outputMethod: 'device_tts',
    endpointProfile: null,
    credentialProvider: 'gemini',
    requiredCapabilities: ['mobile_device', 'editable_text', 'speech_synthesis'],
    requirements: ['Phone or tablet keyboard', 'User starts dictation from the keyboard', 'Gemini API key', 'Network connection', 'Device TTS voice'],
    steps: mobileDictationSteps('Gemini 3.5 Flash-Lite'),
  },
  {
    id: 'mobile-dictation-azure',
    label: 'Mobile keyboard dictation + Azure Translator',
    shortLabel: 'Mobile · Azure',
    description: 'Editable keyboard dictation, Azure text translation, and device TTS.',
    group: 'mobile',
    kind: 'text-pipeline',
    inputMethod: 'mobile_keyboard',
    translationMethod: 'azure_translator',
    outputMethod: 'device_tts',
    endpointProfile: null,
    credentialProvider: 'azure',
    requiredCapabilities: ['mobile_device', 'editable_text', 'speech_synthesis'],
    requirements: ['Phone or tablet keyboard', 'User starts dictation from the keyboard', 'Azure Translator key and region when required', 'Network connection', 'Device TTS voice'],
    steps: mobileDictationSteps('Azure AI Translator'),
  },
] as const;

const PROFILE_BY_ID = new Map<WorkflowProfileId, WorkflowProfile>(
  WORKFLOW_PROFILES.map((profile) => [profile.id, profile])
);

const CAPABILITY_LABELS: Record<WorkflowCapability, string> = {
  secure_context: 'a secure HTTPS connection',
  microphone_capture: 'browser microphone capture',
  websocket: 'WebSocket support',
  webrtc: 'WebRTC support',
  audio_context: 'Web Audio support',
  desktop_device: 'a desktop or laptop',
  desktop_chrome: 'desktop Chrome',
  mobile_device: 'a phone or tablet',
  web_speech: 'the Web Speech API',
  translator_api: 'the Chrome Translator API',
  speech_synthesis: 'device text-to-speech',
  editable_text: 'editable text input',
};

const hasCapability = (
  capabilities: PlatformCapabilities,
  requirement: WorkflowCapability
): boolean => {
  switch (requirement) {
    case 'secure_context': return capabilities.isSecureContext;
    case 'microphone_capture': return capabilities.supportsMicrophoneCapture;
    case 'websocket': return capabilities.supportsWebSocket;
    case 'webrtc': return capabilities.supportsWebRtc;
    case 'audio_context': return capabilities.supportsAudioContext;
    case 'desktop_device': return capabilities.isDesktop;
    case 'desktop_chrome': return capabilities.isDesktopChrome;
    case 'mobile_device': return capabilities.isMobile;
    case 'web_speech': return capabilities.supportsWebSpeechRecognition;
    case 'translator_api': return capabilities.supportsTranslatorApi;
    case 'speech_synthesis': return capabilities.supportsSpeechSynthesis;
    case 'editable_text': return capabilities.supportsEditableText;
  }
};

const providerName = (provider: Exclude<WorkflowCredentialProvider, null>): string => {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'azure') return 'Azure Translator';
  return 'Gemini';
};

export const getWorkflowProfile = (id: WorkflowProfileId): WorkflowProfile =>
  PROFILE_BY_ID.get(id) ?? PROFILE_BY_ID.get('auto') as WorkflowProfile;

const getDirectWorkflowAvailability = (
  profile: WorkflowProfile,
  context: WorkflowAvailabilityContext
): WorkflowAvailability => {
  const missingCapabilities = profile.requiredCapabilities.filter(
    (requirement) => !hasCapability(context.capabilities, requirement)
  );
  const missingCredential = profile.credentialProvider && !context.credentials[profile.credentialProvider]
    ? profile.credentialProvider
    : undefined;
  const reasons: string[] = [];
  if (missingCapabilities.length > 0) {
    reasons.push(`Requires ${missingCapabilities.map((item) => CAPABILITY_LABELS[item]).join(', ')}.`);
  }
  if (missingCredential) {
    reasons.push(`Save a ${providerName(missingCredential)} API key in Settings.`);
  }

  return {
    available: reasons.length === 0,
    disabledReason: reasons.length > 0 ? reasons.join(' ') : undefined,
    missingCapabilities,
    missingCredential,
  };
};

const orderedPair = <Value extends string>(preferred: Value, alternative: Value): readonly Value[] =>
  preferred === alternative ? [preferred] : [preferred, alternative];

const getTextPipelineCandidates = (
  context: WorkflowAvailabilityContext,
  options: WorkflowResolutionOptions
): WorkflowProfileId[] => {
  const { capabilities } = context;
  const preferredCloud = options.preferredCloudProvider ?? 'azure';
  const cloudOrder = orderedPair(preferredCloud, preferredCloud === 'azure' ? 'gemini' : 'azure');

  if (capabilities.isMobile) {
    if (!options.allowCloudFallback) return [];
    return cloudOrder.map((provider) => (
      provider === 'azure' ? 'mobile-dictation-azure' : 'mobile-dictation-gemini'
    ));
  }

  const endpoint = options.desktopEndpoint ?? 'stable';
  const localProfile: WorkflowProfileId = endpoint === 'fast'
    ? 'desktop-chrome-on-device-fast'
    : 'desktop-chrome-on-device-stable';
  if (!options.allowCloudFallback) return [localProfile];
  return [localProfile, ...cloudOrder.map((provider): WorkflowProfileId => (
    provider === 'azure'
      ? 'desktop-webspeech-azure-stable'
      : 'desktop-webspeech-gemini-stable'
  ))];
};

const getRealtimeCandidates = (
  options: WorkflowResolutionOptions
): WorkflowProfileId[] => {
  const preferred = options.preferredRealtimeProvider ?? 'gemini';
  return orderedPair(preferred, preferred === 'gemini' ? 'openai' : 'gemini').map(
    (provider): WorkflowProfileId => provider === 'gemini'
      ? 'gemini-3.5-live-translate-preview'
      : 'gpt-realtime-translate'
  );
};

/** Resolve Automatic without performing browser or network side effects. */
export const resolveAutomaticWorkflow = (
  context: WorkflowAvailabilityContext,
  options: WorkflowResolutionOptions = {}
): WorkflowResolution => {
  const mode = options.mode ?? 'text-first';
  const textCandidates = getTextPipelineCandidates(context, options);
  const realtimeCandidates = getRealtimeCandidates(options);
  const candidates = mode === 'audio-first'
    ? [...realtimeCandidates, ...textCandidates]
    : mode === 'any'
      ? [...textCandidates, ...realtimeCandidates]
      : textCandidates;

  for (const id of candidates) {
    const profile = getWorkflowProfile(id);
    if (getDirectWorkflowAvailability(profile, context).available) {
      return { profile };
    }
  }

  const reason = !options.allowCloudFallback && mode !== 'audio-first'
    ? 'Automatic cloud fallback is off. Choose a cloud workflow explicitly or enable cloud fallback.'
    : context.capabilities.isMobile && mode !== 'audio-first'
      ? 'Mobile keyboard dictation only creates text. Save a Gemini or Azure Translator API key to translate it.'
      : 'No complete workflow matches this device and the currently saved credentials.';
  return { profile: null, reason };
};

export const getWorkflowAvailability = (
  id: WorkflowProfileId,
  context: WorkflowAvailabilityContext,
  resolutionOptions: WorkflowResolutionOptions = {}
): WorkflowAvailability => {
  const profile = getWorkflowProfile(id);
  if (id !== 'auto') return getDirectWorkflowAvailability(profile, context);

  const resolution = resolveAutomaticWorkflow(context, resolutionOptions);
  return {
    available: Boolean(resolution.profile),
    disabledReason: resolution.profile ? undefined : resolution.reason,
    missingCapabilities: [],
  };
};

export const getWorkflowAvailabilities = (
  context: WorkflowAvailabilityContext,
  resolutionOptions: WorkflowResolutionOptions = {}
): Record<WorkflowProfileId, WorkflowAvailability> => Object.fromEntries(
  WORKFLOW_PROFILES.map((profile) => [
    profile.id,
    getWorkflowAvailability(profile.id, context, resolutionOptions),
  ])
) as Record<WorkflowProfileId, WorkflowAvailability>;
