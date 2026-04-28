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

    return `You are a world-class creative director writing HIGH-IMPACT advertising copy.
Generate persuasive, professional ad copy for a ${canvasW}x${canvasH}px design.

Brief: "${userPrompt}"
Template: ${templateName}
Language: ${language} (if prompt is in a different language, use THAT language for ALL fields)

Return EXACTLY this JSON. Set any field to "" if it does NOT fit the design intent:
{
  "headline": "...",
  "subheadline": "...",
  "cta": "...",
  "tag": "..."
}

COPYWRITING RULES:
- headline: ALWAYS required. ${headlineLimit}. Must be COMPELLING advertising copy.
  NOT just the product name — add a benefit, emotion, or hook.
  GOOD: "iPhone 17 — 혁신의 새로운 기준", "Experience the Future", "미래를 만나다"
  BAD: "iPhone 17", "아이폰 17", "제품 소개" (these are labels, not headlines)
- subheadline: Supporting detail — features, benefits, dates, locations. ${subLimit}.
  If headline is self-explanatory or canvas is small → set to "".
- cta: A REAL call-to-action verb phrase for commercial/advertising designs.
  GOOD examples: "지금 주문하기", "자세히 보기", "Shop Now", "Get Yours", "Pre-Order Today"
  BAD: "버튼", "button", "click", "CTA", "클릭" — these are UI terms, NOT ad copy.
  Events/announcements/informational → NO CTA (set to "").
- tag: Short badge ONLY if natural ("NEW", "SALE", "D-DAY", "한정판"). Otherwise "".

EXTRACT FROM PROMPT:
- Dates (5월 15일, May 15) → subheadline
- Locations → subheadline  
- Prices/Discounts → tag or subheadline

ABSOLUTE PROHIBITIONS:
- NEVER output font names, field names, CSS, placeholder text, or UI terminology
- NEVER use "버튼", "button", "텍스트", "헤드라인" as actual copy
- NEVER just echo the product name as the headline — you MUST add a creative hook
- NEVER include color/visual instructions as text content (e.g. "in gold", "in yellow", "with gradient", "neon glow")
  Colors and visual styling are handled by a SEPARATE system. Your job is WORDS ONLY.
- ALL text must be real, persuasive, human-readable advertising copy
- Return ONLY valid JSON. No markdown, no explanation.`;
}
