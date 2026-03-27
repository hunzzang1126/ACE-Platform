// ─────────────────────────────────────────────────
// designTemplates.ts — Template Types + Selector
// ─────────────────────────────────────────────────
// Layout definitions extracted to:
//   templateLayoutsA.ts (layouts 1-6)
//   templateLayoutsB.ts (layouts 7-12)
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

// ── Re-export layout modules for backward compat ──
import { centeredStack, leftAlignedCard, boldHeadline, splitHorizontal, diagonalSplit, topDownCascade } from './templateLayoutsA';
import { rightAligned, minimalClean, fullBleedHero, badgeFocus, horizontalStrip, tower } from './templateLayoutsB';

// ── Types ────────────────────────────────────────

export interface GeneratedContent {
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
}

export interface DesignTemplate {
    id: string;
    name: string;
    description: string;
    aspectRatios: ('wide' | 'landscape' | 'square' | 'portrait' | 'any')[];
    build: (canvasW: number, canvasH: number, guide: DesignStyleGuide, content: GeneratedContent) => RenderElement[];
}

// ── Aspect ratio classification ──────────────────

type AspectCategory = 'wide' | 'landscape' | 'square' | 'portrait';

function classifyAspect(w: number, h: number): AspectCategory {
    const ratio = w / h;
    if (ratio > 2.5) return 'wide';
    if (ratio > 1.3) return 'landscape';
    if (ratio >= 0.7) return 'square';
    return 'portrait';
}

// ── All Templates ────────────────────────────────

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    centeredStack, leftAlignedCard, boldHeadline, splitHorizontal,
    diagonalSplit, topDownCascade, rightAligned, minimalClean,
    fullBleedHero, badgeFocus, horizontalStrip, tower,
];

// ── Selector ─────────────────────────────────────

let lastTemplateIdx = -1;

export function selectTemplate(canvasW: number, canvasH: number): DesignTemplate | null {
    const aspect = classifyAspect(canvasW, canvasH);
    const compatible = DESIGN_TEMPLATES.filter(t =>
        t.aspectRatios.includes(aspect) || t.aspectRatios.includes('any'),
    );
    if (compatible.length === 0) return DESIGN_TEMPLATES[0] ?? null;
    lastTemplateIdx = (lastTemplateIdx + 1) % compatible.length;
    return compatible[lastTemplateIdx]!;
}

// ── Content Prompt Builder ───────────────────────

export function buildContentPrompt(userPrompt: string, canvasW: number, canvasH: number, templateName: string, language: string = 'English'): string {
    const isWide = canvasW > canvasH * 2;
    const isTall = canvasH > canvasW * 2;
    const isSmall = canvasW < 200 || canvasH < 200;

    const headlineLimit = isWide ? '3-5 words, single line' : isTall ? '2-4 words per line, 2-3 lines' : '2-5 words per line, 1-2 lines';
    const subLimit = isSmall ? 'empty string (canvas too small)' : '1-2 sentences, max 15 words total';

    return `You are a world-class ad copywriter. Generate copy for a ${canvasW}x${canvasH}px creative.

Brief: "${userPrompt}"
Template: ${templateName}
Language: ${language} (if prompt is in a different language, use THAT language)

Return EXACTLY this JSON structure with your generated copy as the values:
{
  "headline": "YOUR HEADLINE HERE",
  "subheadline": "YOUR SUBHEADLINE HERE",
  "cta": "YOUR CTA HERE",
  "tag": "YOUR TAG HERE"
}

FIELD RULES:
- headline: ${headlineLimit}. MUST be Title Case (capitalize first letter of each word). Bold, punchy, memorable. No period at end.
  GOOD: "Discover Premium Wellness", "Transform Your Health Today", "Pure Natural Ingredients"
  BAD: "about health products" (too generic, lowercase), "text" (not real copy)
- subheadline: ${subLimit}. Sentence case. Supports the headline with descriptive marketing copy. Set to "" if headline is self-explanatory or canvas is small.
  GOOD: "Clinically proven formulas for your daily routine", "Free shipping on orders over $50"
  BAD: "text" (placeholder), "subheadline" (field name), "" when there's room for good copy
- cta: 1-3 word call-to-action verb phrase. Title Case.
  GOOD: "Shop Now", "Learn More", "Get Started", "Try Free", "Explore", "Book Now", "Discover"
  BAD: "Inter" (font name!), "Click Here" (generic), "Button" (not copy)
- tag: 1-2 word label, usually uppercase. Examples: "NEW", "SALE", "LIMITED", "PREMIUM", "2026". Set to "" if no natural category fits.
  GOOD: "NEW ARRIVAL", "BEST SELLER", "LIMITED EDITION"
  BAD: "text" (placeholder), "tag" (field name)

ABSOLUTE PROHIBITIONS:
- NEVER output font names (Inter, Roboto, etc.) as copy text
- NEVER output field names (headline, subheadline, cta, tag) as copy text
- NEVER output CSS properties, layout terms, or technical terms as copy text
- NEVER output placeholder text like "text", "lorem ipsum", "your text here"
- ALL output must be real, human-readable advertising copy that relates to the brief

CRITICAL:
- Write REAL ad copy relevant to the brief. The consumer will read this text.
- Return ONLY the JSON object. No explanation, no markdown fences.`;
}
