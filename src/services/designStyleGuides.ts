// ─────────────────────────────────────────────────
// designStyleGuides.ts — AI-Driven Color Intelligence
// ─────────────────────────────────────────────────
// Colors are NO LONGER hardcoded palettes.
// AI determines the brand-appropriate color palette
// based on prompt context (brand + industry + mood).
//
// "Nike" → red/black/white (AI knows the brand)
// "Coca-Cola" → red/white
// "luxury watch" → gold/navy
// "make it green" → green palette
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

// ── Types ────────────────────────────────────────

export interface DesignStyleGuide {
    id: string;
    name: string;
    description: string;
    keywords: string[];  // kept for backward compat

    colors: {
        background: string;
        surface: string;
        border: string;
        foreground: string;
        secondary: string;
        tertiary: string;
        muted: string;
        accent: string;
        accentForeground: string;
        error: string;
        warning: string;
        info: string;
        gradientStart: string;
        gradientEnd: string;
        gradientAngle: number;
    };

    typography: {
        primaryFont: string;
        secondaryFont: string;
        scale: {
            hero: number;
            headline: number;
            title: number;
            body: number;
            caption: number;
            micro: number;
        };
        weights: {
            bold: string;
            semibold: string;
            medium: string;
            normal: string;
        };
        letterSpacing: {
            tight: number;
            normal: number;
            wide: number;
        };
    };

    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
        safe: number;
    };

    radius: number;
}

// ── Default palette (used as fallback) ───────────

const DEFAULT_PALETTE: DesignStyleGuide = {
    id: 'ai-generated',
    name: 'AI Generated',
    description: 'AI-determined color palette based on prompt context',
    keywords: [],
    colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#222222',
        foreground: '#ffffff',
        secondary: '#cccccc',
        tertiary: '#888888',
        muted: '#555555',
        accent: '#3b82f6',
        accentForeground: '#ffffff',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#4488ff',
        gradientStart: '#0a0a0a',
        gradientEnd: '#0f172a',
        gradientAngle: 135,
    },
    typography: {
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
        weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
        letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
    radius: 6,
};

// ── AI Color Palette Generation ──────────────────

const COLOR_SYSTEM_PROMPT = `You are a world-class brand color expert and creative director.
Given a user's design prompt, determine the PERFECT color palette.

RULES:
1. If the prompt mentions a KNOWN BRAND (Nike, Coca-Cola, Apple, Google, etc.), use that brand's signature colors.
2. If the prompt mentions a specific COLOR ("red", "blue", etc.), make that the accent color with a matching palette.
3. If no brand or color is mentioned, infer the best palette from the INDUSTRY/MOOD:
   - Finance/luxury → deep navy + gold
   - Tech/SaaS → dark bg + electric blue or cyan
   - Health/medical → light bg + teal
   - Food/lifestyle → warm neutrals + coral
   - Sport/energy → dark bg + bold red/orange
   - Fashion/beauty → elegant dark or warm neutral
4. ALWAYS ensure 4.5:1+ contrast between text and background.
5. Dark backgrounds (< #333) should have white/light text. Light backgrounds (> #ccc) should have dark text.
6. Return ONLY the JSON object, nothing else.`;

interface AiColorResponse {
    name: string;
    background: string;
    surface: string;
    foreground: string;
    secondary: string;
    accent: string;
    accentForeground: string;
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
    fontPrimary: string;
    fontSecondary: string;
    radius: number;
    reasoning: string;
}

/**
 * Ask AI to generate a brand-aware color palette from the prompt.
 * Falls back to DEFAULT_PALETTE on error.
 */
export async function generateColorPalette(
    prompt: string,
    signal: AbortSignal,
): Promise<{ palette: DesignStyleGuide; reasoning: string }> {
    try {
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 512,
            temperature: 0.4,
            system: COLOR_SYSTEM_PROMPT,
            messages: [{
                role: 'user' as const,
                content: `Design prompt: "${prompt}"

Return a JSON object with these exact keys:
{
  "name": "short palette name (e.g. 'Nike Bold Red')",
  "background": "#hex (canvas background)",
  "surface": "#hex (slightly lighter than bg)",
  "foreground": "#hex (primary text color)",
  "secondary": "#hex (secondary text)",
  "accent": "#hex (CTA/highlight color)",
  "accentForeground": "#hex (text on accent bg)",
  "gradientStart": "#hex",
  "gradientEnd": "#hex",
  "gradientAngle": number,
  "fontPrimary": "font name for headlines",
  "fontSecondary": "font name for body",
  "radius": number (corner radius 0-12),
  "reasoning": "1 sentence explaining why these colors"
}`,
            }],
        };

        const data = await callAnthropicApi(body, signal) as {
            content: Array<{ type: string; text?: string }>;
        };

        const textBlock = data.content.find(c => c.type === 'text');
        if (!textBlock?.text) throw new Error('No AI color response');

        let raw = textBlock.text.trim();
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        const parsed = JSON.parse(raw) as AiColorResponse;

        // Build palette from AI response, filling gaps with defaults
        const palette: DesignStyleGuide = {
            ...DEFAULT_PALETTE,
            id: 'ai-generated',
            name: parsed.name || 'AI Generated',
            description: parsed.reasoning || '',
            colors: {
                ...DEFAULT_PALETTE.colors,
                background: parsed.background || DEFAULT_PALETTE.colors.background,
                surface: parsed.surface || DEFAULT_PALETTE.colors.surface,
                border: darken(parsed.surface || DEFAULT_PALETTE.colors.surface, 0.3),
                foreground: parsed.foreground || DEFAULT_PALETTE.colors.foreground,
                secondary: parsed.secondary || DEFAULT_PALETTE.colors.secondary,
                tertiary: lighten(parsed.secondary || DEFAULT_PALETTE.colors.secondary, 0.2),
                muted: darken(parsed.secondary || DEFAULT_PALETTE.colors.secondary, 0.3),
                accent: parsed.accent || DEFAULT_PALETTE.colors.accent,
                accentForeground: parsed.accentForeground || DEFAULT_PALETTE.colors.accentForeground,
                gradientStart: parsed.gradientStart || parsed.background || DEFAULT_PALETTE.colors.gradientStart,
                gradientEnd: parsed.gradientEnd || DEFAULT_PALETTE.colors.gradientEnd,
                gradientAngle: parsed.gradientAngle ?? 135,
            },
            typography: {
                ...DEFAULT_PALETTE.typography,
                primaryFont: parsed.fontPrimary || 'Inter',
                secondaryFont: parsed.fontSecondary || 'Inter',
            },
            radius: parsed.radius ?? 6,
        };

        return { palette, reasoning: parsed.reasoning || '' };
    } catch (err) {
        console.warn('[ColorPalette] AI generation failed, using default:', err);
        return { palette: { ...DEFAULT_PALETTE }, reasoning: 'Using default palette (AI unavailable)' };
    }
}

// ── Legacy compat — selectStyleGuide (synchronous fallback) ──

/**
 * @deprecated Use generateColorPalette() instead.
 * Kept for backward compatibility with non-async callers.
 */
export function selectStyleGuide(_prompt: string): DesignStyleGuide {
    return { ...DEFAULT_PALETTE };
}

// ── Build AI-readable style description ──────────

export function buildStylePromptForAI(guide: DesignStyleGuide, canvasW: number, canvasH: number): string {
    const s = guide;
    const minDim = Math.min(canvasW, canvasH);

    return `
SELECTED COLOR PALETTE: "${s.name}"
${s.description}

COLOR PALETTE:
  Background: ${s.colors.background}
  Surface (cards/panels): ${s.colors.surface}
  Border: ${s.colors.border}
  Primary Text: ${s.colors.foreground}
  Secondary Text: ${s.colors.secondary}
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

SPACING:
  Safe Margin: ${s.spacing.safe}px from all edges
  Element Gap: ${s.spacing.md}px (medium), ${s.spacing.lg}px (large)
  Corner Radius: ${s.radius}px

RULES:
  - Use ONLY colors from this palette. Do NOT invent new colors.
  - Headlines use "${s.typography.primaryFont}", body uses "${s.typography.secondaryFont}"
  - CTA background = ${s.colors.accent}, CTA text = ${s.colors.accentForeground}
  - Background gradient = ${s.colors.gradientStart} -> ${s.colors.gradientEnd} at ${s.colors.gradientAngle}deg
  - Text must have 4.5:1+ contrast against its background
`;
}

// ── Color utility helpers ────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function darken(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function lighten(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

// Re-export for backward compat
export const STYLE_GUIDES: Record<string, DesignStyleGuide> = {
    'default': DEFAULT_PALETTE,
};
