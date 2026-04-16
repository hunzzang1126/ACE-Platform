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

    return `You are a world-class creative director. Generate copy for a ${canvasW}x${canvasH}px design.

Brief: "${userPrompt}"
Template: ${templateName}
Language: ${language} (if prompt is in a different language, use THAT language)

Return EXACTLY this JSON. Set any field to "" if it does NOT fit the design intent:
{
  "headline": "...",
  "subheadline": "...",
  "cta": "...",
  "tag": "..."
}

DECISION RULES — YOU DECIDE what fields are needed:
- headline: ALWAYS required. ${headlineLimit}. Title Case. Bold, punchy, memorable.
- subheadline: Include ONLY if there's supporting info (date, location, description).
  If the prompt mentions a date/time → put it here (e.g. "5월 15일 오후 3시").
  If the prompt mentions a location → include it.
  If headline is self-explanatory or canvas is small → set to "".
- cta: Include ONLY for commercial/advertising designs (shop, buy, sign up, book, register).
  Events, announcements, informational posters → NO CTA (set to "").
  Educational, community, internal notices → NO CTA.
  If unsure → NO CTA. CTA is the exception, not the rule.
- tag: Short label ONLY if a natural category fits ("NEW", "SALE", "D-DAY"). Otherwise "".

EXTRACT FROM PROMPT:
- Dates (5월 15일, May 15, 2026-05-15) → subheadline
- Locations → subheadline  
- Times (오후 3시, 3:00 PM) → subheadline
- Prices/Discounts → tag or subheadline

PROHIBITIONS:
- NEVER output font names, field names, CSS, placeholder text
- NEVER add CTA for non-commercial designs
- ALL text must be real, human-readable copy in the prompt's language
- Return ONLY JSON. No explanation.`;
}
