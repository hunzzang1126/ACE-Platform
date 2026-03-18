// ─────────────────────────────────────────────────
// layoutFingerprint — Deduplication engine
// ─────────────────────────────────────────────────
// Generates deterministic fingerprints from element layouts
// and computes similarity scores for dedup filtering.
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/elements.types';

// ── Types ──

export interface ElementDescriptor {
    role: string;
    /** Normalized position & size (0-1 relative to canvas) */
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    /** Font size ratio for text elements */
    fontSizeRatio: number;
}

// ── Constants ──

/** >= 80% similarity = too similar, skip saving */
export const DUPLICATE_THRESHOLD = 0.80;
/** <= 30% similarity = very unique, prioritize */
export const NOVEL_THRESHOLD = 0.30;
/** Rounding precision for normalization */
const ROUND_STEP = 0.05;

// ── Core Functions ──

/**
 * Generate a deterministic fingerprint from layout structure.
 * Ignores colors, fonts, content — only position/size matters.
 */
export function generateFingerprint(elements: DesignElement[], canvasW: number, canvasH: number): string {
    const descriptors = extractDescriptors(elements, canvasW, canvasH);
    const sorted = [...descriptors].sort((a, b) => {
        if (a.role !== b.role) return a.role.localeCompare(b.role);
        if (a.yPct !== b.yPct) return a.yPct - b.yPct;
        return a.xPct - b.xPct;
    });
    const json = JSON.stringify(sorted);
    // Simple hash (sync, no crypto needed for fingerprint)
    return simpleHash(json);
}

/**
 * Calculate layout similarity between two sets of descriptors.
 * Uses element-by-element IoU (Intersection over Union).
 * Returns 0.0 (completely different) to 1.0 (identical layout).
 */
export function calculateSimilarity(
    desc1: ElementDescriptor[],
    desc2: ElementDescriptor[],
): number {
    if (desc1.length === 0 && desc2.length === 0) return 1.0;
    if (desc1.length === 0 || desc2.length === 0) return 0.0;

    const maxLen = Math.max(desc1.length, desc2.length);
    const used2 = new Set<number>();
    let totalIoU = 0;

    for (const d1 of desc1) {
        let bestIoU = 0;
        let bestIdx = -1;

        for (let j = 0; j < desc2.length; j++) {
            if (used2.has(j)) continue;
            const iou = elementIoU(d1, desc2[j]);
            if (iou > bestIoU) {
                bestIoU = iou;
                bestIdx = j;
            }
        }
        if (bestIdx >= 0) {
            used2.add(bestIdx);
            totalIoU += bestIoU;
        }
    }

    return totalIoU / maxLen;
}

/**
 * Extract normalized descriptors from design elements.
 */
export function extractDescriptors(elements: DesignElement[], canvasW: number, canvasH: number): ElementDescriptor[] {
    return elements.map(el => {
        const c = el.constraints;
        const x = c.horizontal.offset;
        const y = c.vertical.offset;
        const w = c.size.width;
        const h = c.size.height;
        const fontSize = el.type === 'text' ? el.fontSize : 0;

        return {
            role: el.role ?? el.type,
            xPct: roundTo(x / canvasW, ROUND_STEP),
            yPct: roundTo(y / canvasH, ROUND_STEP),
            wPct: roundTo(w / canvasW, ROUND_STEP),
            hPct: roundTo(h / canvasH, ROUND_STEP),
            fontSizeRatio: roundTo(fontSize / canvasH, ROUND_STEP),
        };
    });
}

/**
 * Check if a layout is a duplicate of any in a list.
 */
export function isDuplicate(
    elements: DesignElement[],
    canvasW: number,
    canvasH: number,
    existingDescriptors: ElementDescriptor[][],
): boolean {
    const newDesc = extractDescriptors(elements, canvasW, canvasH);
    return existingDescriptors.some(
        existing => calculateSimilarity(newDesc, existing) >= DUPLICATE_THRESHOLD,
    );
}

// ── Internal Helpers ──

/** IoU between two element descriptors (position-based) */
function elementIoU(a: ElementDescriptor, b: ElementDescriptor): number {
    // Role mismatch penalty
    const rolePenalty = a.role === b.role ? 1.0 : 0.3;

    // Calculate 2D IoU of bounding boxes
    const ax1 = a.xPct, ay1 = a.yPct, ax2 = a.xPct + a.wPct, ay2 = a.yPct + a.hPct;
    const bx1 = b.xPct, by1 = b.yPct, bx2 = b.xPct + b.wPct, by2 = b.yPct + b.hPct;

    const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
    const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1);
    const intersection = iw * ih;

    const areaA = a.wPct * a.hPct;
    const areaB = b.wPct * b.hPct;
    const union = areaA + areaB - intersection;

    if (union === 0) return a.xPct === b.xPct && a.yPct === b.yPct ? 1.0 : 0.0;
    return (intersection / union) * rolePenalty;
}

/** Round to nearest step */
function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

/** Simple deterministic string hash (djb2 variant → hex) */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
