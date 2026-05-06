// ─────────────────────────────────────────────────
// canvasToolExecutors — Engine-based add_text / add_button
// ─────────────────────────────────────────────────
// Used by commandExecutor.ts when canvas engine is available.
// Falls back to store-based executor when engine is not present.
// ─────────────────────────────────────────────────

import type { Engine, ExecutionResult } from './executorHelpers';
import { executeDesignCommand } from './executors/designExecutor';

// ── Helpers ──

function hexToRgbNormalized(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    return [
        parseInt(clean.substring(0, 2), 16) / 255 || 0,
        parseInt(clean.substring(2, 4), 16) / 255 || 0,
        parseInt(clean.substring(4, 6), 16) / 255 || 0,
    ];
}

// ── Add Text (engine-first) ──

export async function executeAddTextOnCanvas(
    engine: Engine,
    p: Record<string, unknown>,
): Promise<ExecutionResult> {
    const str = (key: string, fallback = ''): string => {
        const v = p[key]; return typeof v === 'string' ? v : fallback;
    };
    const num = (key: string, fallback = 0): number => {
        const v = p[key]; if (v === undefined || v === null) return fallback;
        const n = Number(v); return Number.isFinite(n) ? n : fallback;
    };

    // ★ Canvas editor: use engine.add_text() for VISUAL placement
    if (engine?.add_text) {
        try {
            const content = str('content', 'Text');
            const fontSize = num('fontSize', 24);
            const fontFamily = str('fontFamily', 'Inter');
            const fontWeight = String(num('fontWeight', 700));
            const color = str('color', '#ffffff');
            const textAlign = str('align', 'center');
            const elName = str('name', content.substring(0, 20));
            const canvasW = engine.canvas_width?.() ?? 300;
            const canvasH = engine.canvas_height?.() ?? 250;

            // Auto-size width from content length
            const avgCharWidth = fontSize * 0.6;
            const contentWidth = Math.ceil(content.length * avgCharWidth);
            const width = num('width', 0) || Math.min(Math.max(contentWidth + fontSize, 60), Math.round(canvasW * 0.95));

            // Auto-Y: avoid collision with existing text nodes
            let y = num('y', Math.round(canvasH * 0.3));
            if (engine.get_all_nodes) {
                try {
                    const nodes = JSON.parse(engine.get_all_nodes() ?? '[]');
                    const textNodes = nodes.filter((n: any) => n.type === 'text');
                    const GAP = 10;
                    for (const n of textNodes) {
                        const nBottom = (n.y ?? 0) + (n.h ?? 30);
                        if (y >= (n.y ?? 0) && y < nBottom + GAP) y = nBottom + GAP;
                    }
                    y = Math.min(y, canvasH - fontSize * 2);
                } catch { /* ok */ }
            }

            const x = textAlign === 'center' ? Math.round((canvasW - width) / 2) : num('x', 20);
            const [cr, cg, cb] = hexToRgbNormalized(color);

            const id = engine.add_text(
                x, y, content, fontSize, fontFamily, fontWeight,
                cr, cg, cb, 1.0, width, textAlign, elName,
            );
            return {
                success: true,
                message: `Text "${content.slice(0, 40)}" added at (${x}, ${y}), ${fontSize}px ${fontFamily}`,
                nodeId: id,
            };
        } catch (err) {
            return { success: false, message: `add_text engine failed: ${err}` };
        }
    }
    // ★ Fallback: store-based (size dashboard)
    const result = await executeDesignCommand('add_text', p);
    return result ?? { success: false, message: 'add_text: No engine or creative set available.' };
}

// ── Add Button (engine-first) ──

export async function executeAddButtonOnCanvas(
    engine: Engine,
    p: Record<string, unknown>,
): Promise<ExecutionResult> {
    const str = (key: string, fallback = ''): string => {
        const v = p[key]; return typeof v === 'string' ? v : fallback;
    };
    const num = (key: string, fallback = 0): number => {
        const v = p[key]; if (v === undefined || v === null) return fallback;
        const n = Number(v); return Number.isFinite(n) ? n : fallback;
    };

    if (engine?.add_text && engine?.add_rounded_rect) {
        try {
            const text = str('text', 'Shop Now');
            const bgColor = str('bgColor', '#c9a84c');
            const textColor = str('textColor', '#ffffff');
            const fontSize = num('fontSize', 14);
            const borderRadius = num('borderRadius', 6);
            const canvasW = engine.canvas_width?.() ?? 300;
            const canvasH = engine.canvas_height?.() ?? 250;
            const btnW = num('width', 0) || Math.round(canvasW * 0.5);
            const btnH = num('height', 40);
            const x = Math.round((canvasW - btnW) / 2);
            let y = num('y', Math.round(canvasH * 0.7));
            y = Math.min(y, canvasH - btnH - 4);

            const [br, bg, bb] = hexToRgbNormalized(bgColor);
            const bgId = engine.add_rounded_rect(x, y, btnW, btnH, br, bg, bb, 1.0, borderRadius, 'CTA Button BG');

            const [tr, tg, tb] = hexToRgbNormalized(textColor);
            const textY = y + Math.round((btnH - fontSize) / 2);
            const txtId = engine.add_text(
                x, textY, text, fontSize, 'Inter', '700',
                tr, tg, tb, 1.0, btnW, 'center', 'CTA Button',
            );

            return {
                success: true,
                message: `CTA Button "${text}" added at (${x}, ${y}), ${btnW}x${btnH}`,
                data: { bgId, txtId },
            };
        } catch (err) {
            return { success: false, message: `add_button engine failed: ${err}` };
        }
    }
    const result = await executeDesignCommand('add_button', p);
    return result ?? { success: false, message: 'add_button: No engine or creative set available.' };
}
