// ─────────────────────────────────────────────────
// useAppI18n — Global i18n hook for the entire app
// ─────────────────────────────────────────────────
// Usage: const { t, locale, setLocale } = useAppI18n();
//        <button>{t('dashboard.createProject')}</button>
// ─────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppLocale } from './locales';
import { LANG_TO_LOCALE } from './locales';

// ── Translation registry (lazy-loaded per namespace) ──

type TranslationMap = Record<string, string>;
type LocaleTranslations = Record<AppLocale, TranslationMap>;

const registry = new Map<string, LocaleTranslations>();

/**
 * Register a namespace's translations.
 * Call this at module scope in each translation file.
 *
 * @example
 * registerTranslations('dashboard', {
 *   en: { createProject: 'New Project', ... },
 *   ko: { createProject: '새 프로젝트', ... },
 * });
 */
export function registerTranslations(namespace: string, translations: Partial<LocaleTranslations>): void {
    const existing = registry.get(namespace) ?? {} as LocaleTranslations;
    for (const [locale, msgs] of Object.entries(translations)) {
        existing[locale as AppLocale] = {
            ...(existing[locale as AppLocale] ?? {}),
            ...msgs,
        };
    }
    registry.set(namespace, existing);
}

/**
 * Resolve a translation key.
 * Format: 'namespace.key' (e.g., 'dashboard.createProject')
 * Falls back: locale → 'en' → raw key
 */
function resolve(key: string, locale: AppLocale): string {
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) return key;

    const ns = key.slice(0, dotIdx);
    const subKey = key.slice(dotIdx + 1);
    const nsMap = registry.get(ns);
    if (!nsMap) return key;

    return nsMap[locale]?.[subKey] ?? nsMap.en?.[subKey] ?? key;
}

// ── Context ──

interface AppI18nCtx {
    /** Current locale code */
    locale: AppLocale;
    /** Change locale (persists to userPrefs) */
    setLocale: (locale: AppLocale) => void;
    /** Translate a key: t('dashboard.createProject') */
    t: (key: string) => string;
}

const I18nContext = createContext<AppI18nCtx>({
    locale: 'en',
    setLocale: () => {},
    t: (k) => k,
});

/** Use the global i18n system */
export function useAppI18n(): AppI18nCtx {
    return useContext(I18nContext);
}

// ── Storage key for locale ──
const LOCALE_STORAGE_KEY = 'glid-app-locale';

/**
 * Detect initial locale from:
 * 1. localStorage (explicit user choice)
 * 2. userPrefs.preferredLanguage (from onboarding)
 * 3. Browser language
 * 4. Default: 'en'
 */
function detectInitialLocale(): AppLocale {
    // 1. Explicit locale storage
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isValidLocale(stored)) return stored as AppLocale;
    } catch { /* SSR safe */ }

    // 2. userPrefs.preferredLanguage
    try {
        // Try to read from any glid-prefs-* key
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('glid-prefs-')) {
                const data = JSON.parse(localStorage.getItem(key) ?? '{}');
                if (data.preferredLanguage) {
                    const mapped = LANG_TO_LOCALE[data.preferredLanguage];
                    if (mapped) return mapped;
                }
            }
        }
    } catch { /* */ }

    // 3. Browser language
    try {
        const browserLang = navigator.language.split('-')[0] ?? '';
        if (isValidLocale(browserLang)) return browserLang as AppLocale;
    } catch { /* SSR safe */ }

    return 'en';
}

const VALID_LOCALES = new Set(['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'it', 'th']);
function isValidLocale(s: string): boolean {
    return VALID_LOCALES.has(s);
}

// ── Provider ──

export function AppI18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<AppLocale>(detectInitialLocale);

    const setLocale = useCallback((l: AppLocale) => {
        setLocaleState(l);
        try { localStorage.setItem(LOCALE_STORAGE_KEY, l); } catch { /* */ }
    }, []);

    // Sync with userPrefs changes (e.g., onboarding sets language)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key?.startsWith('glid-prefs-') && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.preferredLanguage) {
                        const mapped = LANG_TO_LOCALE[data.preferredLanguage];
                        if (mapped && mapped !== locale) setLocale(mapped);
                    }
                } catch { /* */ }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [locale, setLocale]);

    const t = useCallback((key: string): string => {
        return resolve(key, locale);
    }, [locale]);

    const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
