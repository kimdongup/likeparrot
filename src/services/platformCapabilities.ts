export type BrowserFamily = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

export type DeviceClass = 'mobile' | 'desktop';

/**
 * Serializable inputs make platform detection deterministic in unit tests.
 * The browser adapter below is the only function in this module that reads
 * globals.
 */
export interface PlatformDetectionInput {
  userAgent: string;
  userAgentDataMobile?: boolean;
  userAgentBrands?: readonly string[];
  maxTouchPoints: number;
  hasCoarsePointer: boolean;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasWebSocket: boolean;
  hasWebRtc: boolean;
  hasAudioContext: boolean;
  hasWebSpeechRecognition: boolean;
  hasTranslatorApi: boolean;
  hasSpeechSynthesis: boolean;
  hasEditableText: boolean;
  hasVirtualKeyboardApi: boolean;
  hasWebAssemblyWorkers: boolean;
}

export interface PlatformCapabilities {
  deviceClass: DeviceClass;
  browser: BrowserFamily;
  isMobile: boolean;
  isDesktop: boolean;
  isDesktopChrome: boolean;
  hasCoarsePointer: boolean;
  isSecureContext: boolean;
  supportsMicrophoneCapture: boolean;
  supportsWebSocket: boolean;
  supportsWebRtc: boolean;
  supportsAudioContext: boolean;
  supportsWebSpeechRecognition: boolean;
  supportsTranslatorApi: boolean;
  supportsSpeechSynthesis: boolean;
  supportsEditableText: boolean;
  supportsVirtualKeyboardApi: boolean;
  supportsWebAssembly: boolean;
}

const detectBrowserFamily = (
  userAgent: string,
  brands: readonly string[] = []
): BrowserFamily => {
  const brandText = brands.join(' ').toLowerCase();
  if (/firefox|fxios/iu.test(userAgent)) return 'firefox';
  if (/microsoft edge/iu.test(brandText) || /edg(?:e|a|ios)?\//iu.test(userAgent)) {
    return 'edge';
  }
  if (
    /google chrome|chromium/iu.test(brandText) ||
    (/(?:chrome|chromium|crios)\//iu.test(userAgent) && !/(?:opr|opera)\//iu.test(userAgent))
  ) {
    return 'chrome';
  }
  if (/safari\//iu.test(userAgent) && !/(?:chrome|chromium|crios|android)\//iu.test(userAgent)) {
    return 'safari';
  }
  return 'other';
};

/** Convert captured platform signals into workflow-relevant capabilities. */
export const derivePlatformCapabilities = (
  input: PlatformDetectionInput
): PlatformCapabilities => {
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/iu.test(input.userAgent);
  // iPadOS can request a desktop user agent and identify itself as Macintosh.
  const desktopClassIpad = /Macintosh/iu.test(input.userAgent) && input.maxTouchPoints > 1;
  const isMobile = input.userAgentDataMobile === true || mobileUserAgent || desktopClassIpad;
  const browser = detectBrowserFamily(input.userAgent, input.userAgentBrands);

  return {
    deviceClass: isMobile ? 'mobile' : 'desktop',
    browser,
    isMobile,
    isDesktop: !isMobile,
    isDesktopChrome: !isMobile && browser === 'chrome',
    hasCoarsePointer: input.hasCoarsePointer,
    isSecureContext: input.isSecureContext,
    supportsMicrophoneCapture: input.hasMediaDevices,
    supportsWebSocket: input.hasWebSocket,
    supportsWebRtc: input.hasWebRtc,
    supportsAudioContext: input.hasAudioContext,
    supportsWebSpeechRecognition: input.hasWebSpeechRecognition,
    supportsTranslatorApi: input.hasTranslatorApi,
    supportsSpeechSynthesis: input.hasSpeechSynthesis,
    supportsEditableText: input.hasEditableText,
    supportsVirtualKeyboardApi: input.hasVirtualKeyboardApi,
    supportsWebAssembly: input.hasWebAssemblyWorkers,
  };
};

/** Read browser globals once, then hand the resulting value to pure routers. */
export const detectPlatformCapabilities = (): PlatformCapabilities => {
  const browserNavigator = typeof navigator === 'undefined' ? null : navigator;
  const browserWindow = typeof window === 'undefined' ? null : window;
  const browserDocument = typeof document === 'undefined' ? null : document;
  const extendedNavigator = browserNavigator as (Navigator & {
    userAgentData?: {
      mobile?: boolean;
      brands?: readonly { brand: string }[];
    };
    virtualKeyboard?: unknown;
  }) | null;
  const extendedWindow = browserWindow as (Window & typeof globalThis & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
    webkitAudioContext?: unknown;
    Translator?: {
      availability?: unknown;
      create?: unknown;
    };
  }) | null;
  let hasCoarsePointer = false;
  try {
    hasCoarsePointer = browserWindow?.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    // Some embedded browsers expose matchMedia but reject specific queries.
  }

  const translator = extendedWindow?.Translator;
  const hostname = browserWindow?.location?.hostname ?? '';
  const localSecureException = hostname === 'localhost' || hostname === '127.0.0.1';

  return derivePlatformCapabilities({
    userAgent: browserNavigator?.userAgent ?? '',
    userAgentDataMobile: extendedNavigator?.userAgentData?.mobile,
    userAgentBrands: extendedNavigator?.userAgentData?.brands?.map(({ brand }) => brand),
    maxTouchPoints: browserNavigator?.maxTouchPoints ?? 0,
    hasCoarsePointer,
    isSecureContext: browserWindow?.isSecureContext ?? localSecureException,
    hasMediaDevices: typeof browserNavigator?.mediaDevices?.getUserMedia === 'function',
    hasWebSocket: typeof extendedWindow?.WebSocket === 'function',
    hasWebRtc: typeof extendedWindow?.RTCPeerConnection === 'function',
    hasAudioContext:
      typeof extendedWindow?.AudioContext === 'function' ||
      typeof extendedWindow?.webkitAudioContext === 'function',
    hasWebSpeechRecognition:
      typeof extendedWindow?.SpeechRecognition === 'function' ||
      typeof extendedWindow?.webkitSpeechRecognition === 'function',
    hasTranslatorApi:
      typeof translator?.availability === 'function' && typeof translator.create === 'function',
    hasSpeechSynthesis: Boolean(extendedWindow && 'speechSynthesis' in extendedWindow),
    hasEditableText: typeof browserDocument?.createElement === 'function',
    hasVirtualKeyboardApi: Boolean(extendedNavigator?.virtualKeyboard),
    hasWebAssemblyWorkers: typeof extendedWindow?.Worker === 'function'
      && typeof extendedWindow?.WebAssembly === 'object'
      && typeof extendedWindow?.DecompressionStream === 'function',
  });
};
