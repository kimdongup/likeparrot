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

export const API_KEY_STORAGE_KEY = 'likeparrot_api_key';
export const THEME_STORAGE_KEY = 'likeparrot_theme';

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
 * Reads a tab-scoped Gemini key and, when the user opted in, its persistent
 * local copy. A persistent key is mirrored into the current tab for use.
 */
export const readStoredApiKey = (): ApiKeyReadResult => {
  let sessionKey = '';
  let legacyKey = '';
  let sessionFailed = false;
  let legacyCleanupFailed = false;
  let legacyReadFailed = false;
  let migratedLegacyKey = false;

  try {
    sessionKey = (window.sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? '').trim();
  } catch {
    sessionFailed = true;
  }

  try {
    legacyKey = (window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? '').trim();
  } catch {
    legacyReadFailed = true;
    legacyCleanupFailed = true;
  }

  if (!sessionKey && legacyKey) {
    try {
      window.sessionStorage.setItem(API_KEY_STORAGE_KEY, legacyKey);
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

/** Stores a Gemini key for this tab and optionally on this device. */
export const saveStoredApiKey = (
  apiKey: string,
  persistent = false
): PreferenceStorageStatus => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return deleteStoredApiKey();

  let sessionFailed = false;
  let legacyCleanupFailed = false;

  try {
    window.sessionStorage.setItem(API_KEY_STORAGE_KEY, cleanKey);
  } catch {
    sessionFailed = true;
  }

  if (!sessionFailed) {
    try {
      if (persistent) window.localStorage.setItem(API_KEY_STORAGE_KEY, cleanKey);
      else window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      legacyCleanupFailed = true;
    }
  }

  return getStorageStatus(sessionFailed, legacyCleanupFailed);
};

/** Removes both the current tab key and any persistent legacy copy. */
export const deleteStoredApiKey = (): PreferenceStorageStatus => {
  let sessionFailed = false;
  let legacyCleanupFailed = false;

  try {
    window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    sessionFailed = true;
  }

  try {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    legacyCleanupFailed = true;
  }

  return getStorageStatus(sessionFailed, legacyCleanupFailed);
};

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
