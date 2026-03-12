// ─────────────────────────────────────────────────
// autoDesignLoop.ts — Vision Feedback Loop
// ─────────────────────────────────────────────────
// After initial layout is placed on canvas:
//
//  1. engine.get_screenshot() → artboard PNG
//  2. Claude Vision analyzes for overlap/readability/hierarchy
//  3. Returns VisionFix[] with precise pixel corrections
//  4. Apply fixes via engine (set_position, set_size, set_font_size, set_fill_hex)
//  5. Re-screenshot and re-score (up to MAX_PASSES)
//
// Vision AI sees the ACTUAL screenshot — it KNOWS where overlaps are.
// Fixes are applied with bounds-checking safety net.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Types ──────────────────────────────────────────

export interface VisionFix {
    /** Exact layer __aceName */
    elementName: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fontSize?: number;
    fill?: string;  // hex #rrggbb
}

export interface VisionLoopResult {
    finalScore: number;
    passes: number;
    fixesApplied: number;
    /** Remaining suggestions after fix attempts */
    suggestions: VisionFix[];
    reasoning: string;
}

// ★ FIX-APPLY MODE: 2 passes max, apply fixes from Vision AI.
// Vision AI sees the actual screenshot and KNOWS where overlaps are.
// After applying, we bounds-check each fix to prevent off-canvas elements.
const MAX_PASSES = 2;
const PASS_SCORE = 80;

// ── Vision review prompt ──────────────────────────

function buildReviewPrompt(canvasW: number, canvasH: number, elementNames: string[]): string {
    const nameList = elementNames.map(n => `  - "${n}"`).join('\n');
    return `You are a professional creative designer doing a strict quality review.

Canvas: ${canvasW}×${canvasH}px
Elements present:
${nameList}

Check for these issues and DEDUCT points accordingly:
1. TEXT READABILITY — ALL text must be clearly readable against its background.
   Text on a busy image without contrast overlay = -25 points (CRITICAL)
2. OVERLAP — ANY text overlapping another text element = -30 points per instance (CRITICAL)
   Look VERY carefully: if ANY part of one text element's characters touch or overlap
   with characters from another text element, this is overlap. Even partial overlap counts.
   If headline text and subheadline text share the same vertical space, that IS overlap.
   A design with ANY text-on-text overlap can NEVER score above 45.
3. TEXT CLIPPED — text going outside canvas bounds = -15 points
4. HIERARCHY — headline must be largest/most prominent. If not = -10 points
5. CTA — CTA button must be clearly visible with strong contrast = -10 if weak
6. ALIGNMENT — if elements should be centered but aren't = -15 points
7. FONT SIZE — any text smaller than 12px on banners = -10 points
8. SPACING — elements crowded with < 8px gap = -10 points

Scoring rules:
- Start at 100, subtract for each issue found
- ANY text overlap = AUTOMATIC cap at 45 (no exceptions)
- Score above 80 ONLY if ALL text is clearly readable AND no overlaps exist
- Score above 90 ONLY if ALL elements are properly aligned and spaced
- Be EXTREMELY STRICT about overlap — look at every text element pair carefully

IMPORTANT: For each fix, provide the EXACT pixel coordinates that would resolve the issue.
Keep all values within canvas bounds: x 0-${canvasW}, y 0-${canvasH}.

Return JSON only:
{
  "score": <0-100>,
  "fixes": [
    {
      "elementName": "<exact name from list>",
      "x": <number or omit>,
      "y": <number or omit>,
      "w": <number or omit>,
      "h": <number or omit>,
      "fontSize": <number or omit>,
      "fill": "<#rrggbb or omit>"
    }
  ],
  "reasoning": "<1-2 sentences>"
}

Rules for fixes:
- Keep all positions within canvas bounds (0 to ${canvasW} wide, 0 to ${canvasH} tall)
- Only include elementName if element exists in the list above
- Only provide fixes for actual problems found
- If score >= ${PASS_SCORE}, return empty fixes array

CRITICAL FIX STRATEGY for OVERLAPPING TEXT:
- If two text elements overlap: REDUCE fontSize of both (not just reposition)
- Headline wrapping to too many lines? Reduce headline fontSize so it wraps to fewer lines
- Subheadline too long? Reduce subheadline fontSize so it takes fewer lines
- After reducing font sizes, adjust Y positions so elements stack cleanly with 8-12px gaps
- NEVER just nudge Y position without also checking if font size should shrink

Return ONLY the JSON object.`;
}

// ── Apply a single VisionFix to the canvas ────────

function applyFix(engine: Engine, fix: VisionFix, canvasW: number, canvasH: number): boolean {
    const id = engine.find_by_name?.(fix.elementName) as number | null;
    if (id === null || id === undefined) {
        console.warn(`[VisionLoop] Element not found: "${fix.elementName}"`);
        return false;
    }

    let applied = false;

    if (fix.x !== undefined || fix.y !== undefined) {
        try {
            const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{
                id: number; x: number; y: number; width: number; height: number;
            }>;
            const node = nodes.find((n) => n.id === id);
            // ★ Bounds-check: clamp to canvas
            let newX = Math.max(0, Math.min(fix.x ?? node?.x ?? 0, canvasW - 10));
            let newY = Math.max(0, Math.min(fix.y ?? node?.y ?? 0, canvasH - 10));
            engine.set_position(id, newX, newY);
            applied = true;
        } catch {
            if (fix.x !== undefined && fix.y !== undefined) {
                const clampX = Math.max(0, Math.min(fix.x, canvasW - 10));
                const clampY = Math.max(0, Math.min(fix.y, canvasH - 10));
                engine.set_position(id, clampX, clampY);
                applied = true;
            }
        }
    }

    if (fix.w !== undefined && fix.h !== undefined) {
        // ★ Bounds-check: min 10px, max canvas size
        const clampW = Math.max(10, Math.min(fix.w, canvasW));
        const clampH = Math.max(10, Math.min(fix.h, canvasH));
        engine.set_size(id, clampW, clampH);
        applied = true;
    }

    if (fix.fontSize !== undefined) {
        // ★ Bounds-check: min 8px, max 80px
        const clampFs = Math.max(8, Math.min(80, fix.fontSize));
        engine.set_font_size?.(id, clampFs);
        applied = true;
    }

    if (fix.fill) {
        engine.set_fill_hex?.(id, fix.fill);
        applied = true;
    }

    return applied;
}

// ── Main loop (FIX-APPLY MODE) ──────────────────────
// ★ Vision AI sees the screenshot, identifies issues, provides pixel fixes.
//   Fixes are applied to canvas with bounds-checking safety net.
//   Up to 2 passes: if first pass scores < 80, apply fixes and re-check.

export async function runVisionLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let lastScore = 0;
    let totalFixesApplied = 0;
    let suggestions: VisionFix[] = [];
    let reasoning = '';

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
        if (signal.aborted) break;
        onProgress(pass === 1 ? 'Reviewing layout quality...' : `Improving design (pass ${pass})...`);

        // ── 1. Screenshot ──
        let screenshot: string;
        try {
            screenshot = engine.get_screenshot() as string;
        } catch (err) {
            console.warn('[VisionLoop] get_screenshot failed:', err);
            return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'Screenshot failed' };
        }

        // ── 2. Get element names ──
        let elementNames: string[] = [];
        try {
            const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{ name?: string }>;
            elementNames = nodes.map((n) => n.name ?? '').filter(Boolean);
        } catch { /* ok */ }

        if (elementNames.length === 0) {
            return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'No elements on canvas' };
        }

        // ── 3. Call Claude Vision ──
        const pureBase64 = screenshot.startsWith('data:')
            ? screenshot.split(',')[1] ?? screenshot
            : screenshot;

        const prompt = buildReviewPrompt(canvasW, canvasH, elementNames);
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } },
                    { type: 'text', text: prompt },
                ],
            }],
        };

        try {
            const data = await callAnthropicApi(body, signal) as {
                content: Array<{ type: string; text?: string }>;
            };
            const rawText = data.content.find((c) => c.type === 'text')?.text ?? '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in vision response');

            const reviewResult = JSON.parse(jsonMatch[0]) as {
                score: number; fixes: VisionFix[]; reasoning: string;
            };

            lastScore = reviewResult.score ?? 0;
            suggestions = reviewResult.fixes ?? [];
            reasoning = reviewResult.reasoning ?? '';

            console.log(`[VisionLoop] Pass ${pass}: score=${lastScore}, fixes=${suggestions.length}, reasoning="${reasoning}"`);

            // ── 4. Score check: if >= PASS_SCORE, approve and stop ──
            if (lastScore >= PASS_SCORE) {
                onProgress(`Score ${lastScore}/100 — Layout approved.`);
                break;
            }

            // ── 5. Apply fixes (if below threshold and not last pass) ──
            if (suggestions.length > 0 && pass < MAX_PASSES) {
                let fixCount = 0;
                for (const fix of suggestions) {
                    if (applyFix(engine, fix, canvasW, canvasH)) {
                        fixCount++;
                    }
                }
                totalFixesApplied += fixCount;
                onProgress(`Score ${lastScore}/100 — Applied ${fixCount} fix(es), re-checking...`);
                console.log(`[VisionLoop] Applied ${fixCount} fix(es) on pass ${pass}`);
            } else {
                onProgress(`Score ${lastScore}/100 — ${suggestions.length} issue(s) found.`);
            }

        } catch (err) {
            console.warn('[VisionLoop] Vision call failed:', err);
            return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'Vision API error' };
        }
    }

    return { finalScore: lastScore, passes: MAX_PASSES, fixesApplied: totalFixesApplied, suggestions, reasoning };
}
