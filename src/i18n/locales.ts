// ─────────────────────────────────────────────────
// App Language Types — Global i18n type system
// ─────────────────────────────────────────────────

/** ISO-like language codes used throughout the app */
export type AppLocale = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'th';

/** Map from userPrefs' SupportedLanguage (human-readable) to locale code */
export const LANG_TO_LOCALE: Record<string, AppLocale> = {
    'English': 'en',
    'Korean': 'ko',
    'Japanese': 'ja',
    'Chinese (Simplified)': 'zh',
    'Chinese (Traditional)': 'zh',
    'French': 'fr',
    'Spanish': 'es',
    'German': 'de',
    'Portuguese': 'pt',
    'Italian': 'it',
    'Thai': 'th',
};

/** Reverse map: locale code → human-readable language name */
export const LOCALE_TO_LANG: Record<AppLocale, string> = {
    en: 'English',
    ko: 'Korean',
    ja: 'Japanese',
    zh: 'Chinese (Simplified)',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    th: 'Thai',
};

/** All supported locale codes */
export const ALL_LOCALES: AppLocale[] = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'it', 'th'];

/** Human-readable labels for language selector UI */
export const LOCALE_LABELS: Record<AppLocale, string> = {
    en: 'English',
    ko: '한국어',
    ja: '日本語',
    zh: '中文',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    it: 'Italiano',
    th: 'ไทย',
};
