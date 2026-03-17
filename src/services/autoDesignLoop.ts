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
    /** Exact layer __glidName */
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

// ── Element data for Vision review ────────────────

interface ElementInfo {
    name: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

function buildElementList(elements: ElementInfo[]): string {
    return elements.map(e =>
        `  - "${e.name}" (${e.type}) at (${e.x}, ${e.y}) size ${e.w}x${e.h}`
    ).join('\n');
}

function buildReviewPrompt(canvasW: number, canvasH: number, elements: ElementInfo[]): string {
    const elementList = buildElementList(elements);
    const area = canvasW * canvasH;

    // Dynamic spacing threshold based on canvas size
    const minGap = area < 100_000 ? 4 : area < 200_000 ? 6 : 8;
    const minFontSize = area < 100_000 ? 10 : 12;

    return `You are a professional creative designer doing a quality review of a banner ad.

Canvas: ${canvasW}x${canvasH}px (${area < 100_000 ? 'SMALL banner — tight spacing is acceptable' : area < 200_000 ? 'medium banner' : 'large banner'})

Elements with EXACT positions and sizes:
${elementList}

Look at the screenshot AND the element data above. Check for these issues:

1. TEXT READABILITY — Text must be readable against its background. Text on a busy image without a contrast overlay = -15 points.
2. TEXT OVERLAP — If any text element overlaps another, deduct -20 per instance. Use the element positions/sizes above to check precisely.
3. TEXT CLIPPED — Text going outside canvas bounds (check: x + w > ${canvasW} or y + h > ${canvasH}) = -10 points.
4. CTA ALIGNMENT — CTA label text should be visually centered in its button. If off-center = -10 points. Use the positions above to verify.
5. FONT SIZE — Any text smaller than ${minFontSize}px = -5 points.
6. SPACING — Elements with less than ${minGap}px gap between them = -5 points (use element positions to check mathematically).
7. HIERARCHY — Headline should be the most prominent text. If not = -5 points.

Scoring:
- Start at 100, subtract for each real issue
- Be fair: on a ${canvasW}x${canvasH} canvas, elements WILL be close together. That's normal.
- Only deduct if something is genuinely wrong visually
- A clean design with readable text and no overlaps should score 85+

IMPORTANT: For each fix, you KNOW the exact element positions. Calculate precise new coordinates.
For CTA centering: cta_label should be at x = cta_button.x + (cta_button.w - cta_label.w) / 2, y = cta_button.y + (cta_button.h - cta_label.h) / 2.
For overlap: separate elements by adjusting y positions with ${minGap}px gaps.

Return JSON only:
{
  "score": <0-100>,
  "issues": [
    {
      "type": "<overlap|clipping|contrast|alignment|spacing|readability|hierarchy>",
      "severity": "<error|warning|suggestion>",
      "element": "<element name>",
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
- ONLY fix actual visible problems — do NOT rearrange a working layout
- Use the element positions above to calculate exact fix coordinates
- Keep all positions within canvas bounds (0 to ${canvasW}, 0 to ${canvasH})
- If score >= ${PASS_SCORE}, return empty fixes array
- Prefer minimal changes — move the least number of elements possible

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

    // 2. Get full element data (name, type, x, y, w, h)
    let elements: ElementInfo[] = [];
    try {
        const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{
            name?: string; type?: string;
            x?: number; y?: number; w?: number; h?: number;
        }>;
        elements = nodes
            .filter(n => n.name)
            .map(n => ({
                name: n.name!,
                type: n.type ?? 'unknown',
                x: Math.round(n.x ?? 0),
                y: Math.round(n.y ?? 0),
                w: Math.round(n.w ?? 0),
                h: Math.round(n.h ?? 0),
            }));
    } catch { /* ok */ }

    if (elements.length === 0) return null;

    // 3. Call Claude Vision with screenshot + element data
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
                { type: 'text', text: buildReviewPrompt(canvasW, canvasH, elements) },
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
// runVisionHealingLoop — Score → Quick Patch → Done
// ═══════════════════════════════════════════════════
// Agent Healing (Pass 3) DISABLED — too slow/destructive.
// Only fast coordinate patches (Pass 2) are applied.
// 15-second timeout protects against slow Vision API.
// ═══════════════════════════════════════════════════

const VISION_TIMEOUT_MS = 15_000; // 15 seconds max for entire loop

export async function runVisionHealingLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
    _healerFn?: HealerFn, // kept for API compat but UNUSED
): Promise<VisionLoopResult> {
    // Wrap with timeout
    const timeoutCtrl = new AbortController();
    const timeout = setTimeout(() => timeoutCtrl.abort(), VISION_TIMEOUT_MS);
    const combinedSignal = signal.aborted ? signal : timeoutCtrl.signal;

    // Also abort our timer if caller aborts
    const onCallerAbort = () => timeoutCtrl.abort();
    signal.addEventListener('abort', onCallerAbort, { once: true });

    try {
        return await _runVisionLoop(engine, canvasW, canvasH, combinedSignal, onProgress);
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', onCallerAbort);
    }
}

async function _runVisionLoop(
    engine: Engine,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
    onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let bestScore = 0;
    let totalFixesApplied = 0;
    let reasoning = '';

    // ── Pass 1: Initial Vision Score ──
    onProgress('Reviewing layout quality...');
    let review: VisionReviewResult | null;
    try {
        review = await callVisionReview(engine, canvasW, canvasH, signal);
    } catch (err) {
        if (signal.aborted) {
            console.warn('[VisionLoop] Timed out during initial review');
            onProgress('Vision review timed out — delivering design as-is.');
            return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Timed out', healingMethod: 'none' };
        }
        console.warn('[VisionLoop] Initial review failed:', err);
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Vision API error', healingMethod: 'none' };
    }
    if (!review) {
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'No elements on canvas', healingMethod: 'none' };
    }

    bestScore = review.score;
    reasoning = review.reasoning;
    console.log(`[VisionLoop] Pass 1: score=${bestScore}, fixes=${review.fixes.length}, reasoning="${reasoning}"`);

    // ★ If score is good enough, approve immediately
    if (bestScore >= PASS_SCORE) {
        onProgress(`Score ${bestScore}/100 — Layout approved.`);
        return { finalScore: bestScore, passes: 1, fixesApplied: 0, suggestions: [], reasoning, healingMethod: 'none' };
    }

    // ── Pass 2: Quick Patch (low-level coordinate fixes) ──
    if (review.fixes.length > 0 && !signal.aborted) {
        onProgress(`Score ${bestScore}/100 · ${review.fixes.length} fix(es) (auto-patched)`);
        const preFixSnapshot = saveCanvasState(engine);
        let fixCount = 0;
        for (const fix of review.fixes) {
            if (applyFix(engine, fix, canvasW, canvasH)) fixCount++;
        }
        totalFixesApplied += fixCount;
        console.log(`[VisionLoop] Applied ${fixCount} quick fix(es)`);

        // Re-score after patches (only if time allows)
        if (!signal.aborted) {
            try {
                const recheck = await callVisionReview(engine, canvasW, canvasH, signal);
                if (recheck) {
                    console.log(`[VisionLoop] Pass 2 (post-patch): score=${recheck.score}`);
                    if (recheck.score > bestScore) {
                        bestScore = recheck.score;
                        reasoning = recheck.reasoning;
                    } else if (recheck.score < bestScore) {
                        // Patches made it worse → rollback
                        console.log(`[VisionLoop] Patches worsened score (${recheck.score} vs ${bestScore}). Rolling back.`);
                        if (preFixSnapshot) restoreCanvasState(engine, preFixSnapshot);
                        totalFixesApplied -= fixCount;
                    }
                }
            } catch {
                // Re-score failed (timeout) — keep patches, report original score
                if (signal.aborted) {
                    onProgress(`Score ${bestScore}/100 · ${totalFixesApplied} fix(es) (auto-patched) — Best result`);
                }
            }
        }
    }

    // ── Done — no Agent Healing (too slow/destructive) ──
    const fixNote = totalFixesApplied > 0 ? ` · ${totalFixesApplied} fix(es) (auto-patched)` : '';
    if (bestScore >= PASS_SCORE) {
        onProgress(`Score ${bestScore}/100${fixNote} — Approved.`);
    } else {
        onProgress(`Score ${bestScore}/100${fixNote} — Best result`);
    }

    return {
        finalScore: bestScore,
        passes: 2,
        fixesApplied: totalFixesApplied,
        suggestions: [],
        reasoning,
        healingMethod: totalFixesApplied > 0 ? 'patch' : 'none',
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
