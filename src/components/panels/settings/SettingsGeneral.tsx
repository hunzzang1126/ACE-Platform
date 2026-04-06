// ─────────────────────────────────────────────────
// SettingsGeneral — Language + Design preferences
// ─────────────────────────────────────────────────

import { SUPPORTED_LANGUAGES, type SupportedLanguage, type UserPrefs } from '@/stores/userPrefs';
import { selectStyle, labelStyle, descStyle, Section } from './settingsShared';

interface Props {
    prefs: UserPrefs;
    onUpdate: (patch: Partial<UserPrefs>) => void;
}

export function SettingsGeneral({ prefs, onUpdate }: Props) {
    return (
        <>
            <Section title="Content Language">
                <p style={descStyle}>
                    AI-generated copy will use this language by default
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

            <Section title="Design Preferences">
                <label style={labelStyle}>Layout Style</label>
                <select
                    value={prefs.layoutStyle}
                    onChange={e => onUpdate({ layoutStyle: e.target.value as UserPrefs['layoutStyle'] })}
                    style={selectStyle}
                >
                    <option value="minimal">Minimal</option>
                    <option value="balanced">Balanced</option>
                    <option value="dense">Dense</option>
                </select>

                <label style={{ ...labelStyle, marginTop: 14 }}>Animation Style</label>
                <select
                    value={prefs.animationStyle}
                    onChange={e => onUpdate({ animationStyle: e.target.value as UserPrefs['animationStyle'] })}
                    style={selectStyle}
                >
                    <option value="subtle">Subtle</option>
                    <option value="moderate">Moderate</option>
                    <option value="dramatic">Dramatic</option>
                </select>
            </Section>
        </>
    );
}
