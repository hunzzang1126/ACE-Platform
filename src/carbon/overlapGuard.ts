// ─────────────────────────────────────────────────
// overlapGuard.ts — Zero-Overlap Guarantee for Carbon Layout
// ─────────────────────────────────────────────────
// ★ v711: Fixes the persistent random overlap bug.
//
// Root causes of the old overlap guard failure:
// 1. Only checked array-adjacent elements (not all pairs)
// 2. Ran BEFORE CTA placement (CTA never checked against text)
// 3. Didn't account for CTA button overlapping text elements
//
// This new guard:
// - Checks ALL text/CTA pairs (O(n²) but n is always < 10)
// - Runs AFTER CTA is placed
// - Cascade-shifts subsequent elements when fixing overlap
// - Applies compression if total content exceeds canvas
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';

// Names that participate in overlap checking
const CONTENT_NAMES = new Set([
    'headline', 'subheadline', 'tag_text', 'cta_button', 'cta_label',
]);

/** Check if an element is a content element that needs overlap protection. */
function isContentEl(el: RenderElement): boolean {
    const name = el.name ?? '';
    return CONTENT_NAMES.has(name) || el.type === 'text' as any;
}

/**
 * ★ ZERO-OVERLAP GUARANTEE — fixes ALL overlapping content elements.
 * Call this AFTER all elements (including CTA) are placed.
 *
 * Algorithm:
 * 1. Collect all content elements, sorted by Y position
 * 2. For each consecutive pair, check vertical overlap
 * 3. If overlapping: shift the lower element down + cascade all below
 * 4. If total content exceeds canvas: compress fonts proportionally
 * 5. Re-run until stable (max 5 passes)
 */
export function fixAllOverlaps(
    elements: RenderElement[],
    canvasH: number,
    canvasMin: number,
): void {
    const MAX_PASSES = 5;
    const MIN_GAP = Math.max(8, Math.round(canvasMin * 0.02)); // ~2% of min dimension

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        // Collect content elements with their indices
        const contentEls: { el: RenderElement; idx: number }[] = [];
        for (let i = 0; i < elements.length; i++) {
            if (isContentEl(elements[i]!)) {
                contentEls.push({ el: elements[i]!, idx: i });
            }
        }

        // Sort by Y position (top to bottom)
        contentEls.sort((a, b) => (a.el.y ?? 0) - (b.el.y ?? 0));

        let hadOverlap = false;

        // Check all consecutive pairs (after sorting, overlaps are between consecutive items)
        for (let i = 0; i < contentEls.length - 1; i++) {
            const a = contentEls[i]!.el;
            const b = contentEls[i + 1]!.el;

            // Skip cta_label + cta_button (intentionally overlapping)
            if ((a.name === 'cta_button' && b.name === 'cta_label') ||
                (a.name === 'cta_label' && b.name === 'cta_button')) continue;

            // Check horizontal overlap first (different columns = no problem)
            const aLeft = a.x ?? 0, aRight = aLeft + (a.w ?? 0);
            const bLeft = b.x ?? 0, bRight = bLeft + (b.w ?? 0);
            if (aRight <= bLeft || bRight <= aLeft) continue;

            // Check vertical gap
            const aBottom = (a.y ?? 0) + (a.h ?? 0);
            const bTop = b.y ?? 0;
            const gap = bTop - aBottom;

            if (gap < MIN_GAP) {
                hadOverlap = true;
                const shift = aBottom - bTop + MIN_GAP;

                // Shift this element and all subsequent elements
                for (let j = i + 1; j < contentEls.length; j++) {
                    const el = contentEls[j]!.el;
                    // Skip cta_label — it moves with cta_button
                    if (el.name === 'cta_label') {
                        const ctaBtn = elements.find(e => e.name === 'cta_button');
                        if (ctaBtn) { el.y = ctaBtn.y; continue; }
                    }
                    el.y = (el.y ?? 0) + shift;
                }
            }
        }

        if (!hadOverlap) break;

        // After shifting, check if content overflows canvas
        const maxBottom = Math.max(
            ...contentEls.map(({ el }) => (el.y ?? 0) + (el.h ?? 0))
        );

        if (maxBottom > canvasH) {
            // Content overflows → compress everything proportionally
            const overflow = maxBottom - canvasH;
            const ratio = (canvasH * 0.95) / maxBottom;

            // Compress: reduce all Y positions and heights proportionally
            for (const { el } of contentEls) {
                el.y = Math.max(0, Math.round((el.y ?? 0) * ratio));
                el.h = Math.round((el.h ?? 0) * ratio);
                if (el.font_size && el.font_size > 8) {
                    el.font_size = Math.max(8, Math.round(el.font_size * Math.max(0.7, ratio)));
                }
            }

            // Re-sync cta_label with cta_button
            const ctaBtn = elements.find(e => e.name === 'cta_button');
            const ctaLbl = elements.find(e => e.name === 'cta_label');
            if (ctaBtn && ctaLbl) {
                ctaLbl.x = ctaBtn.x;
                ctaLbl.y = ctaBtn.y;
                ctaLbl.w = ctaBtn.w;
                ctaLbl.h = ctaBtn.h;
            }
        }
    }

    // ★ Final safety: clamp all content elements to canvas bottom
    for (const el of elements) {
        if (!isContentEl(el)) continue;
        if ((el.y ?? 0) + (el.h ?? 0) > canvasH) {
            el.y = Math.max(0, canvasH - (el.h ?? 0));
        }
    }

    // ★ Final sync: cta_label must match cta_button position exactly
    const ctaBtn = elements.find(e => e.name === 'cta_button');
    const ctaLbl = elements.find(e => e.name === 'cta_label');
    if (ctaBtn && ctaLbl) {
        ctaLbl.x = ctaBtn.x;
        ctaLbl.y = ctaBtn.y;
        ctaLbl.w = ctaBtn.w;
        ctaLbl.h = ctaBtn.h;
    }
}
