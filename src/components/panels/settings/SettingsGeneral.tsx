// ─────────────────────────────────────────────────
// SettingsGeneral — Platform Language + Content Language + Design preferences
// ─────────────────────────────────────────────────

import { SUPPORTED_LANGUAGES, type SupportedLanguage, type UserPrefs } from '@/stores/userPrefs';
import { selectStyle, labelStyle, descStyle, Section } from './settingsShared';
import { useAppI18n } from '@/i18n';
import { ALL_LOCALES, LOCALE_LABELS, LOCALE_TO_LANG } from '@/i18n/locales';
import type { AppLocale } from '@/i18n/locales';

interface Props {
    prefs: UserPrefs;
    onUpdate: (patch: Partial<UserPrefs>) => void;
}

export function SettingsGeneral({ prefs, onUpdate }: Props) {
    const { t, locale, setLocale } = useAppI18n();

    const handlePlatformLangChange = (newLocale: AppLocale) => {
        setLocale(newLocale);
        // Also sync userPrefs.preferredLanguage so AI agent uses the same language
        const langName = LOCALE_TO_LANG[newLocale];
        if (langName && SUPPORTED_LANGUAGES.includes(langName as SupportedLanguage)) {
            onUpdate({ preferredLanguage: langName as SupportedLanguage });
        }
    };

    return (
        <>
            <Section title={t('settings.platformLanguage')}>
                <p style={descStyle}>
                    {t('settings.platformLanguageDesc')}
                </p>
                <select
                    value={locale}
                    onChange={e => handlePlatformLangChange(e.target.value as AppLocale)}
                    style={selectStyle}
                >
                    {ALL_LOCALES.map(loc => (
                        <option key={loc} value={loc}>{LOCALE_LABELS[loc]}</option>
                    ))}
                </select>
            </Section>

            <Section title={t('settings.contentLanguage')}>
                <p style={descStyle}>
                    {t('settings.contentLanguageDesc')}
                </p>
                <select
                    value={prefs.preferredLanguage}
                    onChange={e => onUpdate({ preferredLanguage: e.target.value as SupportedLanguage })}
                    style={selectStyle}
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>
            </Section>

            <Section title={t('settings.designPreferences')}>
                <label style={labelStyle}>{t('settings.layoutStyle')}</label>
                <select
                    value={prefs.layoutStyle}
                    onChange={e => onUpdate({ layoutStyle: e.target.value as UserPrefs['layoutStyle'] })}
                    style={selectStyle}
                >
                    <option value="minimal">{t('settings.minimal')}</option>
                    <option value="balanced">{t('settings.balanced')}</option>
                    <option value="dense">{t('settings.dense')}</option>
                </select>

                <label style={{ ...labelStyle, marginTop: 14 }}>{t('settings.animationStyle')}</label>
                <select
                    value={prefs.animationStyle}
                    onChange={e => onUpdate({ animationStyle: e.target.value as UserPrefs['animationStyle'] })}
                    style={selectStyle}
                >
                    <option value="subtle">{t('settings.subtle')}</option>
                    <option value="moderate">{t('settings.moderate')}</option>
                    <option value="dramatic">{t('settings.dramatic')}</option>
                </select>
            </Section>
        </>
    );
}
