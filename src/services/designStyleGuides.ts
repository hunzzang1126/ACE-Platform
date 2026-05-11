// ─────────────────────────────────────────────────
// designStyleGuides.ts — AI-Driven Color Intelligence
// ─────────────────────────────────────────────────
// Colors are NO LONGER hardcoded palettes.
// ★ v713: AI is now a Creative Director — determines design STRATEGY
// (overlay approach, image filters, CTA style, text hierarchy)
// alongside the color palette.
// AI determines the brand-appropriate color palette
// based on prompt context (brand + industry + mood).
//
// "Nike" → red/black/white (AI knows the brand)
// "Coca-Cola" → red/white
// "luxury watch" → gold/navy
// "make it green" → green palette
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { parseDesignStrategy, DEFAULT_STRATEGY } from '@/services/designStrategy';
import type { DesignStrategy } from '@/services/designStrategy';

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
Given a user's design prompt, determine the PERFECT color palette, typography, and VISUAL STRATEGY.

RULES:
1. If the prompt mentions a specific COLOR ("red", "blue", "make it green", "파란색", etc.), that color MUST be the accent/CTA color. User-specified colors ALWAYS override brand defaults.
2. If the prompt mentions a KNOWN BRAND (Nike, Coca-Cola, Apple, Google, etc.) AND the user did NOT specify a color, use that brand's signature colors.
3. If no brand or color is mentioned, infer the best palette from the INDUSTRY/MOOD:
   - Finance/luxury → deep navy + gold
   - Tech/SaaS → dark bg + electric blue or cyan
   - Health/medical → light bg + teal
   - Food/lifestyle → warm neutrals + coral
   - Sport/energy → dark bg + bold red/orange
   - Fashion/beauty → elegant dark or warm neutral
4. ALWAYS ensure 4.5:1+ contrast between text and background.
5. Dark backgrounds (< #333) should have white/light text. Light backgrounds (> #ccc) should have dark text.
6. FONT SELECTION — choose fonts that match the design's mood. Use DIFFERENT fonts for headline vs body.
   Available Google Fonts (pick from this list):
   Sans-serif: Inter, DM Sans, Space Grotesk, Outfit, Sora, Montserrat, Poppins, Roboto, Oswald, Roboto Condensed, Raleway, Nunito
   Serif: Playfair Display, DM Serif Display, Cormorant Garamond, Libre Baskerville, Fraunces, Lora
   Display: Bebas Neue, Anton
   RULES:
   - fontPrimary (headlines) and fontSecondary (body) MUST be different fonts
   - Choose fonts that feel right for the mood — trust your judgment
   - NEVER return "Inter" for both — that's boring and generic
7. Set needsBackgroundImage to true if the prompt describes a physical scene, product, or person. Set to false for abstract/digital concepts. This is a HINT — code may override your decision.
   If true, write a short backgroundImagePrompt describing the ideal photo. When people/professions are mentioned, describe the person (appearance, pose, clothing, environment).
8. DESIGN STRATEGY — You are the Creative Director. Decide HOW the design should look:
   a. overlayApproach: How to make text readable over background images. Options:
      - "gradient-scrim": Subtle gradient from transparent to background color (NOT black!). Best for hero images.
      - "text-shadow-only": No overlay rectangle. Text gets strong shadows. Best when image must stay vivid.
      - "color-tint": Semi-transparent brand color wash. Gives brand cohesion.
      - "full-dim": Full canvas darkening. Only for moody/cinematic themes.
      - "none": No treatment. Only when background is already dark/simple.
   b. imageFilters: { brightness: -0.3 to 0, blur: 0 to 3 }
      - If product/person is the hero → brightness: -0.1, blur: 0 (keep sharp!)
      - If image is decorative/atmospheric → brightness: -0.2, blur: 1-2
   c. ctaStyle: "pill" (default), "outlined" (elegant), "solid" (bold), "text-arrow" (minimal), "rounded-square" (professional)
   d. textHierarchy: { headlineOpacity: 1.0, subheadlineOpacity: 0.65-0.85, tagIsAccent: true/false }
      - tagIsAccent=true: tag text uses accent color (premium feel)
      - subheadlineOpacity < 1.0: creates visual depth between headline and sub
9. Return ONLY the JSON object, nothing else.
10. templateId: You will be given a TEMPLATE CATALOG with available templates.
   Choose the templateId that best fits the content mood, industry, and visual impact.
   Pick based on the template's name, description, tags, and category — NOT randomly.
   If no template catalog is provided, set templateId to null.`;

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
    // ★ v713: Design strategy fields
    overlayApproach?: string;
    imageFilters?: { brightness?: number; blur?: number };
    ctaStyle?: string;
    textHierarchy?: { headlineOpacity?: number; subheadlineOpacity?: number; tagIsAccent?: boolean };
    // ★ v734: AI template selection from Supabase catalog
    templateId?: string | null;
}

/**
 * Ask AI to generate a brand-aware color palette from the prompt.
 * Falls back to DEFAULT_PALETTE on error.
 */
export async function generateColorPalette(
    prompt: string,
    signal: AbortSignal,
    templateCatalog?: Array<{ id: string; name: string; description: string; tags: string[]; category: string }>,
): Promise<{ palette: DesignStyleGuide; reasoning: string; needsBackgroundImage: boolean; backgroundImagePrompt: string; designStrategy: DesignStrategy; templateId: string | null }> {
    try {
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 800,
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
  "reasoning": "1 sentence explaining why these colors",
  "needsBackgroundImage": true/false,
  "backgroundImagePrompt": "if needsBackgroundImage is true, a short image-gen prompt. If false, empty string.",
  "overlayApproach": "gradient-scrim"|"text-shadow-only"|"color-tint"|"full-dim"|"none",
  "imageFilters": { "brightness": -0.15, "blur": 0 },
  "ctaStyle": "pill"|"outlined"|"solid"|"text-arrow"|"rounded-square",
  "textHierarchy": { "headlineOpacity": 1.0, "subheadlineOpacity": 0.75, "tagIsAccent": true },
  "templateId": "id-from-catalog-or-null"
}${templateCatalog && templateCatalog.length > 0 ? `\n\nTEMPLATE CATALOG (pick the best templateId):\n${templateCatalog.map(t => `- id:"${t.id}" name:"${t.name}" desc:"${t.description}" tags:[${t.tags.join(',')}] cat:${t.category}`).join('\n')}` : ''}`,
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
                secondaryFont: parsed.fontSecondary || 'DM Sans',
            },
            radius: parsed.radius ?? 6,
        };

        // ★ v732: Font diversity guard — same font for both = boring, generic look
        if (palette.typography.primaryFont === palette.typography.secondaryFont) {
            const FONT_PAIRS: Record<string, string> = {
                'Inter': 'DM Sans', 'DM Sans': 'Inter', 'Poppins': 'DM Sans',
                'Roboto': 'Space Grotesk', 'Montserrat': 'DM Sans', 'Outfit': 'Inter',
                'Playfair Display': 'DM Sans', 'DM Serif Display': 'Inter',
                'Bebas Neue': 'DM Sans', 'Anton': 'Inter', 'Oswald': 'DM Sans',
                'Sora': 'Inter', 'Space Grotesk': 'DM Sans', 'Nunito': 'Space Grotesk',
                'Raleway': 'DM Sans', 'Cormorant Garamond': 'Inter', 'Lora': 'DM Sans',
            };
            palette.typography.secondaryFont = FONT_PAIRS[palette.typography.primaryFont] || 'DM Sans';
            console.log(`[ColorPalette] Font diversity guard: primary="${palette.typography.primaryFont}" → secondary="${palette.typography.secondaryFont}"`);
        }

        // ★ v713: Parse design strategy from AI response
        const designStrategy = parseDesignStrategy({
            overlayApproach: parsed.overlayApproach,
            imageFilters: parsed.imageFilters,
            ctaStyle: parsed.ctaStyle,
            textHierarchy: parsed.textHierarchy,
        });
        console.log(`[ColorPalette] Design strategy: overlay=${designStrategy.overlayApproach}, cta=${designStrategy.ctaStyle}, template=${parsed.templateId ?? 'auto'}`);

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
        return { palette: { ...DEFAULT_PALETTE }, reasoning: 'Using default palette (AI unavailable)', needsBackgroundImage: false, backgroundImagePrompt: '', designStrategy: { ...DEFAULT_STRATEGY }, templateId: null };
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
