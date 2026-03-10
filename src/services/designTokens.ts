// ─────────────────────────────────────────────────────────
// designTokens.ts — CSS-Variable-Level Design Tokens
// ─────────────────────────────────────────────────────────
// Derives granular design tokens from BrandKit for AI use.
// Inspired by Pencil.dev's get_variables/set_variables tools.
//
// Unlike raw BrandKit types, tokens are "AI-ready":
// - Semantic names (e.g., "color-surface", "font-heading-size")
// - Flat key-value structure (no nesting)
// - Ready for injection into AI system prompt
// ─────────────────────────────────────────────────────────

import type { BrandKit, BrandPalette, BrandTypography } from '@/stores/brandKitStore';

// ── Token Categories ──

export interface DesignToken {
    key: string;           // e.g., "color.primary", "font.heading.family"
    value: string;         // e.g., "#c9a84c", "Inter"
    category: 'color' | 'font' | 'spacing' | 'effect' | 'layout';
    description: string;   // AI-friendly description
}

// ── Derive Tokens from BrandKit ──

export function deriveDesignTokens(kit: BrandKit): DesignToken[] {
    const tokens: DesignToken[] = [];

    // ── Color Tokens ──
    tokens.push(
        { key: 'color.primary', value: kit.palette.primary, category: 'color', description: 'Primary brand color, used for key UI elements and CTAs' },
        { key: 'color.secondary', value: kit.palette.secondary, category: 'color', description: 'Secondary brand color, used for backgrounds and supporting elements' },
        { key: 'color.accent', value: kit.palette.accent, category: 'color', description: 'Accent color for emphasis and interactive elements' },
        { key: 'color.background', value: kit.palette.background, category: 'color', description: 'Default background color' },
        { key: 'color.text', value: kit.palette.text, category: 'color', description: 'Default text color' },
    );

    // Add gradient tokens
    kit.palette.gradients.forEach((g, i) => {
        tokens.push({
            key: `color.gradient.${i}`,
            value: `linear-gradient(${g.angle}deg, ${g.start}, ${g.end})`,
            category: 'color',
            description: g.name || `Brand gradient ${i + 1}`,
        });
    });

    // ── Typography Tokens ──
    const typo = kit.typography;
    tokens.push(
        { key: 'font.heading.family', value: typo.heading.family, category: 'font', description: 'Heading font family' },
        { key: 'font.heading.weight', value: String(typo.heading.weights[0] ?? 700), category: 'font', description: 'Primary heading weight' },
        { key: 'font.heading.letterSpacing', value: `${typo.heading.letterSpacing}px`, category: 'font', description: 'Heading letter spacing' },
        { key: 'font.body.family', value: typo.body.family, category: 'font', description: 'Body text font family' },
        { key: 'font.body.weight', value: String(typo.body.weights[0] ?? 400), category: 'font', description: 'Primary body weight' },
        { key: 'font.cta.family', value: typo.cta.family, category: 'font', description: 'CTA button font family' },
        { key: 'font.cta.weight', value: String(typo.cta.weights[0] ?? 600), category: 'font', description: 'CTA button font weight' },
        { key: 'font.cta.transform', value: typo.cta.transform, category: 'font', description: 'CTA text transform (uppercase/none)' },
    );

    // ── Spacing Tokens (derived from canvas conventions) ──
    tokens.push(
        { key: 'spacing.xs', value: '4px', category: 'spacing', description: 'Extra small spacing (4px grid)' },
        { key: 'spacing.sm', value: '8px', category: 'spacing', description: 'Small spacing' },
        { key: 'spacing.md', value: '16px', category: 'spacing', description: 'Medium spacing (default padding)' },
        { key: 'spacing.lg', value: '24px', category: 'spacing', description: 'Large spacing' },
        { key: 'spacing.xl', value: '32px', category: 'spacing', description: 'Extra large spacing' },
    );

    // ── Effect Tokens ──
    tokens.push(
        { key: 'effect.shadow.cta', value: '0 2px 4px rgba(0,0,0,0.15)', category: 'effect', description: 'CTA button drop shadow' },
        { key: 'effect.radius.sm', value: '4px', category: 'effect', description: 'Small border-radius (inputs, tags)' },
        { key: 'effect.radius.md', value: '8px', category: 'effect', description: 'Medium border-radius (buttons, cards)' },
        { key: 'effect.radius.lg', value: '12px', category: 'effect', description: 'Large border-radius (prominent CTAs)' },
    );

    return tokens;
}

// ── Generate AI-Readable Token Summary ──

export function buildTokenPromptForAI(kit: BrandKit): string {
    const tokens = deriveDesignTokens(kit);

    const colorTokens = tokens.filter(t => t.category === 'color');
    const fontTokens = tokens.filter(t => t.category === 'font');
    const spacingTokens = tokens.filter(t => t.category === 'spacing');
    const effectTokens = tokens.filter(t => t.category === 'effect');

    const sections = [
        colorTokens.length > 0 ? `COLOR TOKENS:\n${colorTokens.map(t => `  ${t.key}: ${t.value} — ${t.description}`).join('\n')}` : '',
        fontTokens.length > 0 ? `TYPOGRAPHY TOKENS:\n${fontTokens.map(t => `  ${t.key}: ${t.value} — ${t.description}`).join('\n')}` : '',
        spacingTokens.length > 0 ? `SPACING TOKENS (4px grid):\n${spacingTokens.map(t => `  ${t.key}: ${t.value}`).join('\n')}` : '',
        effectTokens.length > 0 ? `EFFECT TOKENS:\n${effectTokens.map(t => `  ${t.key}: ${t.value}`).join('\n')}` : '',
    ].filter(Boolean);

    const guidelines = kit.guidelines;
    const guidelineSection = guidelines.name
        ? `\nBRAND GUIDELINES:\n  Brand: ${guidelines.name}\n  Industry: ${guidelines.industry}\n  Voice: ${guidelines.voiceTone}${guidelines.tagline ? `\n  Tagline: "${guidelines.tagline}"` : ''}${guidelines.ctaPhrases.length > 0 ? `\n  CTA phrases: ${guidelines.ctaPhrases.map(p => `"${p}"`).join(', ')}` : ''}${guidelines.forbiddenColors.length > 0 ? `\n  Avoid colors: ${guidelines.forbiddenColors.join(', ')}` : ''}${guidelines.forbiddenWords.length > 0 ? `\n  Avoid words: ${guidelines.forbiddenWords.join(', ')}` : ''}`
        : '';

    return `\nDESIGN TOKENS:\n${sections.join('\n\n')}\n${guidelineSection}\n\nIMPORTANT: Use these exact token values. DO NOT invent new colors or fonts.\n`;
}
