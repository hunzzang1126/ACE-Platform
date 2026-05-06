// ─────────────────────────────────────────────────
// Canvas Context Analyzer — Read & Understand Canvas State
// ─────────────────────────────────────────────────
// Parses engine.get_all_nodes() to understand what's already
// on the canvas, enabling contextual design generation.
// ─────────────────────────────────────────────────

// ── Types ──

export interface CanvasContext {
    isEmpty: boolean;
    elementCount: number;
    /** A full-cover image exists (covers >80% of canvas area) */
    hasFullCoverImage: boolean;
    existingImages: CanvasImage[];
    existingTexts: CanvasText[];
    lockedElements: string[];
}

export interface CanvasImage {
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    src?: string;
    coversCanvas: boolean;
}

export interface CanvasText {
    name: string;
    content: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export type GenerationMode = 'full' | 'contextual';

// ── Prompt Keywords ──

const FULL_MODE_KEYWORDS = [
    'new', 'fresh', 'start over', 'from scratch', 'redo',
    '새로', '처음부터', '다시', '새롭게', '리셋',
];

const CONTEXTUAL_KEYWORDS = [
    'add', 'modify', 'change', 'update', 'edit', 'replace', 'keep',
    '추가', '수정', '변경', '바꿔', '편집', '유지',
];

// ── Analyze Canvas ──

export function analyzeCanvas(
    nodesJson: string,
    canvasW: number,
    canvasH: number,
): CanvasContext {
    const ctx: CanvasContext = {
        isEmpty: true,
        elementCount: 0,
        hasFullCoverImage: false,
        existingImages: [],
        existingTexts: [],
        lockedElements: [],
    };

    let nodes: any[];
    try {
        nodes = JSON.parse(nodesJson);
        if (!Array.isArray(nodes)) return ctx;
    } catch {
        return ctx;
    }

    ctx.elementCount = nodes.length;
    ctx.isEmpty = nodes.length === 0;

    const canvasArea = canvasW * canvasH;

    for (const node of nodes) {
        const name = String(node.name ?? node.id ?? '');
        const x = Number(node.x ?? node.left ?? 0);
        const y = Number(node.y ?? node.top ?? 0);
        const w = Number(node.w ?? node.width ?? 0);
        const h = Number(node.h ?? node.height ?? 0);

        // Track locked elements
        if (node.locked || node.lockMovementX || node.selectable === false) {
            ctx.lockedElements.push(name);
        }

        // Detect images
        const type = String(node.type ?? '').toLowerCase();
        if (type === 'image' || node.src || node._element) {
            const area = w * h;
            const coversCanvas = area >= canvasArea * 0.8;
            ctx.existingImages.push({
                name, x, y, w, h,
                src: node.src ?? undefined,
                coversCanvas,
            });
            if (coversCanvas) ctx.hasFullCoverImage = true;
        }

        // Detect texts
        if (type === 'text' || type === 'textbox' || type === 'i-text') {
            ctx.existingTexts.push({
                name,
                content: String(node.text ?? node.content ?? ''),
                x, y, w, h,
            });
        }
    }

    return ctx;
}

// ── Decide Generation Mode ──

export function decideGenerationMode(
    ctx: CanvasContext,
    prompt: string,
): GenerationMode {
    // Empty canvas → always full
    if (ctx.isEmpty) return 'full';

    const lower = prompt.toLowerCase();

    // Explicit "start over" → full
    if (FULL_MODE_KEYWORDS.some(k => lower.includes(k))) return 'full';

    // Explicit "modify/add" → contextual
    if (CONTEXTUAL_KEYWORDS.some(k => lower.includes(k))) return 'contextual';

    // Has existing elements but no explicit intent →
    // Default to full for now (safer — don't break existing UX)
    return 'full';
}
