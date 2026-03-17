// ─────────────────────────────────────────────────
// autoDesignLoop.ts — Vision Healing Loop
// ─────────────────────────────────────────────────
// After initial layout is placed on canvas:
//
//  Phase A: Quick patch (1 pass, low-level coordinate fixes)
//  Phase B: Agent healing (AI Agent uses atomic tools to fix)
//  Phase C: Quality gate (best-score tracking + rollback)
//
// Two exported functions:
//   - runVisionLoop()        — legacy patch-only loop (kept for compat)
//   - runVisionHealingLoop() — new: patch + Agent healing + rollback
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
    /** Healing method that produced the final result */
    healingMethod: 'patch' | 'agent' | 'none';
}

/** Issue format from Vision analyzeDesign() */
export interface VisionIssue {
    type: string;
    severity: string;
    element?: string;
    description: string;
    suggestion?: string;
}

/** Callback for Agent-based healing — provided by the caller */
export type HealerFn = (
    engine: Engine,
    issues: VisionIssue[],
    score: number,
    canvasW: number,
    canvasH: number,
) => Promise<void>;

const PASS_SCORE = 80;

// ── Vision review prompt ──────────────────────────

function buildReviewPrompt(canvasW: number, canvasH: number, elementNames: string[]): string {
    const nameList = elementNames.map(n => `  - "${n}"`).join('\n');
    return `You are a professional creative designer doing a strict quality review.

Canvas: ${canvasW}x${canvasH}px
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
  "issues": [
    {
      "type": "<overlap|text_overflow|contrast|hierarchy|spacing|alignment|clipping|readability|crowding>",
      "severity": "<error|warning|suggestion>",
      "element": "<element name or omit>",
      "description": "<what's wrong>",
      "suggestion": "<how to fix>"
    }
  ],
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
            const newX = Math.max(0, Math.min(fix.x ?? node?.x ?? 0, canvasW - 10));
            const newY = Math.max(0, Math.min(fix.y ?? node?.y ?? 0, canvasH - 10));
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
        const clampW = Math.max(10, Math.min(fix.w, canvasW));
        const clampH = Math.max(10, Math.min(fix.h, canvasH));
        engine.set_size(id, clampW, clampH);
        applied = true;
    }

    if (fix.fontSize !== undefined) {
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

// ── Call Vision API for scoring + issues ──────────

interface VisionReviewResult {
    score: number;
    issues: VisionIssue[];
    fixes: VisionFix[];
    reasoning: string;
}

async function callVisionReview(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<VisionReviewResult | null> {
    // 1. Screenshot
    let screenshot: string;
    try {
        screenshot = engine.get_screenshot() as string;
    } catch (err) {
        console.warn('[VisionLoop] get_screenshot failed:', err);
        return null;
    }

    // 2. Get element names
    let elementNames: string[] = [];
    try {
        const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{ name?: string }>;
        elementNames = nodes.map((n) => n.name ?? '').filter(Boolean);
    } catch { /* ok */ }

    if (elementNames.length === 0) return null;

    // 3. Call Claude Vision
    const pureBase64 = screenshot.startsWith('data:')
        ? screenshot.split(',')[1] ?? screenshot
        : screenshot;

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } },
                { type: 'text', text: buildReviewPrompt(canvasW, canvasH, elementNames) },
            ],
        }],
    };

    const data = await callAnthropicApi(body, signal) as {
        content: Array<{ type: string; text?: string }>;
    };
    const rawText = data.content.find((c) => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in vision response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
        score: parsed.score ?? 0,
        issues: parsed.issues ?? [],
        fixes: parsed.fixes ?? [],
        reasoning: parsed.reasoning ?? '',
    };
}

// ── Save/restore canvas state for rollback ────────

function saveCanvasState(engine: Engine): string | null {
    try {
        return engine.get_all_nodes() as string;
    } catch {
        return null;
    }
}

function restoreCanvasState(engine: Engine, snapshot: string): void {
    try {
        const nodes = JSON.parse(snapshot) as Array<{
            id: number; x: number; y: number; w: number; h: number;
            fill_r?: number; fill_g?: number; fill_b?: number;
            fontSize?: number;
        }>;
        for (const n of nodes) {
            engine.set_position?.(n.id, n.x, n.y);
            if (n.w && n.h) engine.set_size?.(n.id, n.w, n.h);
            if (n.fontSize) engine.set_font_size?.(n.id, n.fontSize);
        }
    } catch (err) {
        console.warn('[VisionLoop] Canvas restore failed:', err);
    }
}

// ═══════════════════════════════════════════════════
// NEW: runVisionHealingLoop — Patch → Agent Healing → Rollback
// ═══════════════════════════════════════════════════

export async function runVisionHealingLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
    healerFn?: HealerFn,
): Promise<VisionLoopResult> {
    let bestScore = 0;
    let bestSnapshot: string | null = null;
    let totalFixesApplied = 0;
    let reasoning = '';
    let issues: VisionIssue[] = [];
    let healingMethod: VisionLoopResult['healingMethod'] = 'none';

    // ── Pass 1: Initial Vision Score ──
    onProgress('Reviewing layout quality...');
    let review: VisionReviewResult | null;
    try {
        review = await callVisionReview(engine, canvasW, canvasH, signal);
    } catch (err) {
        console.warn('[VisionLoop] Initial review failed:', err);
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Vision API error', healingMethod: 'none' };
    }
    if (!review) {
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'No elements on canvas', healingMethod: 'none' };
    }

    bestScore = review.score;
    bestSnapshot = saveCanvasState(engine);
    reasoning = review.reasoning;
    issues = review.issues;
    console.log(`[VisionLoop] Pass 1: score=${bestScore}, issues=${issues.length}, reasoning="${reasoning}"`);

    // ★ If score is good enough, approve immediately
    if (bestScore >= PASS_SCORE) {
        onProgress(`Score ${bestScore}/100 — Layout approved.`);
        return { finalScore: bestScore, passes: 1, fixesApplied: 0, suggestions: [], reasoning, healingMethod: 'none' };
    }

    // ── Pass 2: Quick Patch (low-level coordinate fixes) ──
    if (review.fixes.length > 0) {
        onProgress(`Score ${bestScore}/100 — Applying quick fixes...`);
        const preFixSnapshot = saveCanvasState(engine);
        let fixCount = 0;
        for (const fix of review.fixes) {
            if (applyFix(engine, fix, canvasW, canvasH)) fixCount++;
        }
        totalFixesApplied += fixCount;
        console.log(`[VisionLoop] Applied ${fixCount} quick fix(es)`);

        // Re-score after patches
        try {
            const recheck = await callVisionReview(engine, canvasW, canvasH, signal);
            if (recheck) {
                console.log(`[VisionLoop] Pass 2 (post-patch): score=${recheck.score}`);
                if (recheck.score > bestScore) {
                    bestScore = recheck.score;
                    bestSnapshot = saveCanvasState(engine);
                    reasoning = recheck.reasoning;
                    issues = recheck.issues;
                    healingMethod = 'patch';
                } else {
                    // Patches made it worse → rollback
                    if (preFixSnapshot) restoreCanvasState(engine, preFixSnapshot);
                }

                if (bestScore >= PASS_SCORE) {
                    onProgress(`Score ${bestScore}/100 — Quick fix approved.`);
                    return { finalScore: bestScore, passes: 2, fixesApplied: totalFixesApplied, suggestions: [], reasoning, healingMethod };
                }
            }
        } catch {
            // Re-score failed — keep patch results
        }
    }

    // ── Pass 3: Agent Healing (AI uses atomic tools) ──
    if (signal.aborted || !healerFn) {
        if (!healerFn) console.log('[VisionLoop] No healerFn provided — skipping Agent healing');
        return { finalScore: bestScore, passes: 2, fixesApplied: totalFixesApplied, suggestions: [], reasoning, healingMethod };
    }
    onProgress(`Score ${bestScore}/100 — AI Agent healing...`);
    const preHealSnapshot = saveCanvasState(engine);

    try {
        await healerFn(engine, issues, bestScore, canvasW, canvasH);

        // Re-score after Agent healing
        const healReview = await callVisionReview(engine, canvasW, canvasH, signal);
        if (healReview) {
            console.log(`[VisionLoop] Pass 3 (post-heal): score=${healReview.score}`);
            if (healReview.score > bestScore) {
                bestScore = healReview.score;
                bestSnapshot = saveCanvasState(engine);
                reasoning = healReview.reasoning;
                issues = healReview.issues;
                healingMethod = 'agent';
                totalFixesApplied += 1; // Count agent healing as 1 fix
            } else {
                // Agent made it worse → rollback to best snapshot
                console.log(`[VisionLoop] Agent healing did not improve (${healReview.score} vs ${bestScore}). Rolling back.`);
                if (preHealSnapshot) restoreCanvasState(engine, preHealSnapshot);
            }
        }
    } catch (err) {
        console.warn('[VisionLoop] Agent healing failed:', err);
        // Rollback to pre-heal state
        if (preHealSnapshot) restoreCanvasState(engine, preHealSnapshot);
    }

    const fixNote = totalFixesApplied > 0 ? ` · ${totalFixesApplied} fix(es)` : '';
    if (bestScore >= PASS_SCORE) {
        onProgress(`Score ${bestScore}/100${fixNote} — Healed and approved.`);
    } else {
        onProgress(`Score ${bestScore}/100${fixNote} — Best result delivered.`);
    }

    return {
        finalScore: bestScore,
        passes: 3,
        fixesApplied: totalFixesApplied,
        suggestions: [],
        reasoning,
        healingMethod,
    };
}

// ═══════════════════════════════════════════════════
// LEGACY: runVisionLoop — kept for backward compat
// ═══════════════════════════════════════════════════

const MAX_PASSES_LEGACY = 3;

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

    for (let pass = 1; pass <= MAX_PASSES_LEGACY; pass++) {
        if (signal.aborted) break;
        onProgress(pass === 1 ? 'Reviewing layout quality...' : `Improving design (pass ${pass})...`);

        try {
            const review = await callVisionReview(engine, canvasW, canvasH, signal);
            if (!review) {
                return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'No elements', healingMethod: 'patch' };
            }

            lastScore = review.score;
            suggestions = review.fixes;
            reasoning = review.reasoning;

            console.log(`[VisionLoop] Pass ${pass}: score=${lastScore}, fixes=${suggestions.length}`);

            if (lastScore >= PASS_SCORE) {
                onProgress(`Score ${lastScore}/100 — Layout approved.`);
                break;
            }

            if (suggestions.length > 0 && pass < MAX_PASSES_LEGACY) {
                let fixCount = 0;
                for (const fix of suggestions) {
                    if (applyFix(engine, fix, canvasW, canvasH)) fixCount++;
                }
                totalFixesApplied += fixCount;
                onProgress(`Score ${lastScore}/100 — Applied ${fixCount} fix(es), re-checking...`);
            }
        } catch (err) {
            console.warn('[VisionLoop] Vision call failed:', err);
            return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'Vision API error', healingMethod: 'patch' };
        }
    }

    return { finalScore: lastScore, passes: MAX_PASSES_LEGACY, fixesApplied: totalFixesApplied, suggestions, reasoning, healingMethod: 'patch' };
}
