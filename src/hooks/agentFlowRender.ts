// ─────────────────────────────────────────────────
// agentFlowRender — Rendering helpers for AI design pipeline
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep file under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';

/** Render a single design element onto the canvas engine. */
export function renderElement(engine: FlowEngine, el: any, canvasW: number, cacheGradientData: (key: string, start: string, end: string, angle: number) => void, guide?: any): number | null {
    const hexToRgb = (hx: string): [number, number, number] => {
        const c = hx.replace('#', '');
        return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
    };

    if (el.type === 'text') {
        const [tr, tg, tb] = el.color_hex ? hexToRgb(el.color_hex) : [1, 1, 1];
        const fontFamily = el.font_family || guide?.typography?.primaryFont || 'Inter';
        const fullFont = `${fontFamily}, system-ui, sans-serif`;
        return engine.add_text(el.x ?? 0, el.y ?? 0, el.content || 'Text', el.font_size ?? 18, fullFont, el.font_weight ?? '700', tr, tg, tb, 1.0, (el.w && el.w > 0) ? el.w : canvasW * 0.85, el.text_align ?? 'center', el.name, el.line_height, el.letter_spacing);
    } else if (el.gradient_start_hex && el.gradient_end_hex) {
        const nodeId = engine.add_gradient_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 100, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
        cacheGradientData(el.name ?? '', el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        if (nodeId != null) cacheGradientData(`engine-${nodeId}`, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        return nodeId;
    } else if (el.type === 'rounded_rect' || (el.radius && el.radius > 0)) {
        // ★ Route any rect with radius > 0 to rounded_rect (e.g., text_overlay, cta_button)
        return engine.add_rounded_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.radius ?? 8, el.name);
    } else if (el.type === 'ellipse') {
        return engine.add_ellipse?.((el.x ?? 0) + (el.w ?? 50) / 2, (el.y ?? 0) + (el.h ?? 50) / 2, (el.w ?? 50) / 2, (el.h ?? 50) / 2, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1) ?? null;
    } else {
        return engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.name);
    }
}

/** Build human-readable detail string for a design element. */
export function buildElementDetail(el: any): string {
    if (el.type === 'text') return `"${(el.content ?? '').slice(0, 25)}" ${el.font_size}px at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`;
    if (el.gradient_start_hex) return `${el.gradient_start_hex} -> ${el.gradient_end_hex} ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
    return `${el.type ?? 'rect'} at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)}) ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
}

/** Run Vision QA healing loop (currently unused but preserved for future re-enable). */
export async function runVisionQA(engine: FlowEngine, canvasW: number, canvasH: number, guide: any, template: any, rendered: number, abort: AbortController, cb: AgentFlowCallbacks) {
    cb.narrate('Reviewing and optimizing design quality...');
    cb.addCard('vision', 'Optimizing layout', 'running');
    try {
        const { runVisionHealingLoop } = await resilientImport(() => import('@/services/autoDesignLoop'));
        const loopResult = await runVisionHealingLoop(engine, canvasW, canvasH, abort.signal, (msg: string) => cb.updateCard('vision', 'running', msg));
        const fixNote = loopResult.fixesApplied > 0 ? ` · ${loopResult.fixesApplied} fix(es)` : '';
        const methodNote = loopResult.healingMethod === 'patch' ? ' (auto-patched)' : '';
        cb.updateCard('vision', loopResult.finalScore >= 80 ? 'done' : 'error', `Score: ${loopResult.finalScore}/100${fixNote}${methodNote}`);
        cb.narrate(`Design quality review — score ${loopResult.finalScore}/100.${fixNote}\nStyle: ${guide.name}\nLayout: ${template.name}\nElements: ${rendered}\nCanvas: ${canvasW}x${canvasH}px`);
    } catch {
        cb.updateCard('vision', 'done', 'Vision check skipped');
        cb.narrate(`Design placed with ${rendered} elements using ${guide.name}.\nCanvas: ${canvasW}x${canvasH}px`);
    }
}
