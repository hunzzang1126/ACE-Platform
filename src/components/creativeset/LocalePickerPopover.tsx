// ─────────────────────────────────────────────────
// LocalePickerPopover — Language selection grid
// ─────────────────────────────────────────────────
// Shown when "Add Language" is clicked.
// Uses 2-letter codes + native names. No flags, no emojis.
// ─────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { translateAdCopy } from '@/services/localeTranslator';

interface Props {
    existingLocales: string[];
    onClose: () => void;
    onTranslating?: (translating: boolean) => void;
}

/** Available languages with their locale code and native name */
const LOCALE_OPTIONS: { code: string; english: string; native: string }[] = [
    { code: 'en', english: 'English', native: 'English' },
    { code: 'ko', english: 'Korean', native: '\ud55c\uad6d\uc5b4' },
    { code: 'ja', english: 'Japanese', native: '\u65e5\u672c\u8a9e' },
    { code: 'zh-cn', english: 'Chinese (Simplified)', native: '\u4e2d\u6587(\u7b80\u4f53)' },
    { code: 'zh-tw', english: 'Chinese (Traditional)', native: '\u4e2d\u6587(\u7e41\u9ad4)' },
    { code: 'fr', english: 'French', native: 'Fran\u00e7ais' },
    { code: 'es', english: 'Spanish', native: 'Espa\u00f1ol' },
    { code: 'de', english: 'German', native: 'Deutsch' },
    { code: 'pt', english: 'Portuguese', native: 'Portugu\u00eas' },
    { code: 'it', english: 'Italian', native: 'Italiano' },
    { code: 'nl', english: 'Dutch', native: 'Nederlands' },
    { code: 'ru', english: 'Russian', native: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
    { code: 'ar', english: 'Arabic', native: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
    { code: 'hi', english: 'Hindi', native: '\u0939\u093f\u0928\u094d\u0926\u0940' },
    { code: 'th', english: 'Thai', native: '\u0e44\u0e17\u0e22' },
    { code: 'vi', english: 'Vietnamese', native: 'Ti\u1ebfng Vi\u1ec7t' },
    { code: 'id', english: 'Indonesian', native: 'Bahasa' },
    { code: 'tr', english: 'Turkish', native: 'T\u00fcrk\u00e7e' },
    { code: 'pl', english: 'Polish', native: 'Polski' },
    { code: 'sv', english: 'Swedish', native: 'Svenska' },
];

export function LocalePickerPopover({ existingLocales, onClose, onTranslating }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const [translating, setTranslating] = useState(false);

    const handleSelect = useCallback(async (code: string) => {
        const lang = LOCALE_OPTIONS.find(l => l.code === code);
        const cs = useDesignStore.getState().creativeSet;
        if (!cs) { onClose(); return; }

        const originalLocale = cs.localeData?.originalLocale || 'en';
        const master = cs.variants.find(v => v.id === cs.masterVariantId);
        if (!master) { onClose(); return; }

        // Collect text elements to translate
        const textElements = master.elements
            .filter((el: any) => (el.type === 'text' && el.content) || (el.type === 'button' && (el as any).label))
            .map((el: any) => ({
                name: el.name,
                content: el.type === 'button' ? (el as any).label : el.content,
            }));

        if (textElements.length === 0) { onClose(); return; }

        // Show loading state
        setTranslating(true);
        onTranslating?.(true);

        try {
            const result = await translateAdCopy({
                elements: textElements,
                targetLang: code,
                sourceLang: originalLocale,
            });

            if (result.success && Object.keys(result.translations).length > 0) {
                // Build original texts map
                const originalTexts: Record<string, string> = {};
                for (const el of textElements) originalTexts[el.name] = el.content;

                // Store translations (merge with existing)
                useDesignStore.getState().setLocaleData({
                    locales: {
                        [originalLocale]: originalTexts,
                        [code]: result.translations,
                    },
                    activeLocale: code,
                    originalLocale,
                });
                useDesignStore.getState().switchLocale(code);
            } else {
                console.error('[LocalePicker] Translation failed:', result.error);
            }
        } catch (err) {
            console.error('[LocalePicker] Translation error:', err);
        } finally {
            setTranslating(false);
            onTranslating?.(false);
        }
        onClose();
    }, [onClose, onTranslating]);

    const available = LOCALE_OPTIONS.filter(l => !existingLocales.includes(l.code));

    return (
        <div className="locale-picker" ref={ref}>
            <div className="locale-picker-header">Add Language</div>
            <div className="locale-picker-grid">
                {available.map(lang => (
                    <button
                        key={lang.code}
                        className="locale-picker-item"
                        onClick={() => handleSelect(lang.code)}
                    >
                        <span className="locale-picker-code">{lang.code.toUpperCase().slice(0, 2)}</span>
                        <span className="locale-picker-native">{lang.native}</span>
                    </button>
                ))}
                {available.length === 0 && (
                    <div className="locale-picker-empty">All languages already added</div>
                )}
            </div>
        </div>
    );
}
