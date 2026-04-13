// ─────────────────────────────────────────────────
// i18n Barrel — import this to load all translations
// ─────────────────────────────────────────────────

// Core
export { useAppI18n, AppI18nProvider } from './useAppI18n';
export type { AppLocale } from './locales';
export { ALL_LOCALES, LOCALE_LABELS, LANG_TO_LOCALE, LOCALE_TO_LANG } from './locales';

// Namespaces (side-effect imports register translations)
import './dashboardI18n';
