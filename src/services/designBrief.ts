// ─────────────────────────────────────────────────
// designBrief.ts — Content-First Design Brief Generator
// ─────────────────────────────────────────────────
// ★ v743: The HARNESS. One AI call → content + structure decision.
// Chain-of-Thought: AI analyzes FIRST, writes copy SECOND.
// Validation loop: checks quality, retries once on failure.
// Golden examples: industry-relevant few-shot injection.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { selectExamples, formatExamplesForPrompt, detectIndustry, detectMood } from '@/services/copyExamples';
import type { ContentSlot } from '@/services/copyExamples';

// ── Types ────────────────────────────────────────

export interface DesignBrief {
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
    slots: ContentSlot[];
    headlineLines: number;
    textDensity: 'minimal' | 'standard' | 'dense';
    mood: string;
    industry: string;
    reasoning: string;
}

// ── Prompt Builder ───────────────────────────────

function buildBriefPrompt(
    userPrompt: string, canvasW: number, canvasH: number,
    language: string, brandContext?: string,
): string {
    const isWide = canvasW > canvasH * 2;
    const isTall = canvasH > canvasW * 2;
    const isSmall = canvasW < 200 || canvasH < 200;
    const examples = selectExamples(userPrompt, 4);
    const examplesText = formatExamplesForPrompt(examples);

    const headlineGuide = isWide
        ? '3-5 words, single line preferred'
        : isTall ? '2-4 words per line, 2-3 lines' : '2-5 words per line, 1-2 lines';
    const subGuide = isSmall
        ? 'EMPTY (canvas too small for subheadline)'
        : '1-2 sentences, max 15 words. Must add NEW info not in headline.';

    return `You are a world-class creative director creating HIGH-IMPACT advertising copy.
Design brief: "${userPrompt}"
Canvas: ${canvasW}x${canvasH}px
Language: ${language} (if the brief is in a different language, use THAT language for ALL fields)
${brandContext ? `\nBrand context:\n${brandContext}\n` : ''}
${examplesText}

═══ YOUR TASK ═══

STEP 1 — ANALYZE (write your reasoning in the "reasoning" field):
Think about: industry, target audience, emotional hook, tone, and which content SLOTS this design actually needs.
- Does it need a subheadline? Only if there's supporting info (dates, features, benefits).
  An impactful headline alone is often MORE powerful than headline + weak sub.
- Does it need a CTA? Only for commercial/action designs. Informational → no CTA.
- Does it need a tag/badge? Only if there's a natural label (NEW, SALE, date, category).

STEP 2 — GENERATE copy based on your analysis.

Return EXACTLY this JSON:
{
  "headline": "compelling ad headline, ${headlineGuide}",
  "subheadline": "supporting detail OR empty string if not needed. ${subGuide}",
  "cta": "action verb phrase OR empty string if not needed (max 3 words)",
  "tag": "short badge label OR empty string (max 2 words, ALL CAPS)",
  "slots": ["headline", ...only include slots that have non-empty content],
  "headlineLines": 1-3,
  "textDensity": "minimal|standard|dense",
  "mood": "one word",
  "industry": "detected industry",
  "reasoning": "1-2 sentences: your analysis from Step 1"
}

COPYWRITING RULES:
- headline: ALWAYS required. Must be COMPELLING — a creative hook, not a description.
  GOOD: "Discover Mallorca", "Experience the Future", "미래를 만나다"
  BAD: "text about Mallorca", "About our product", "iPhone 17" (just a label)
  ★ Use POWER WORDS: Discover, Unlock, Transform, Experience, Elevate
  ★ NEVER start with: "text about", "about", "regarding", "a design for", "an ad for"
- subheadline: If included, MUST add NEW information not in headline.
  If headline = emotion → sub = fact (date, feature, price)
  If headline = fact → sub = emotion (benefit, feeling)
  ★ If headline is self-sufficient, set subheadline to "" and REMOVE from slots.
- cta: REAL verb phrase for commercial designs. "Shop Now", "Get Started", "지금 주문하기"
  BAD: "button", "click", "CTA", "클릭" — these are UI terms, NOT ad copy.
  Events/announcements → set to "" and REMOVE from slots.
- tag: Short badge ONLY if natural. "NEW", "SALE", "D-DAY", "한정판". Otherwise "".
- slots: MUST exactly match which fields have non-empty content.

EXTRACT FROM PROMPT:
- Dates → subheadline   - Locations → subheadline
- Prices/Discounts → tag or subheadline

ABSOLUTE PROHIBITIONS:
- NEVER output font names, CSS, placeholder text, or UI terminology as content
- NEVER include visual instructions as text ("in gold", "with gradient", "neon glow")
- Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
}

// ── User Text Extraction ─────────────────────────
// If user explicitly provides copy, use it directly.

function extractUserText(prompt: string): Partial<DesignBrief> {
    const result: Partial<DesignBrief> = {};
    const fieldMap: [RegExp, keyof DesignBrief][] = [
        [/headline[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/headline[은는=:\s]+([^,.\n]+)/i, 'headline'],
        [/해드라인[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/헤드라인[은는=:\s]+["']([^"']+)["']/i, 'headline'],
        [/subheadline[은는=:\s]+["']([^"']+)["']/i, 'subheadline'],
        [/subheadline[은는=:\s]+([^,.\n]+)/i, 'subheadline'],
        [/cta[은는=:\s]+["']([^"']+)["']/i, 'cta'],
        [/cta[은는=:\s]+([^,.\n]+)/i, 'cta'],
        [/tag[은는=:\s]+["']([^"']+)["']/i, 'tag'],
    ];
    for (const [regex, field] of fieldMap) {
        if (result[field]) continue;
        const m = prompt.match(regex);
        if (m?.[1]) (result as any)[field] = m[1].trim();
    }
    // Korean reverse pattern: "Adventure Awaits" 라는 헤드라인
    const qm = prompt.match(/["']([^"']+)["']\s*(?:라는|이라는)?\s*(?:해드라인|헤드라인|headline)/i);
    if (qm?.[1] && !result.headline) result.headline = qm[1].trim();
    return result;
}

// ── Validation ───────────────────────────────────

const JUNK_PATTERN = /^(text|headline|subheadline|cta|tag|label|button|font|color|gradient|background|image)/i;

function wordOverlap(a: string, b: string): number {
    if (!a || !b) return 0;
    const wa = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wb = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wa.size === 0 || wb.size === 0) return 0;
    let overlap = 0;
    for (const w of wa) { if (wb.has(w)) overlap++; }
    return overlap / Math.min(wa.size, wb.size);
}

function validateBrief(brief: DesignBrief): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Headline must exist and be real copy
    if (!brief.headline || brief.headline.length < 3) issues.push('headline too short');
    if (brief.headline.length > 60) issues.push('headline too long (max 60 chars)');
    if (JUNK_PATTERN.test(brief.headline)) issues.push('headline is a UI term, not ad copy');

    // Slot consistency: if content exists, slot must include it
    if (brief.subheadline && !brief.slots.includes('subheadline')) {
        brief.slots.push('subheadline'); // auto-fix
    }
    if (!brief.subheadline && brief.slots.includes('subheadline')) {
        brief.slots = brief.slots.filter(s => s !== 'subheadline'); // auto-fix
    }
    if (brief.cta && !brief.slots.includes('cta')) brief.slots.push('cta');
    if (!brief.cta && brief.slots.includes('cta')) brief.slots = brief.slots.filter(s => s !== 'cta');
    if (brief.tag && !brief.slots.includes('tag')) brief.slots.push('tag');
    if (!brief.tag && brief.slots.includes('tag')) brief.slots = brief.slots.filter(s => s !== 'tag');

    // Headline-subheadline redundancy
    if (brief.subheadline && wordOverlap(brief.headline, brief.subheadline) > 0.5) {
        issues.push('subheadline repeats headline — must add NEW information');
    }

    // CTA junk check
    if (brief.cta && /^(button|click|cta|label|클릭|버튼)$/i.test(brief.cta)) {
        issues.push('CTA is a UI term, not ad copy');
    }

    // Ensure slots always has headline
    if (!brief.slots.includes('headline')) brief.slots.unshift('headline');

    return { valid: issues.length === 0, issues };
}

// ── Sanitize AI output ───────────────────────────

function sanitizeBrief(raw: Record<string, unknown>): DesignBrief {
    const clean = (val: unknown): string => {
        const s = String(val ?? '').trim();
        return JUNK_PATTERN.test(s) ? '' : s;
    };
    const headline = clean(raw.headline) || 'Get Started Today';
    const subheadline = clean(raw.subheadline);
    const cta = clean(raw.cta);
    const tag = String(raw.tag ?? '').trim().toUpperCase().slice(0, 20);
    const cleanTag = JUNK_PATTERN.test(tag) ? '' : tag;

    // Build slots from what actually has content
    const slots: ContentSlot[] = ['headline'];
    if (subheadline) slots.push('subheadline');
    if (cta) slots.push('cta');
    if (cleanTag) slots.push('tag');

    // Parse or default structural metadata
    const rawSlots = Array.isArray(raw.slots) ? raw.slots.filter(
        (s): s is ContentSlot => ['headline', 'subheadline', 'cta', 'tag'].includes(s as string)
    ) : slots;

    return {
        headline, subheadline, cta, tag: cleanTag,
        slots: rawSlots.length > 0 ? rawSlots : slots,
        headlineLines: Math.max(1, Math.min(4, Number(raw.headlineLines) || 1)),
        textDensity: (['minimal', 'standard', 'dense'].includes(raw.textDensity as string)
            ? raw.textDensity as 'minimal' | 'standard' | 'dense' : 'standard'),
        mood: String(raw.mood ?? 'general').toLowerCase(),
        industry: String(raw.industry ?? detectIndustry(headline)).toLowerCase(),
        reasoning: String(raw.reasoning ?? ''),
    };
}

// ── Main API ─────────────────────────────────────

/**
 * Generate a Content-First design brief.
 * 1. Check for user-provided explicit text
 * 2. CoT prompt + golden examples → Claude
 * 3. Validate + self-correct (1 retry)
 */
export async function generateDesignBrief(
    userPrompt: string, canvasW: number, canvasH: number,
    language: string, signal: AbortSignal,
    brandContext?: string,
): Promise<DesignBrief> {
    // ── Fast path: user explicitly provided text ──
    const userProvided = extractUserText(userPrompt);
    if (userProvided.headline && userProvided.cta) {
        const slots: ContentSlot[] = ['headline'];
        if (userProvided.subheadline) slots.push('subheadline');
        if (userProvided.cta) slots.push('cta');
        if (userProvided.tag) slots.push('tag');
        return {
            headline: userProvided.headline,
            subheadline: userProvided.subheadline ?? '',
            cta: userProvided.cta ?? '',
            tag: userProvided.tag ?? '',
            slots,
            headlineLines: Math.ceil(userProvided.headline.length / 20),
            textDensity: 'standard',
            mood: detectMood(userPrompt)[0] ?? 'general',
            industry: detectIndustry(userPrompt),
            reasoning: 'User-provided text (used as-is)',
        };
    }

    // ── AI generation with CoT + validation ──
    let prompt = buildBriefPrompt(userPrompt, canvasW, canvasH, language, brandContext);
    if (userProvided.headline) {
        prompt += `\n\nCRITICAL: The user wants this headline EXACTLY: "${userProvided.headline}". Do NOT change it.`;
    }

    const MAX_ATTEMPTS = 2;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 400,
            temperature: attempt === 0 ? 0.6 : 0.4, // Lower temp on retry
            system: 'You are a professional creative director. Return ONLY valid JSON.',
            messages: [{ role: 'user' as const, content: prompt }],
        };

        try {
            const data = await callAnthropicApi(body, signal) as {
                content: Array<{ type: string; text?: string }>;
            };
            const textBlock = data.content.find(c => c.type === 'text');
            if (!textBlock?.text) throw new Error('No content generated');

            let raw = textBlock.text.trim();
            if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

            const parsed = JSON.parse(raw);
            const brief = sanitizeBrief({
                ...parsed,
                headline: userProvided.headline || parsed.headline,
                subheadline: userProvided.subheadline ?? parsed.subheadline,
                cta: userProvided.cta || parsed.cta,
                tag: userProvided.tag || parsed.tag,
            });

            const validation = validateBrief(brief);
            if (validation.valid || attempt === MAX_ATTEMPTS - 1) {
                if (!validation.valid) {
                    console.warn(`[DesignBrief] Validation issues (using anyway): ${validation.issues.join(', ')}`);
                }
                console.log(`[DesignBrief] Generated: slots=[${brief.slots}] mood=${brief.mood} industry=${brief.industry}`);
                return brief;
            }

            // Self-correction: inject feedback into prompt
            console.warn(`[DesignBrief] Validation failed, retrying: ${validation.issues.join(', ')}`);
            prompt += `\n\nYour previous output had issues:\n${validation.issues.map(i => `- ${i}`).join('\n')}\nFix these specific problems.`;
        } catch (err) {
            if (attempt === MAX_ATTEMPTS - 1) {
                console.error('[DesignBrief] All attempts failed:', err);
                // Fallback: minimal brief
                return {
                    headline: userProvided.headline || 'Get Started Today',
                    subheadline: userProvided.subheadline || '',
                    cta: userProvided.cta || '',
                    tag: userProvided.tag || '',
                    slots: ['headline', ...(userProvided.cta ? ['cta' as const] : [])],
                    headlineLines: 1,
                    textDensity: 'minimal',
                    mood: 'general',
                    industry: detectIndustry(userPrompt),
                    reasoning: 'Fallback (AI generation failed)',
                };
            }
        }
    }

    // TypeScript exhaustiveness — should never reach here
    throw new Error('Unreachable');
}
