// ─────────────────────────────────────────────────
// autoDesignLoop.ts — Vision Feedback Loop
// ─────────────────────────────────────────────────
// After initial layout is placed on canvas:
//
//  1. engine.get_screenshot() → artboard PNG
//  2. Claude Vision analyzes for overlap/readability/hierarchy
//  3. Returns VisionFix[] with precise pixel corrections
//  4. Apply fixes via engine (set_position, set_size, set_font_size, set_fill_hex)
//  5. Repeat up to MAX_PASSES or until score ≥ PASS_SCORE
//
// This is the "human designer reviewing" step.
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
    /** Suggestions from Vision AI (report-only, NOT auto-applied) */
    suggestions: VisionFix[];
    reasoning: string;
}

// ★ REPORT-ONLY MODE: Single pass, no auto-fix.
// Vision checks the layout and reports issues, but never modifies canvas.
// This prevents the layout destruction caused by AI pixel-guessing.
const MAX_PASSES = 1;
const PASS_SCORE = 82;

// ── Vision review prompt ──────────────────────────

function buildReviewPrompt(canvasW: number, canvasH: number, elementNames: string[]): string {
    const nameList = elementNames.map(n => `  - "${n}"`).join('\n');
    return `You are a professional banner designer doing a quality review.

Canvas: ${canvasW}×${canvasH}px
Elements present:
${nameList}

Look at the banner image. Check for:
1. OVERLAP — elements covering each other (critical error)
2. TEXT CLIPPED — text going outside canvas bounds
3. HIERARCHY — headline should be largest/most prominent
4. CTA — CTA button should be clearly visible with good contrast
5. SPACING — no crowding, minimum 12px padding between elements

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
- If score ≥ ${PASS_SCORE}, return empty fixes array

Return ONLY the JSON object.`;
}

// ── Apply a single VisionFix to the canvas ────────

function applyFix(engine: Engine, fix: VisionFix): boolean {
    const id = engine.find_by_name?.(fix.elementName) as number | null;
    if (id === null || id === undefined) {
        console.warn(`[VisionLoop] Element not found: "${fix.elementName}"`);
        return false;
    }

    let applied = false;

    if (fix.x !== undefined || fix.y !== undefined) {
        // For position: preserve existing if only one axis provided
        // We re-read node bounds for safe fallback
        try {
            const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{
                id: number; x: number; y: number; width: number; height: number;
            }>;
            const node = nodes.find((n) => n.id === id);
            engine.set_position(
                id,
                fix.x ?? node?.x ?? 0,
                fix.y ?? node?.y ?? 0,
            );
            applied = true;
        } catch {
            if (fix.x !== undefined && fix.y !== undefined) {
                engine.set_position(id, fix.x, fix.y);
                applied = true;
            }
        }
    }

    if (fix.w !== undefined && fix.h !== undefined) {
        engine.set_size(id, fix.w, fix.h);
        applied = true;
    }

    if (fix.fontSize !== undefined) {
        engine.set_font_size?.(id, fix.fontSize);
        applied = true;
    }

    if (fix.fill) {
        engine.set_fill_hex?.(id, fix.fill);
        applied = true;
    }

    return applied;
}

// ── Main loop (REPORT-ONLY) ──────────────────────
// ★ Vision checks the layout and returns a score + suggestions,
//   but NEVER modifies canvas elements.
//   Previously, this loop applied VisionFix patches that broke layouts
//   because AI guessed pixel coordinates from a screenshot.

export async function runVisionLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let lastScore = 0;
    let suggestions: VisionFix[] = [];
    let reasoning = '';

    // Single-pass report — no iteration needed in report-only mode
    onProgress('Reviewing layout quality...');

    // ── 1. Screenshot ──
    let screenshot: string;
    try {
        screenshot = engine.get_screenshot() as string;
    } catch (err) {
        console.warn('[VisionLoop] get_screenshot failed:', err);
        return { finalScore: 0, passes: 0, fixesApplied: 0, suggestions: [], reasoning: 'Screenshot failed' };
    }

    // ── 2. Get element names for context ──
    let elementNames: string[] = [];
    try {
        const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{ name?: string }>;
        elementNames = nodes.map((n) => n.name ?? '').filter(Boolean);
    } catch { /* ok */ }

    if (elementNames.length === 0) {
        return { finalScore: 0, passes: 0, fixesApplied: 0, suggestions: [], reasoning: 'No elements on canvas' };
    }

    // ── 3. Call Claude Vision ──
    const pureBase64 = screenshot.startsWith('data:')
        ? screenshot.split(',')[1] ?? screenshot
        : screenshot;

    const prompt = buildReviewPrompt(canvasW, canvasH, elementNames);

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png',
                            data: pureBase64,
                        },
                    },
                    { type: 'text', text: prompt },
                ],
            },
        ],
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

        console.log(`[VisionLoop] Report: score=${lastScore}, suggestions=${suggestions.length}, reasoning="${reasoning}"`);

        // ★ REPORT-ONLY: Do NOT apply any fixes.
        // Suggestions are returned for UI display only.
        if (suggestions.length === 0) {
            onProgress(`Score ${lastScore}/100 — Layout approved.`);
        } else {
            onProgress(`Score ${lastScore}/100 — ${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}.`);
        }
    } catch (err) {
        console.warn('[VisionLoop] Vision call failed:', err);
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Vision API error' };
    }

    return { finalScore: lastScore, passes: 1, fixesApplied: 0, suggestions, reasoning };
}
