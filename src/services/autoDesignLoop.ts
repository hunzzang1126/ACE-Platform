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
}

const MAX_PASSES = 3;
const PASS_SCORE = 82;  // score ≥ this → no more passes needed

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

// ── Main loop ─────────────────────────────────────

export async function runVisionLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    apiKey: string,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let totalFixes = 0;
    let lastScore = 0;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        // ── 1. Screenshot ──
        onProgress(`📸 Reviewing layout (pass ${pass + 1}/${MAX_PASSES})...`);

        let screenshot: string;
        try {
            screenshot = engine.get_screenshot() as string;
        } catch (err) {
            console.warn('[VisionLoop] get_screenshot failed, skipping loop:', err);
            break;
        }

        // ── 2. Get element names for context ──
        let elementNames: string[] = [];
        try {
            const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{ name?: string }>;
            elementNames = nodes.map((n) => n.name ?? '').filter(Boolean);
        } catch { /* ok */ }

        if (elementNames.length === 0) break;  // nothing to review

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

        let reviewResult: { score: number; fixes: VisionFix[]; reasoning: string };
        try {
            const data = await callAnthropicApi(apiKey, body, signal) as {
                content: Array<{ type: string; text?: string }>;
            };
            const rawText = data.content.find((c) => c.type === 'text')?.text ?? '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in vision response');
            reviewResult = JSON.parse(jsonMatch[0]);
        } catch (err) {
            console.warn(`[VisionLoop] Pass ${pass + 1} vision call failed:`, err);
            break;
        }

        lastScore = reviewResult.score ?? 0;
        const fixes = reviewResult.fixes ?? [];

        console.log(`[VisionLoop] Pass ${pass + 1}: score=${lastScore}, fixes=${fixes.length}, reasoning="${reviewResult.reasoning}"`);

        if (fixes.length === 0) {
            onProgress(`✅ Score ${lastScore}/100 — Layout approved!`);
            break;
        }

        // ── 4. Apply fixes ──
        onProgress(`🔧 Applying ${fixes.length} fix${fixes.length > 1 ? 'es' : ''} (score: ${lastScore}/100)...`);

        for (const fix of fixes) {
            if (applyFix(engine, fix)) totalFixes++;
        }

        if (lastScore >= PASS_SCORE) {
            onProgress(`✅ Score ${lastScore}/100 — Layout approved!`);
            break;
        }

        // Small pause between passes for canvas to settle
        await new Promise(r => setTimeout(r, 200));
    }

    return { finalScore: lastScore, passes: MAX_PASSES, fixesApplied: totalFixes };
}
