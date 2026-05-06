// ─────────────────────────────────────────────────
// BrandTypographyTab — Font selection with dropdowns
// ─────────────────────────────────────────────────
// Replaces raw text inputs with curated Google Fonts
// dropdowns and live-loaded font previews.
// ─────────────────────────────────────────────────

import { useEffect } from 'react';
import type { BrandKit } from '@/stores/brandKitStore';

// ── Curated Font List (50 popular + CJK) ──

const FONT_OPTIONS = [
    // Sans-serif — Modern / Clean
    'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato',
    'Poppins', 'Raleway', 'Oswald', 'Outfit', 'DM Sans',
    'Space Grotesk', 'Plus Jakarta Sans', 'Nunito', 'Quicksand', 'Work Sans',
    'Rubik', 'Manrope', 'Source Sans 3', 'Archivo', 'Josefin Sans',
    'Barlow', 'Lexend', 'Sora', 'Urbanist', 'Red Hat Display',
    'Figtree', 'Albert Sans', 'IBM Plex Sans', 'Fira Sans',
    // Serif — Elegant / Editorial
    'Playfair Display', 'Merriweather', 'Cormorant Garamond',
    'Libre Baskerville', 'Crimson Text', 'EB Garamond', 'Spectral',
    // Display — Bold / Impact
    'Bebas Neue', 'Anton', 'Black Ops One', 'Permanent Marker', 'Russo One',
    // CJK
    'Noto Sans KR', 'Noto Serif KR', 'Black Han Sans', 'Jua', 'Gothic A1',
    'Noto Sans JP', 'Noto Sans SC', 'Noto Sans TC',
];

// ── Google Fonts Loader ──

const loadedFonts = new Set<string>();

function loadGoogleFont(family: string) {
    if (!family || loadedFonts.has(family)) return;
    loadedFonts.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700;800&display=swap`;
    document.head.appendChild(link);
}

// ── Types ──

interface Props {
    kit: BrandKit;
    onUpdateTypography: (kitId: string, update: Record<string, any>) => void;
}

type FontRole = 'heading' | 'body' | 'cta';

interface FontRoleConfig {
    role: FontRole;
    label: string;
    description: string;
    previewWeight: string;
    previewSize: number;
    getPreviewText: (kit: BrandKit) => string;
}

const ROLE_CONFIGS: FontRoleConfig[] = [
    {
        role: 'heading',
        label: 'Headline Font',
        description: 'Used for main headline text in ad designs',
        previewWeight: '700',
        previewSize: 28,
        getPreviewText: (kit) => kit.guidelines.name || kit.name || 'Your Brand Name',
    },
    {
        role: 'body',
        label: 'Body Font',
        description: 'Used for subheadlines and description text',
        previewWeight: '400',
        previewSize: 16,
        getPreviewText: () => 'The quick brown fox jumps over the lazy dog',
    },
    {
        role: 'cta',
        label: 'CTA Font',
        description: 'Used for call-to-action buttons',
        previewWeight: '700',
        previewSize: 15,
        getPreviewText: (kit) => {
            const phrases = kit.guidelines.ctaPhrases;
            return phrases.length > 0 ? phrases[0]! : 'Learn More';
        },
    },
];

// ── Component ──

export function BrandTypographyTab({ kit, onUpdateTypography }: Props) {
    // Load all currently selected fonts on mount
    useEffect(() => {
        loadGoogleFont(kit.typography.heading.family);
        loadGoogleFont(kit.typography.body.family);
        loadGoogleFont(kit.typography.cta.family);
    }, [kit.typography.heading.family, kit.typography.body.family, kit.typography.cta.family]);

    const handleFontChange = (role: FontRole, family: string) => {
        loadGoogleFont(family);
        onUpdateTypography(kit.id, {
            [role]: { ...kit.typography[role], family },
        });
    };

    return (
        <div className="brand-typo">
            <p className="brand-cloud__section-desc">
                AI will use these fonts when generating ad designs for this brand.
            </p>

            {ROLE_CONFIGS.map(config => {
                const currentFont = kit.typography[config.role].family || 'Inter';
                const previewText = config.getPreviewText(kit);

                return (
                    <div key={config.role} className="brand-typo__card">
                        <div className="brand-typo__card-header">
                            <span className="brand-typo__card-label">{config.label}</span>
                            <span className="brand-typo__card-desc">{config.description}</span>
                        </div>

                        <div className="brand-typo__card-body">
                            <select
                                className="brand-typo__font-select"
                                value={currentFont}
                                onChange={e => handleFontChange(config.role, e.target.value)}
                                style={{ fontFamily: `"${currentFont}", system-ui, sans-serif` }}
                            >
                                {/* Show current value even if not in list (custom fonts) */}
                                {!FONT_OPTIONS.includes(currentFont) && (
                                    <option value={currentFont}>{currentFont}</option>
                                )}
                                {FONT_OPTIONS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>

                            {/* Allow custom font name input */}
                            <input
                                className="brand-typo__custom-input"
                                value={currentFont}
                                onChange={e => handleFontChange(config.role, e.target.value)}
                                placeholder="Or type custom font..."
                                spellCheck={false}
                            />
                        </div>

                        <div
                            className="brand-typo__preview"
                            style={{
                                fontFamily: `"${currentFont}", system-ui, sans-serif`,
                                fontWeight: config.previewWeight,
                                fontSize: `${config.previewSize}px`,
                                textTransform: config.role === 'cta' ? 'uppercase' : undefined,
                                letterSpacing: config.role === 'cta' ? '0.08em' : undefined,
                            }}
                        >
                            {previewText}
                        </div>

                        <div className="brand-typo__alphabet" style={{ fontFamily: `"${currentFont}", system-ui, sans-serif` }}>
                            Aa Bb Cc Dd Ee Ff Gg 0123456789
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
