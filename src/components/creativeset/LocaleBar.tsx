// ─────────────────────────────────────────────────
// LocaleBar — Language pill tabs for Size Dashboard
// ─────────────────────────────────────────────────
// Shows active locale as pill tabs + "Add Language" button.
// No flags, no emojis — clean 2-letter codes + native name.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { LocaleData } from '@/schema/design.types';
import { LocalePickerPopover } from './LocalePickerPopover';

/** 2-letter display codes for common languages */
const LOCALE_DISPLAY: Record<string, { code: string; label: string }> = {
    ko: { code: 'KO', label: 'Korean' },
    en: { code: 'EN', label: 'English' },
    ja: { code: 'JA', label: 'Japanese' },
    'zh-cn': { code: 'ZH', label: 'Chinese (Simplified)' },
    'zh-tw': { code: 'ZH', label: 'Chinese (Traditional)' },
    fr: { code: 'FR', label: 'French' },
    es: { code: 'ES', label: 'Spanish' },
    de: { code: 'DE', label: 'German' },
    pt: { code: 'PT', label: 'Portuguese' },
    it: { code: 'IT', label: 'Italian' },
    nl: { code: 'NL', label: 'Dutch' },
    ru: { code: 'RU', label: 'Russian' },
    ar: { code: 'AR', label: 'Arabic' },
    hi: { code: 'HI', label: 'Hindi' },
    th: { code: 'TH', label: 'Thai' },
    vi: { code: 'VI', label: 'Vietnamese' },
    id: { code: 'ID', label: 'Indonesian' },
    tr: { code: 'TR', label: 'Turkish' },
    pl: { code: 'PL', label: 'Polish' },
    sv: { code: 'SV', label: 'Swedish' },
};

function getDisplay(code: string) {
    return LOCALE_DISPLAY[code] ?? { code: code.toUpperCase().slice(0, 2), label: code };
}

export function LocaleBar() {
    const localeData = useDesignStore(s => s.creativeSet?.localeData);
    const switchLocale = useDesignStore(s => s.switchLocale);
    const [pickerOpen, setPickerOpen] = useState(false);

    const handleSwitch = useCallback((code: string | null) => {
        switchLocale(code);
    }, [switchLocale]);

    const handlePickerClose = useCallback(() => setPickerOpen(false), []);

    // Don't render if no locale data exists yet
    if (!localeData) {
        return (
            <div className="locale-bar">
                <button
                    className="locale-add-btn"
                    onClick={() => setPickerOpen(true)}
                    title="Add a language translation"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Language
                </button>
                {pickerOpen && <LocalePickerPopover existingLocales={[]} onClose={handlePickerClose} />}
            </div>
        );
    }

    const localeCodes = Object.keys(localeData.locales);
    const active = localeData.activeLocale;

    return (
        <div className="locale-bar">
            {localeCodes.map(code => {
                const display = getDisplay(code);
                const isActive = active === code || (active === null && code === localeData.originalLocale);
                const isOriginal = code === localeData.originalLocale;
                return (
                    <button
                        key={code}
                        className={`locale-pill ${isActive ? 'locale-pill--active' : ''}`}
                        onClick={() => handleSwitch(isOriginal ? null : code)}
                        title={display.label}
                    >
                        <span className="locale-pill-code">{display.code}</span>
                        {isOriginal && <span className="locale-pill-tag">original</span>}
                    </button>
                );
            })}

            <button
                className="locale-add-btn"
                onClick={() => setPickerOpen(true)}
                title="Add a language translation"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {pickerOpen && <LocalePickerPopover existingLocales={localeCodes} onClose={handlePickerClose} />}
        </div>
    );
}
