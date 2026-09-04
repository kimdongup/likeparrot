export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export type PreferenceStorageStatus =
  | 'success'
  | 'session-failed'
  | 'legacy-cleanup-failed'
  | 'session-and-legacy-failed';

export interface ApiKeyReadResult {
  apiKey: string;
  status: PreferenceStorageStatus;
  migratedLegacyKey: boolean;
  persistent: boolean;
}

export type ApiKeyProvider = 'gemini' | 'openai' | 'azure' | 'azureSpeech';
export type CloudTranslationProvider = Extract<ApiKeyProvider, 'gemini' | 'azure'>;

export interface AutomaticRoutingPreference {
  allowCloudFallback: boolean;
  preferredCloudProvider: CloudTranslationProvider;
}

/** Keep the original Gemini key name so existing installs migrate without work. */
export const GEMINI_API_KEY_STORAGE_KEY = 'likeparrot_api_key';
export const OPENAI_API_KEY_STORAGE_KEY = 'likeparrot_openai_api_key';
export const AZURE_API_KEY_STORAGE_KEY = 'likeparrot_azure_api_key';
export const AZURE_REGION_STORAGE_KEY = 'likeparrot_azure_region';
export const AZURE_SPEECH_API_KEY_STORAGE_KEY = 'likeparrot_azure_speech_api_key';
export const AZURE_SPEECH_REGION_STORAGE_KEY = 'likeparrot_azure_speech_region';
export const AZURE_SPEECH_RESOURCE_STORAGE_KEY = 'likeparrot_azure_speech_resource';
export const API_KEY_STORAGE_KEY = GEMINI_API_KEY_STORAGE_KEY;
export const THEME_STORAGE_KEY = 'likeparrot_theme';
export const WORKFLOW_PROFILE_STORAGE_KEY = 'likeparrot_workflow_profile';
export const AUTO_CLOUD_FALLBACK_STORAGE_KEY = 'likeparrot_auto_cloud_fallback';
export const PREFERRED_CLOUD_PROVIDER_STORAGE_KEY = 'likeparrot_preferred_cloud_provider';

const getApiKeyStorageKey = (provider: ApiKeyProvider): string => {
  if (provider === 'openai') return OPENAI_API_KEY_STORAGE_KEY;
  if (provider === 'azure') return AZURE_API_KEY_STORAGE_KEY;
  if (provider === 'azureSpeech') return AZURE_SPEECH_API_KEY_STORAGE_KEY;
  return GEMINI_API_KEY_STORAGE_KEY;
};

const readStoredValue = (storageKey: string): ApiKeyReadResult => {
  let sessionKey = '';
  let legacyKey = '';
  let sessionFailed = false;
  let legacyCleanupFailed = false;
  let legacyReadFailed = false;
  let migratedLegacyKey = false;

  try {
    sessionKey = (window.sessionStorage.getItem(storageKey) ?? '').trim();
  } catch {
    sessionFailed = true;
  }

  try {
    legacyKey = (window.localStorage.getItem(storageKey) ?? '').trim();
  } catch {
    legacyReadFailed = true;
    legacyCleanupFailed = true;
  }

  if (!sessionKey && legacyKey) {
    try {
      window.sessionStorage.setItem(storageKey, legacyKey);
      sessionKey = legacyKey;
      migratedLegacyKey = true;
    } catch {
      sessionFailed = true;
    }
  }

  return {
    apiKey: sessionKey || legacyKey,
    status: getStorageStatus(sessionFailed, legacyCleanupFailed),
    migratedLegacyKey,
    persistent: !legacyReadFailed && Boolean(legacyKey),
  };
};

const getStorageStatus = (
  sessionFailed: boolean,
  legacyCleanupFailed: boolean
): PreferenceStorageStatus => {
  if (sessionFailed && legacyCleanupFailed) return 'session-and-legacy-failed';
  if (sessionFailed) return 'session-failed';
  if (legacyCleanupFailed) return 'legacy-cleanup-failed';
  return 'success';
};

/**
 * Reads a tab-scoped provider key and, when the user opted in, its persistent
 * local copy. A persistent key is mirrored into the current tab for use.
 */
export const readStoredProviderApiKey = (provider: ApiKeyProvider): ApiKeyReadResult => {
  const storageKey = getApiKeyStorageKey(provider);
  return readStoredValue(storageKey);
};

export const readStoredAzureRegion = (): ApiKeyReadResult =>
  readStoredValue(AZURE_REGION_STORAGE_KEY);

/** Stores a provider key for this tab and optionally on this device. */
export const saveStoredProviderApiKey = (
  provider: ApiKeyProvider,
  apiKey: string,
  persistent = false
): PreferenceStorageStatus => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return deleteStoredProviderApiKey(provider);
  const storageKey = getApiKeyStorageKey(provider);

  let sessionFailed = false;
  let legacyCleanupFailed = false;

  try {
    window.sessionStorage.setItem(storageKey, cleanKey);
  } catch {
    sessionFailed = true;
  }

  if (!sessionFailed) {
    try {
      if (persistent) window.localStorage.setItem(storageKey, cleanKey);
      else window.localStorage.removeItem(storageKey);
    } catch {
      legacyCleanupFailed = true;
    }
  }

  return getStorageStatus(sessionFailed, legacyCleanupFailed);
};

export const saveStoredAzureRegion = (
  region: string,
  persistent = false
): PreferenceStorageStatus => {
  const cleanRegion = region.trim().toLowerCase();
  if (!cleanRegion) return deleteStoredValue(AZURE_REGION_STORAGE_KEY);
  return saveStoredValue(AZURE_REGION_STORAGE_KEY, cleanRegion, persistent);
};

/** Removes both the current tab key and any persistent legacy copy. */
export const deleteStoredProviderApiKey = (
  provider: ApiKeyProvider
): PreferenceStorageStatus => {
  const storageKey = getApiKeyStorageKey(provider);
  return deleteStoredValue(storageKey);
};

const saveStoredValue = (
  storageKey: string,
  value: string,
  persistent: boolean
): PreferenceStorageStatus => {
  let sessionFailed = false;
  let legacyCleanupFailed = false;
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    sessionFailed = true;
  }
  if (!sessionFailed) {
    try {
      if (persistent) window.localStorage.setItem(storageKey, value);
      else window.localStorage.removeItem(storageKey);
    } catch {
      legacyCleanupFailed = true;
    }
  }
  return getStorageStatus(sessionFailed, legacyCleanupFailed);
};

const deleteStoredValue = (storageKey: string): PreferenceStorageStatus => {
  let sessionFailed = false;
  let legacyCleanupFailed = false;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    sessionFailed = true;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    legacyCleanupFailed = true;
  }

  return getStorageStatus(sessionFailed, legacyCleanupFailed);
};

export const deleteStoredAzureRegion = (): PreferenceStorageStatus =>
  deleteStoredValue(AZURE_REGION_STORAGE_KEY);

export const readStoredAzureSpeechRegion = (): ApiKeyReadResult =>
  readStoredValue(AZURE_SPEECH_REGION_STORAGE_KEY);

export const saveStoredAzureSpeechRegion = (
  region: string,
  persistent = false
): PreferenceStorageStatus => {
  const cleanRegion = region.trim().toLowerCase();
  if (!cleanRegion) return deleteStoredValue(AZURE_SPEECH_REGION_STORAGE_KEY);
  return saveStoredValue(AZURE_SPEECH_REGION_STORAGE_KEY, cleanRegion, persistent);
};

export const deleteStoredAzureSpeechRegion = (): PreferenceStorageStatus =>
  deleteStoredValue(AZURE_SPEECH_REGION_STORAGE_KEY);

export const readStoredAzureSpeechResource = (): ApiKeyReadResult =>
  readStoredValue(AZURE_SPEECH_RESOURCE_STORAGE_KEY);

export const saveStoredAzureSpeechResource = (
  resourceName: string,
  persistent = false
): PreferenceStorageStatus => {
  const cleanName = resourceName.trim();
  if (!cleanName) return deleteStoredValue(AZURE_SPEECH_RESOURCE_STORAGE_KEY);
  return saveStoredValue(AZURE_SPEECH_RESOURCE_STORAGE_KEY, cleanName, persistent);
};

export const deleteStoredAzureSpeechResource = (): PreferenceStorageStatus =>
  deleteStoredValue(AZURE_SPEECH_RESOURCE_STORAGE_KEY);

/** Backwards-compatible Gemini helpers used by the Text First pipeline. */
export const readStoredApiKey = (): ApiKeyReadResult => readStoredProviderApiKey('gemini');

export const saveStoredApiKey = (
  apiKey: string,
  persistent = false
): PreferenceStorageStatus => saveStoredProviderApiKey('gemini', apiKey, persistent);

export const deleteStoredApiKey = (): PreferenceStorageStatus =>
  deleteStoredProviderApiKey('gemini');

export const readStoredTheme = (): ThemePreference => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      return storedTheme;
    }
  } catch {
    // A system theme is a safe, non-persistent fallback in restricted contexts.
  }
  return 'system';
};

export const saveStoredTheme = (theme: ThemePreference): boolean => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
};

/**
 * Automatic routing never sends a transcript to a paid/network service unless
 * the user has explicitly enabled that behavior. Explicit workflow profiles
 * are independent of this preference.
 */
export const readAutomaticRoutingPreference = (): AutomaticRoutingPreference => {
  try {
    return {
      allowCloudFallback: window.localStorage.getItem(AUTO_CLOUD_FALLBACK_STORAGE_KEY) === 'true',
      preferredCloudProvider:
        window.localStorage.getItem(PREFERRED_CLOUD_PROVIDER_STORAGE_KEY) === 'azure'
          ? 'azure'
          : 'gemini',
    };
  } catch {
    return { allowCloudFallback: false, preferredCloudProvider: 'gemini' };
  }
};

export const saveAutomaticRoutingPreference = (
  preference: AutomaticRoutingPreference
): boolean => {
  try {
    window.localStorage.setItem(
      AUTO_CLOUD_FALLBACK_STORAGE_KEY,
      String(preference.allowCloudFallback)
    );
    window.localStorage.setItem(
      PREFERRED_CLOUD_PROVIDER_STORAGE_KEY,
      preference.preferredCloudProvider
    );
    return true;
  } catch {
    return false;
  }
};

export const readStoredWorkflowProfileId = (): string => {
  try {
    return window.localStorage.getItem(WORKFLOW_PROFILE_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
};

export const saveStoredWorkflowProfileId = (profileId: string): boolean => {
  try {
    window.localStorage.setItem(WORKFLOW_PROFILE_STORAGE_KEY, profileId);
    return true;
  } catch {
    return false;
  }
};

export const resolveTheme = (theme: ThemePreference): ResolvedTheme => {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const updateDocumentTheme = (preference: ThemePreference): ResolvedTheme => {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolvedTheme;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
  return resolvedTheme;
};

/**
 * Applies a preference and follows OS changes while `system` is selected.
 * Use the returned cleanup function from a React effect.
 */
export const applyThemePreference = (
  preference: ThemePreference,
  onResolvedThemeChange?: (theme: ResolvedTheme) => void
): (() => void) => {
  const initialTheme = updateDocumentTheme(preference);
  onResolvedThemeChange?.(initialTheme);
  if (preference !== 'system') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const resolvedTheme = updateDocumentTheme('system');
    onResolvedThemeChange?.(resolvedTheme);
  };
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
};
