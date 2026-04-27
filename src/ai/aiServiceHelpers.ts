// ─────────────────────────────────────────────────
// aiServiceHelpers — Extracted helpers from AiService
// ─────────────────────────────────────────────────
// Memory persistence + canvas inspection utilities.
// Extracted to keep aiService.ts under 400 lines.
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

// ── Canvas Inspection ────────────────────────────

export function getCanvasElementCount(engine: Engine): number {
    try {
        if (!engine?.get_all_nodes) return 0;
        const nodes = JSON.parse(engine.get_all_nodes());
        return Array.isArray(nodes) ? nodes.length : 0;
    } catch { return 0; }
}

export function getCanvasElementNames(engine: Engine): string[] {
    try {
        if (!engine?.get_all_nodes) return [];
        const nodes = JSON.parse(engine.get_all_nodes()) as Array<{ name?: string }>;
        return nodes.map(n => n.name ?? '').filter(Boolean);
    } catch { return []; }
}

// ── Memory Persistence ───────────────────────────

export async function saveInteractionMemory(userMessage: string, lastReply: string): Promise<void> {
    try {
        const { saveAiMemory, extractFacts } = await import('@/services/aiMemoryService');
        const facts = extractFacts(userMessage, lastReply);
        if (Object.keys(facts).length > 0) {
            await saveAiMemory(facts);
            console.info('[AiMemory] Chat facts saved:', Object.keys(facts));
        } else {
            console.info('[AiMemory] No extractable facts from this message');
        }
    } catch (err) {
        console.warn('[AiMemory] Chat memory save failed:', err);
    }
}
