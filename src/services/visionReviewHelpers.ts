// ─────────────────────────────────────────────────
// visionReviewHelpers — Prompt building + API call + canvas state
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export interface ElementInfo { name: string; type: string; x: number; y: number; w: number; h: number; }

export interface VisionReviewResult {
    score: number;
    issues: Array<{ type: string; severity: string; element?: string; description: string; suggestion?: string }>;
    fixes: Array<{ elementName: string; x?: number; y?: number; w?: number; h?: number; fontSize?: number; fill?: string }>;
    reasoning: string;
}

const PASS_SCORE = 80;

function buildElementList(elements: ElementInfo[]): string {
    return elements.map(e => `  - "${e.name}" (${e.type}) at (${e.x}, ${e.y}) size ${e.w}x${e.h}`).join('\n');
}

export function buildReviewPrompt(canvasW: number, canvasH: number, elements: ElementInfo[]): string {
    const elementList = buildElementList(elements);
    const area = canvasW * canvasH;
    const minGap = area < 100_000 ? 4 : area < 200_000 ? 6 : 8;
    const minFontSize = area < 100_000 ? 10 : 12;

    return `You are a professional creative designer doing a quality review of a banner ad.

Canvas: ${canvasW}x${canvasH}px (${area < 100_000 ? 'SMALL banner — tight spacing is acceptable' : area < 200_000 ? 'medium banner' : 'large banner'})

Elements with EXACT positions and sizes:
${elementList}

Look at the screenshot AND the element data above. Check for these issues:

1. TEXT READABILITY — Text must be readable against its background. Text on a busy image without a contrast overlay = -15 points.
2. TEXT OVERLAP — If any text element overlaps another, deduct -20 per instance.
3. TEXT CLIPPED — Text going outside canvas bounds (x + w > ${canvasW} or y + h > ${canvasH}) = -10 points.
4. CTA ALIGNMENT — CTA label text should be visually centered in its button. If off-center = -10 points.
5. FONT SIZE — Any text smaller than ${minFontSize}px = -5 points.
6. SPACING — Elements with less than ${minGap}px gap = -5 points.
7. HIERARCHY — Headline should be most prominent. If not = -5 points.

Scoring: Start at 100, subtract for each real issue. A clean design should score 85+.

Return JSON only:
{
  "score": <0-100>,
  "issues": [{ "type": "<overlap|clipping|contrast|alignment|spacing|readability|hierarchy>", "severity": "<error|warning|suggestion>", "element": "<name>", "description": "<what's wrong>", "suggestion": "<fix>" }],
  "fixes": [{ "elementName": "<exact name>", "x": <num>, "y": <num>, "w": <num>, "h": <num>, "fontSize": <num>, "fill": "<#hex>" }],
  "reasoning": "<1-2 sentences>"
}

Rules: Only fix actual problems. Keep positions within canvas bounds. If score >= ${PASS_SCORE}, return empty fixes. Return ONLY the JSON object.`;
}

export async function callVisionReview(
    engine: Engine, canvasW: number, canvasH: number, signal?: AbortSignal,
): Promise<VisionReviewResult | null> {
    let screenshot: string;
    try { screenshot = engine.get_screenshot() as string; } catch { return null; }

    let elements: ElementInfo[] = [];
    try {
        const nodes = JSON.parse(engine.get_all_nodes() as string) as Array<{ name?: string; type?: string; x?: number; y?: number; w?: number; h?: number }>;
        elements = nodes.filter(n => n.name).map(n => ({ name: n.name!, type: n.type ?? 'unknown', x: Math.round(n.x ?? 0), y: Math.round(n.y ?? 0), w: Math.round(n.w ?? 0), h: Math.round(n.h ?? 0) }));
    } catch { /* ok */ }
    if (elements.length === 0) return null;

    const pureBase64 = screenshot.startsWith('data:') ? screenshot.split(',')[1] ?? screenshot : screenshot;
    const body = { model: DEFAULT_CLAUDE_MODEL, max_tokens: 1024, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } }, { type: 'text', text: buildReviewPrompt(canvasW, canvasH, elements) }] }] };
    const data = await callAnthropicApi(body, signal) as { content: Array<{ type: string; text?: string }> };
    const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in vision response');
    const parsed = JSON.parse(jsonMatch[0]);
    return { score: parsed.score ?? 0, issues: parsed.issues ?? [], fixes: parsed.fixes ?? [], reasoning: parsed.reasoning ?? '' };
}

export function applyFix(engine: Engine, fix: { elementName: string; x?: number; y?: number; w?: number; h?: number; fontSize?: number; fill?: string }, canvasW: number, canvasH: number): boolean {
    const id = engine.find_by_name?.(fix.elementName) as number | null;
    if (id === null || id === undefined) return false;
    let applied = false;
    if (fix.x !== undefined || fix.y !== undefined) {
        try { const nodes = JSON.parse(engine.get_all_nodes() as string); const node = nodes.find((n: any) => n.id === id); engine.set_position(id, Math.max(0, Math.min(fix.x ?? node?.x ?? 0, canvasW - 10)), Math.max(0, Math.min(fix.y ?? node?.y ?? 0, canvasH - 10))); applied = true; } catch { if (fix.x !== undefined && fix.y !== undefined) { engine.set_position(id, Math.max(0, Math.min(fix.x, canvasW - 10)), Math.max(0, Math.min(fix.y, canvasH - 10))); applied = true; } }
    }
    if (fix.w !== undefined && fix.h !== undefined) { engine.set_size(id, Math.max(10, Math.min(fix.w, canvasW)), Math.max(10, Math.min(fix.h, canvasH))); applied = true; }
    if (fix.fontSize !== undefined) { engine.set_font_size?.(id, Math.max(8, Math.min(80, fix.fontSize))); applied = true; }
    if (fix.fill) { engine.set_fill_hex?.(id, fix.fill); applied = true; }
    return applied;
}

export function saveCanvasState(engine: Engine): string | null {
    try { return engine.get_all_nodes() as string; } catch { return null; }
}

export function restoreCanvasState(engine: Engine, snapshot: string): void {
    try {
        const nodes = JSON.parse(snapshot) as Array<{ id: number; x: number; y: number; w: number; h: number; fontSize?: number }>;
        for (const n of nodes) { engine.set_position?.(n.id, n.x, n.y); if (n.w && n.h) engine.set_size?.(n.id, n.w, n.h); if (n.fontSize) engine.set_font_size?.(n.id, n.fontSize); }
    } catch (err) { console.warn('[VisionLoop] Canvas restore failed:', err); }
}
