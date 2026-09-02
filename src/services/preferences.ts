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

export type ApiKeyProvider = 'gemini' | 'openai';

/** Keep the original Gemini key name so existing installs migrate without work. */
export const GEMINI_API_KEY_STORAGE_KEY = 'likeparrot_api_key';
export const OPENAI_API_KEY_STORAGE_KEY = 'likeparrot_openai_api_key';
export const API_KEY_STORAGE_KEY = GEMINI_API_KEY_STORAGE_KEY;
export const THEME_STORAGE_KEY = 'likeparrot_theme';

const getApiKeyStorageKey = (provider: ApiKeyProvider): string =>
  provider === 'openai' ? OPENAI_API_KEY_STORAGE_KEY : GEMINI_API_KEY_STORAGE_KEY;

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

/** Removes both the current tab key and any persistent legacy copy. */
export const deleteStoredProviderApiKey = (
  provider: ApiKeyProvider
): PreferenceStorageStatus => {
  const storageKey = getApiKeyStorageKey(provider);
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
