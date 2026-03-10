// ─────────────────────────────────────────────────
// designStyleGuides.ts — Pre-built Design Palettes
// ─────────────────────────────────────────────────
// Inspired by Pencil.dev's style guide selection.
// AI selects the best-fit guide BEFORE generating any elements.
// Each guide is a complete design system: colors, typography, spacing.
// ─────────────────────────────────────────────────

// ── Types ────────────────────────────────────────

export interface DesignStyleGuide {
    id: string;
    name: string;
    description: string;
    keywords: string[];  // for auto-detection from user prompt

    colors: {
        background: string;       // page/canvas bg
        surface: string;          // elevated card/panel bg
        border: string;           // dividers, outlines
        foreground: string;       // primary text
        secondary: string;        // body text
        tertiary: string;         // labels, descriptions
        muted: string;            // placeholders, disabled
        accent: string;           // CTAs, active states, highlights
        accentForeground: string; // text on accent bg
        error: string;
        warning: string;
        info: string;
        gradientStart: string;    // primary gradient start
        gradientEnd: string;      // primary gradient end
        gradientAngle: number;
    };

    typography: {
        primaryFont: string;      // headlines, values
        secondaryFont: string;    // body, labels, metadata
        scale: {
            hero: number;         // largest text (metric values, hero headlines)
            headline: number;     // section headlines
            title: number;        // card titles
            body: number;         // body text
            caption: number;      // labels, metadata
            micro: number;        // tags, tiny labels
        };
        weights: {
            bold: string;
            semibold: string;
            medium: string;
            normal: string;
        };
        letterSpacing: {
            tight: number;        // headlines (negative)
            normal: number;
            wide: number;         // labels, ALL CAPS
        };
    };

    spacing: {
        xs: number;   // 4
        sm: number;   // 8
        md: number;   // 12
        lg: number;   // 16
        xl: number;   // 24
        xxl: number;  // 32
        safe: number; // margin from canvas edge
    };

    radius: number;   // corner radius for cards/buttons
}

// ── Built-in Style Guides ────────────────────────

export const STYLE_GUIDES: Record<string, DesignStyleGuide> = {

    'midnight-premium': {
        id: 'midnight-premium',
        name: 'Midnight Premium',
        description: 'Dark navy canvas with gold accent. Authoritative, trustworthy, luxurious.',
        keywords: ['finance', 'bank', 'invest', 'insurance', 'legal', 'wealth', 'premium', 'luxury', 'gold', 'trust', 'professional', 'corporate'],
        colors: {
            background: '#0a1628',
            surface: '#111d33',
            border: '#1a2a44',
            foreground: '#f0f2f5',
            secondary: '#b0b8c8',
            tertiary: '#6b7a90',
            muted: '#3d4f66',
            accent: '#c9a84c',
            accentForeground: '#0a1628',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db',
            gradientStart: '#0a1628',
            gradientEnd: '#142240',
            gradientAngle: 135,
        },
        typography: {
            primaryFont: 'Inter',
            secondaryFont: 'Inter',
            scale: { hero: 0.16, headline: 0.10, title: 0.07, body: 0.05, caption: 0.04, micro: 0.03 },
            weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
            letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
        radius: 6,
    },

    'electric-dark': {
        id: 'electric-dark',
        name: 'Electric Dark',
        description: 'Pure black canvas with electric cyan/lime accent. Bold, modern, tech-forward.',
        keywords: ['tech', 'saas', 'app', 'software', 'cloud', 'ai', 'startup', 'digital', 'cyber', 'data', 'code', 'dev'],
        colors: {
            background: '#000000',
            surface: '#111111',
            border: '#1a1a1a',
            foreground: '#ffffff',
            secondary: '#999999',
            tertiary: '#6e6e6e',
            muted: '#404040',
            accent: '#00d4ff',
            accentForeground: '#000000',
            error: '#ff4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            gradientStart: '#000000',
            gradientEnd: '#0a0e1a',
            gradientAngle: 180,
        },
        typography: {
            primaryFont: 'Inter',
            secondaryFont: 'JetBrains Mono',
            scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
            weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
            letterSpacing: { tight: -1, normal: 0, wide: 2 },
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 14 },
        radius: 0,
    },

    'warm-neutral': {
        id: 'warm-neutral',
        name: 'Warm Neutral',
        description: 'Off-white canvas with coral/terracotta accent. Approachable, warm, lifestyle.',
        keywords: ['lifestyle', 'fashion', 'beauty', 'food', 'travel', 'wellness', 'boutique', 'organic', 'natural', 'home', 'living'],
        colors: {
            background: '#faf8f5',
            surface: '#ffffff',
            border: '#e8e4de',
            foreground: '#1a1714',
            secondary: '#5c564e',
            tertiary: '#8a837a',
            muted: '#c4beb5',
            accent: '#d4654a',
            accentForeground: '#ffffff',
            error: '#c0392b',
            warning: '#e67e22',
            info: '#2980b9',
            gradientStart: '#faf8f5',
            gradientEnd: '#f0ece5',
            gradientAngle: 180,
        },
        typography: {
            primaryFont: 'DM Sans',
            secondaryFont: 'Inter',
            scale: { hero: 0.15, headline: 0.10, title: 0.07, body: 0.05, caption: 0.038, micro: 0.028 },
            weights: { bold: '700', semibold: '600', medium: '500', normal: '400' },
            letterSpacing: { tight: -0.3, normal: 0, wide: 1 },
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36, safe: 18 },
        radius: 10,
    },

    'bold-impact': {
        id: 'bold-impact',
        name: 'Bold Impact',
        description: 'Dark charcoal with electric orange/red accent. High-energy, urgent, dynamic.',
        keywords: ['sale', 'discount', 'promo', 'sport', 'shoe', 'gym', 'energy', 'launch', 'event', 'concert', 'gaming', 'esports'],
        colors: {
            background: '#0a0a0a',
            surface: '#141414',
            border: '#222222',
            foreground: '#ffffff',
            secondary: '#cccccc',
            tertiary: '#888888',
            muted: '#555555',
            accent: '#ff4500',
            accentForeground: '#ffffff',
            error: '#ff2222',
            warning: '#ffaa00',
            info: '#4488ff',
            gradientStart: '#0a0a0a',
            gradientEnd: '#1a0a00',
            gradientAngle: 135,
        },
        typography: {
            primaryFont: 'Inter',
            secondaryFont: 'Inter',
            scale: { hero: 0.22, headline: 0.13, title: 0.09, body: 0.055, caption: 0.04, micro: 0.03 },
            weights: { bold: '900', semibold: '700', medium: '600', normal: '400' },
            letterSpacing: { tight: -1.5, normal: 0, wide: 3 },
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 28, safe: 12 },
        radius: 4,
    },

    'clean-clinical': {
        id: 'clean-clinical',
        name: 'Clean Clinical',
        description: 'Light gray canvas with teal accent. Clean, calm, trustworthy, clinical.',
        keywords: ['health', 'medical', 'doctor', 'clinic', 'care', 'pharma', 'hospital', 'education', 'school', 'university', 'learn', 'course'],
        colors: {
            background: '#f4f6f8',
            surface: '#ffffff',
            border: '#dde2e8',
            foreground: '#1c2331',
            secondary: '#4a5568',
            tertiary: '#718096',
            muted: '#a0aec0',
            accent: '#17a589',
            accentForeground: '#ffffff',
            error: '#e53e3e',
            warning: '#dd6b20',
            info: '#3182ce',
            gradientStart: '#f4f6f8',
            gradientEnd: '#e8f4f0',
            gradientAngle: 180,
        },
        typography: {
            primaryFont: 'Plus Jakarta Sans',
            secondaryFont: 'Inter',
            scale: { hero: 0.14, headline: 0.09, title: 0.065, body: 0.048, caption: 0.036, micro: 0.028 },
            weights: { bold: '700', semibold: '600', medium: '500', normal: '400' },
            letterSpacing: { tight: -0.2, normal: 0, wide: 0.5 },
        },
        spacing: { xs: 4, sm: 8, md: 14, lg: 18, xl: 28, xxl: 40, safe: 20 },
        radius: 8,
    },
};

// ── Auto-detect best style guide from prompt ─────

export function selectStyleGuide(prompt: string): DesignStyleGuide {
    const lower = prompt.toLowerCase();
    let bestMatch: DesignStyleGuide = STYLE_GUIDES['midnight-premium']!;
    let bestScore = 0;

    for (const guide of Object.values(STYLE_GUIDES)) {
        let score = 0;
        for (const kw of guide.keywords) {
            if (lower.includes(kw)) score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = guide;
        }
    }

    // Default to electric-dark if no strong match (modern, versatile)
    if (bestScore === 0) return STYLE_GUIDES['electric-dark']!;
    return bestMatch;
}

// ── Build AI-readable style description ──────────

export function buildStylePromptForAI(guide: DesignStyleGuide, canvasW: number, canvasH: number): string {
    const s = guide;
    const minDim = Math.min(canvasW, canvasH);

    return `
SELECTED STYLE GUIDE: "${s.name}"
${s.description}

COLOR PALETTE:
  Background: ${s.colors.background}
  Surface (cards/panels): ${s.colors.surface}
  Border: ${s.colors.border}
  Primary Text: ${s.colors.foreground}
  Secondary Text: ${s.colors.secondary}
  Tertiary Text: ${s.colors.tertiary}
  Accent (CTA, highlights): ${s.colors.accent}
  Accent Foreground (text on accent): ${s.colors.accentForeground}
  Gradient: ${s.colors.gradientStart} -> ${s.colors.gradientEnd} at ${s.colors.gradientAngle}deg

TYPOGRAPHY:
  Headlines: "${s.typography.primaryFont}", weight=${s.typography.weights.bold}
  Body / Labels: "${s.typography.secondaryFont}", weight=${s.typography.weights.normal}
  Hero Size: ${Math.round(minDim * s.typography.scale.hero)}px
  Headline Size: ${Math.round(minDim * s.typography.scale.headline)}px
  Title Size: ${Math.round(minDim * s.typography.scale.title)}px
  Body Size: ${Math.round(minDim * s.typography.scale.body)}px
  Caption Size: ${Math.round(minDim * s.typography.scale.caption)}px
  Letter Spacing: headlines=${s.typography.letterSpacing.tight}px, labels=${s.typography.letterSpacing.wide}px

SPACING:
  Safe Margin: ${s.spacing.safe}px from all edges
  Element Gap: ${s.spacing.md}px (medium), ${s.spacing.lg}px (large), ${s.spacing.xl}px (section)
  Corner Radius: ${s.radius}px

RULES:
  - Use ONLY colors from this palette. Do NOT invent new colors.
  - Headlines use "${s.typography.primaryFont}", body uses "${s.typography.secondaryFont}"
  - CTA background = ${s.colors.accent}, CTA text = ${s.colors.accentForeground}
  - Background gradient = ${s.colors.gradientStart} -> ${s.colors.gradientEnd} at ${s.colors.gradientAngle}deg
  - Text must have 4.5:1+ contrast against its background
`;
}
