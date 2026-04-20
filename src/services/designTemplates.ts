// ─────────────────────────────────────────────────
// designTemplates.ts — Template Types + Content Prompt
// ─────────────────────────────────────────────────
// ★ All hardcoded layout templates REMOVED.
// Templates are now 100% cloud-sourced (Supabase).
// This file only exports types and prompt builder.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

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
