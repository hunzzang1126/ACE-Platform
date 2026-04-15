// ─────────────────────────────────────────────────
// i18n Barrel — import this to load all translations
// ─────────────────────────────────────────────────

// Core
export { useAppI18n, AppI18nProvider } from './useAppI18n';
export type { AppLocale } from './locales';
export { ALL_LOCALES, LOCALE_LABELS, LANG_TO_LOCALE, LOCALE_TO_LANG } from './locales';

// Namespaces (side-effect imports register translations)
import './dashboardI18n';
import './navI18n';
import './settingsI18n';
import './sizeI18n';
import './aiI18n';
import './editorI18n';
import './templatesI18n';
import './activityI18n';
import './aiSuggestionsI18n';
import './upgradeI18n';
import './onboardingI18n';
import './shareI18n';
import './referralI18n';
import './guideI18n';
