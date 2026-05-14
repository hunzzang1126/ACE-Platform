// ─────────────────────────────────────────────────
// designStyleGuides.ts — AI Creative Director
// ★ Determines color palette, design strategy, overlay approach,
//   CTA style, text hierarchy, and template selection.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { parseDesignStrategy, DEFAULT_STRATEGY } from '@/services/designStrategy';
import type { DesignStrategy } from '@/services/designStrategy';
import { selectFontPair } from '@/services/fontPairings';

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
// ★ v744: Slimmed system prompt — 50% smaller.
// Brief metadata (mood/industry) piped in → no re-analysis.
// Font selection → code (fontPairings.ts). Image/overlay → code.
// AI only decides: colors + background image prompt.

const COLOR_SYSTEM_PROMPT = `You are a brand color expert. Given a design prompt with pre-analyzed mood/industry, determine the PERFECT color palette.

RULES:
1. User-specified colors ALWAYS win ("red", "blue", "파란색" → accent color).
2. Known brands → use signature colors (Nike=red/black, Apple=white/black, etc.).
3. Otherwise, match palette to the given mood/industry.
4. ALWAYS ensure 4.5:1+ contrast between text and background.
5. Dark backgrounds (<#333) → white/light text. Light backgrounds (>#ccc) → dark text.
6. needsBackgroundImage: true if prompt describes a physical scene/product/person. false for abstract.
7. If needsBackgroundImage=true, write a backgroundImagePrompt for ad-ready photography:
   - NEVER include text/logos in the image
   - Include: lighting, depth of field, color temperature
   - Leave negative space for text overlay
8. Return ONLY valid JSON.`;

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
    needsBackgroundImage: boolean;
    backgroundImagePrompt: string;
    templateId?: string | null;
}

/** Brief metadata from Phase 2 — eliminates re-analysis */
export interface BriefHint {
    mood: string;
    industry: string;
    slots: string[];
    textDensity?: string;
}

/**
 * Generate a brand-aware color palette from the prompt.
 * ★ v744: Accepts briefHint (mood/industry) from Phase 2.
 * Font selection uses codified fontPairings.ts.
 * Design strategy is deterministic (code, not AI).
 */
export async function generateColorPalette(
    prompt: string,
    signal: AbortSignal,
    templateCatalog?: Array<{ id: string; name: string; description: string; tags: string[]; category: string }>,
    briefHint?: BriefHint,
): Promise<{ palette: DesignStyleGuide; reasoning: string; needsBackgroundImage: boolean; backgroundImagePrompt: string; designStrategy: DesignStrategy; templateId: string | null }> {
    try {
        // ★ v744: Inject brief metadata into user message (skip re-analysis)
        const moodLine = briefHint ? `\nPre-analyzed: mood="${briefHint.mood}", industry="${briefHint.industry}", slots=[${briefHint.slots.join(',')}]` : '';
        const catalogText = templateCatalog && templateCatalog.length > 0
            ? `\n\nTEMPLATE CATALOG (pick best templateId):\n${templateCatalog.map(t => `- id:"${t.id}" name:"${t.name}" tags:[${t.tags.join(',')}]`).join('\n')}`
            : '';

        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 500, // ★ v744: 800→500 (no strategy fields needed)
            temperature: 0.4,
            system: [{
                type: 'text' as const,
                text: COLOR_SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' as const }, // ★ P4: Prompt Caching
            }],
            messages: [{
                role: 'user' as const,
                content: `Design prompt: "${prompt}"${moodLine}

Return JSON:
{
  "name": "short palette name",
  "background": "#hex", "surface": "#hex",
  "foreground": "#hex", "secondary": "#hex",
  "accent": "#hex", "accentForeground": "#hex",
  "gradientStart": "#hex", "gradientEnd": "#hex", "gradientAngle": number,
  "fontPrimary": "headline font hint", "fontSecondary": "body font hint",
  "radius": 0-12,
  "reasoning": "1 sentence",
  "needsBackgroundImage": true/false,
  "backgroundImagePrompt": "image prompt or empty",
  "templateId": "id-or-null"
}${catalogText}`,
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

        // ★ v744: Font selection — codified, AI is just a hint
        const fontPair = selectFontPair(
            briefHint?.mood ?? 'general',
            briefHint?.industry ?? 'general',
            { primary: parsed.fontPrimary, secondary: parsed.fontSecondary },
        );

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
                primaryFont: fontPair.primary,
                secondaryFont: fontPair.secondary,
            },
            radius: parsed.radius ?? 6,
        };
        console.log(`[ColorPalette] Fonts: ${fontPair.primary} / ${fontPair.secondary} (mood=${briefHint?.mood}, AI hint=${parsed.fontPrimary}/${parsed.fontSecondary})`);

        // ★ v744: Design strategy = DETERMINISTIC (code decides, not AI)
        // overlayApproach and imageFilters depend on whether there's a bg image,
        // which we don't know yet — use sensible defaults that downstream can override.
        const mood = briefHint?.mood ?? 'general';
        const ctaStyle = (['elegant', 'luxurious', 'minimal'].includes(mood) ? 'outlined'
            : ['bold', 'intense', 'urgent'].includes(mood) ? 'solid'
            : ['minimal', 'clean'].includes(mood) ? 'text-arrow'
            : 'pill') as import('@/services/designStrategy').CtaStyle;
        const designStrategy: DesignStrategy = {
            ...DEFAULT_STRATEGY,
            ctaStyle,
            overlayApproach: 'text-shadow-only', // ★ default; processTemplateElements overrides per bgResult
            textHierarchy: {
                headlineOpacity: 1.0,
                subheadlineOpacity: mood === 'minimal' ? 0.65 : 0.75,
                tagIsAccent: true,
            },
        };
        console.log(`[ColorPalette] Strategy: cta=${ctaStyle} (mood=${mood}), template=${parsed.templateId ?? 'auto'}`);

        // ★ v734: Validate AI-chosen template ID against catalog
        let aiTemplateId: string | null = null;
        if (parsed.templateId && templateCatalog) {
            const found = templateCatalog.find(t => t.id === parsed.templateId);
            if (found) {
                aiTemplateId = parsed.templateId;
                console.log(`[ColorPalette] AI selected template: "${found.name}" (${found.id})`);
            } else {
                console.warn(`[ColorPalette] AI returned unknown templateId: ${parsed.templateId}`);
            }
        }

        return { palette, reasoning: parsed.reasoning || '', needsBackgroundImage: !!parsed.needsBackgroundImage, backgroundImagePrompt: parsed.backgroundImagePrompt || '', designStrategy, templateId: aiTemplateId };
    } catch (err) {
        console.warn('[ColorPalette] AI generation failed, using default:', err);
        const fontPair = selectFontPair(briefHint?.mood ?? 'general', briefHint?.industry ?? 'general');
        const fallback = { ...DEFAULT_PALETTE, typography: { ...DEFAULT_PALETTE.typography, primaryFont: fontPair.primary, secondaryFont: fontPair.secondary } };
        return { palette: fallback, reasoning: 'Using default palette (AI unavailable)', needsBackgroundImage: false, backgroundImagePrompt: '', designStrategy: { ...DEFAULT_STRATEGY }, templateId: null };
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
