// ─────────────────────────────────────────────────
// autoDesignLoop.ts — Vision Healing Loop
// ─────────────────────────────────────────────────
// Helpers → visionReviewHelpers.ts
// ─────────────────────────────────────────────────

import { callVisionReview, applyFix, saveCanvasState, restoreCanvasState, type VisionReviewResult } from './visionReviewHelpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Types ──

export type { VisionReviewResult };

export interface VisionFix { elementName: string; x?: number; y?: number; w?: number; h?: number; fontSize?: number; fill?: string; }
export interface VisionLoopResult { finalScore: number; passes: number; fixesApplied: number; suggestions: VisionFix[]; reasoning: string; healingMethod: 'patch' | 'agent' | 'none'; }
export interface VisionIssue { type: string; severity: string; element?: string; description: string; suggestion?: string; }
export type HealerFn = (engine: Engine, issues: VisionIssue[], score: number, canvasW: number, canvasH: number) => Promise<void>;

const PASS_SCORE = 80;
const VISION_TIMEOUT_MS = 15_000;

// ═══════════════════════════════════════════════════
// runVisionHealingLoop — Score → Quick Patch → Done
// ═══════════════════════════════════════════════════

export async function runVisionHealingLoop(
    engine: Engine, canvasW: number, canvasH: number, signal: AbortSignal,
    onProgress: (msg: string) => void, _healerFn?: HealerFn,
): Promise<VisionLoopResult> {
    const timeoutCtrl = new AbortController();
    const timeout = setTimeout(() => timeoutCtrl.abort(), VISION_TIMEOUT_MS);
    const combinedSignal = signal.aborted ? signal : timeoutCtrl.signal;
    const onCallerAbort = () => timeoutCtrl.abort();
    signal.addEventListener('abort', onCallerAbort, { once: true });
    try { return await _runVisionLoop(engine, canvasW, canvasH, combinedSignal, onProgress); }
    finally { clearTimeout(timeout); signal.removeEventListener('abort', onCallerAbort); }
}

async function _runVisionLoop(
    engine: Engine, canvasW: number, canvasH: number, signal: AbortSignal, onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let bestScore = 0, totalFixesApplied = 0, reasoning = '';

    // ── Pass 1: Initial Vision Score ──
    onProgress('Reviewing layout quality...');
    let review: VisionReviewResult | null;
    try { review = await callVisionReview(engine, canvasW, canvasH, signal); }
    catch (err) {
        if (signal.aborted) { onProgress('Vision review timed out — delivering design as-is.'); return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Timed out', healingMethod: 'none' }; }
        return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'Vision API error', healingMethod: 'none' };
    }
    if (!review) return { finalScore: 0, passes: 1, fixesApplied: 0, suggestions: [], reasoning: 'No elements on canvas', healingMethod: 'none' };

    bestScore = review.score; reasoning = review.reasoning;
    if (bestScore >= PASS_SCORE) { onProgress(`Score ${bestScore}/100 — Layout approved.`); return { finalScore: bestScore, passes: 1, fixesApplied: 0, suggestions: [], reasoning, healingMethod: 'none' }; }

    // ── Pass 2: Quick Patch ──
    if (review.fixes.length > 0 && !signal.aborted) {
        onProgress(`Score ${bestScore}/100 · ${review.fixes.length} fix(es) (auto-patched)`);
        const preFixSnapshot = saveCanvasState(engine);
        let fixCount = 0;
        for (const fix of review.fixes) { if (applyFix(engine, fix, canvasW, canvasH)) fixCount++; }
        totalFixesApplied += fixCount;

        if (!signal.aborted) {
            try {
                const recheck = await callVisionReview(engine, canvasW, canvasH, signal);
                if (recheck) {
                    if (recheck.score > bestScore) { bestScore = recheck.score; reasoning = recheck.reasoning; }
                    else if (recheck.score < bestScore) { if (preFixSnapshot) restoreCanvasState(engine, preFixSnapshot); totalFixesApplied -= fixCount; }
                }
            } catch { if (signal.aborted) onProgress(`Score ${bestScore}/100 · ${totalFixesApplied} fix(es) — Best result`); }
        }
    }

    const fixNote = totalFixesApplied > 0 ? ` · ${totalFixesApplied} fix(es) (auto-patched)` : '';
    onProgress(bestScore >= PASS_SCORE ? `Score ${bestScore}/100${fixNote} — Approved.` : `Score ${bestScore}/100${fixNote} — Best result`);
    return { finalScore: bestScore, passes: 2, fixesApplied: totalFixesApplied, suggestions: [], reasoning, healingMethod: totalFixesApplied > 0 ? 'patch' : 'none' };
}

// ═══════════════════════════════════════════════════
// LEGACY: runVisionLoop
// ═══════════════════════════════════════════════════

const MAX_PASSES_LEGACY = 3;

export async function runVisionLoop(
    engine: Engine, canvasW: number, canvasH: number, signal: AbortSignal, onProgress: (msg: string) => void,
): Promise<VisionLoopResult> {
    let lastScore = 0, totalFixesApplied = 0, reasoning = '';
    let suggestions: VisionFix[] = [];

    for (let pass = 1; pass <= MAX_PASSES_LEGACY; pass++) {
        if (signal.aborted) break;
        onProgress(pass === 1 ? 'Reviewing layout quality...' : `Improving design (pass ${pass})...`);
        try {
            const review = await callVisionReview(engine, canvasW, canvasH, signal);
            if (!review) return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'No elements', healingMethod: 'patch' };
            lastScore = review.score; suggestions = review.fixes; reasoning = review.reasoning;
            if (lastScore >= PASS_SCORE) { onProgress(`Score ${lastScore}/100 — Layout approved.`); break; }
            if (suggestions.length > 0 && pass < MAX_PASSES_LEGACY) {
                let fixCount = 0;
                for (const fix of suggestions) { if (applyFix(engine, fix, canvasW, canvasH)) fixCount++; }
                totalFixesApplied += fixCount;
                onProgress(`Score ${lastScore}/100 — Applied ${fixCount} fix(es), re-checking...`);
            }
        } catch { return { finalScore: 0, passes: pass, fixesApplied: totalFixesApplied, suggestions: [], reasoning: 'Vision API error', healingMethod: 'patch' }; }
    }
    return { finalScore: lastScore, passes: MAX_PASSES_LEGACY, fixesApplied: totalFixesApplied, suggestions, reasoning, healingMethod: 'patch' };
}
