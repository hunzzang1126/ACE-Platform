// ─────────────────────────────────────────────────
// layoutValidator.ts — Math-Based Layout Validation
// ─────────────────────────────────────────────────
// Pure math validation for RenderElement[] arrays.
// Runs AFTER design generation, BEFORE rendering.
//
// Replaces AI pixel-guessing with deterministic rules:
//   1. Boundary clamping (all elements within canvas)
//   2. Text edge padding
//   3. Overlap detection + FONT SHRINK (not just nudge)
//   4. Hierarchy enforcement (headline = largest font)
//   5. CTA alignment (label centered on button)
//   6. Minimum font size enforcement
//   7. Proportional guard (no single element > 95% canvas)
//
// Used in:
//   - Phase 5: After combine, before render
//   - Phase 8: After smart sizing, per variant
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';

// ── Types ────────────────────────────────────────

export interface ValidationResult {
    /** Fixed elements (same format, safe to render) */
    elements: RenderElement[];
    /** Readable log of what was fixed */
    fixes: string[];
    /** True if no fixes were needed */
    isClean: boolean;
}

interface BBox {
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
    idx: number;
}

// ── Constants ────────────────────────────────────

const MIN_FONT_SIZE = 8;
const MIN_TEXT_GAP = 8;   // px between text bounding boxes
const MIN_EDGE_PAD = 4;   // px from canvas edges for text
const MAX_ELEMENT_RATIO = 0.95; // no element > 95% of canvas

// ── Rule 1: Boundary Clamping ────────────────────

function clampBounds(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
    fixes: string[],
): void {
    for (const el of elements) {
        // Skip background (intentionally full-canvas)
        if (el.name === 'background') continue;

        const origX = el.x;
        const origY = el.y;

        // Clamp position: element must start within canvas
        if (el.x < 0) el.x = 0;
        if (el.y < 0) el.y = 0;

        // Clamp: element must not extend past canvas right/bottom
        if (el.x + el.w > canvasW) {
            el.x = Math.max(0, canvasW - el.w);
            if (el.x + el.w > canvasW) {
                // Element wider than canvas — shrink width
                el.w = canvasW;
                el.x = 0;
            }
        }
        if (el.y + el.h > canvasH) {
            el.y = Math.max(0, canvasH - el.h);
            if (el.y + el.h > canvasH) {
                el.h = canvasH;
                el.y = 0;
            }
        }

        if (el.x !== origX || el.y !== origY) {
            fixes.push(`Clamped "${el.name}" from (${origX},${origY}) to (${el.x},${el.y})`);
        }
    }
}

// ── Rule 2: Text Edge Padding ─────────────────

function enforceTextPadding(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
    fixes: string[],
): void {
    const pad = Math.max(MIN_EDGE_PAD, Math.round(Math.min(canvasW, canvasH) * 0.03));

    for (const el of elements) {
        if (el.type !== 'text') continue;
        if (el.name === 'background') continue;

        let fixed = false;
        if (el.x < pad) { el.x = pad; fixed = true; }
        if (el.y < pad) { el.y = pad; fixed = true; }
        if (el.x + el.w > canvasW - pad) {
            el.w = Math.max(20, canvasW - pad - el.x);
            fixed = true;
        }

        if (fixed) {
            fixes.push(`Added ${pad}px edge padding to text "${el.name}"`);
        }
    }
}

// ── Helper: Estimate text height from font size + content ──

function estimateTextHeight(el: RenderElement): number {
    if (!el.font_size || !el.content || !el.w) return el.h;
    const charWidth = el.font_size * 0.55;
    const charsPerLine = Math.max(1, Math.floor(el.w / charWidth));
    const textLen = el.content.replace(/\n/g, '').length;
    const explicitLines = el.content.split(/\n/).length;
    const wrapLines = Math.ceil(textLen / charsPerLine);
    const lines = Math.max(explicitLines, wrapLines);
    return Math.round(el.font_size * 1.45 * lines + 8);
}

// ── Rule 3: Overlap Detection + Font Shrink ──────
// ★ KEY FIX: When text elements overlap, SHRINK font sizes to reduce
//   line count. Only falls back to Y-nudge if fonts are at minimum.
//   Runs multiple passes until no overlaps remain.

function fixOverlaps(
    elements: RenderElement[],
    canvasH: number,
    fixes: string[],
): void {
    const MAX_PASSES = 10;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        // Refresh text bounding boxes each pass (sizes may have changed)
        const textBoxes: BBox[] = [];
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i]!;
            if (el.type !== 'text') continue;
            textBoxes.push({ x: el.x, y: el.y, w: el.w, h: el.h, name: el.name ?? `text_${i}`, idx: i });
        }
        textBoxes.sort((a, b) => a.y - b.y);

        let hadOverlap = false;

        for (let i = 0; i < textBoxes.length - 1; i++) {
            const a = textBoxes[i]!;
            const b = textBoxes[i + 1]!;

            // Skip non-overlapping horizontally (different columns)
            const hOverlap = a.x < b.x + b.w && b.x < a.x + a.w;
            if (!hOverlap) continue;

            // Check vertical gap
            const gap = b.y - (a.y + a.h);
            if (gap >= MIN_TEXT_GAP) continue;

            hadOverlap = true;

            const elA = elements[a.idx]!;
            const elB = elements[b.idx]!;

            // ★ Strategy 1: SHRINK fonts to reduce line count
            const canShrinkA = (elA.font_size ?? 0) > MIN_FONT_SIZE;
            const canShrinkB = (elB.font_size ?? 0) > MIN_FONT_SIZE;

            if (canShrinkA || canShrinkB) {
                if (canShrinkA && elA.font_size) {
                    const oldFs = elA.font_size;
                    elA.font_size = Math.max(MIN_FONT_SIZE, elA.font_size - 2);
                    elA.h = estimateTextHeight(elA);
                    a.h = elA.h;
                    if (elA.font_size !== oldFs) {
                        fixes.push(`Shrunk "${a.name}" font ${oldFs}->${elA.font_size}px to fix overlap`);
                    }
                }
                if (canShrinkB && elB.font_size) {
                    const oldFs = elB.font_size;
                    elB.font_size = Math.max(MIN_FONT_SIZE, elB.font_size - 2);
                    elB.h = estimateTextHeight(elB);
                    b.h = elB.h;
                    if (elB.font_size !== oldFs) {
                        fixes.push(`Shrunk "${b.name}" font ${oldFs}->${elB.font_size}px to fix overlap`);
                    }
                }

                // Reposition B below A with proper gap
                elB.y = elA.y + elA.h + MIN_TEXT_GAP;
                b.y = elB.y;

                // Clamp to canvas bottom
                if (elB.y + elB.h > canvasH) {
                    elB.y = Math.max(0, canvasH - elB.h);
                    b.y = elB.y;
                }
            } else {
                // ★ Strategy 2: Last resort — nudge Y (fonts at minimum)
                const nudge = MIN_TEXT_GAP - gap;
                elB.y += nudge;
                b.y += nudge;

                if (elB.y + elB.h > canvasH) {
                    elB.y = Math.max(0, canvasH - elB.h);
                    b.y = elB.y;
                }
                fixes.push(`Nudged "${b.name}" down ${nudge}px (fonts at minimum)`);
            }
        }

        if (!hadOverlap) break; // All clean — done
    }
}

// ── Rule 4: Hierarchy Enforcement ────────────────

function enforceHierarchy(
    elements: RenderElement[],
    fixes: string[],
): void {
    const headline = elements.find(e => e.name === 'headline');
    if (!headline || !headline.font_size) return;

    // Find other text elements that are unintentionally larger
    for (const el of elements) {
        if (el.type !== 'text') continue;
        if (el.name === 'headline') continue;
        if (!el.font_size) continue;

        if (el.font_size > headline.font_size) {
            const oldSize = el.font_size;
            el.font_size = Math.round(headline.font_size * 0.7);
            fixes.push(`Reduced "${el.name}" font ${oldSize}->${el.font_size}px (headline must be largest)`);
        }
    }
}

// ── Rule 5: CTA Alignment ────────────────────────

function alignCTA(
    elements: RenderElement[],
    fixes: string[],
): void {
    const button = elements.find(e => e.name === 'cta_button');
    const label = elements.find(e => e.name === 'cta_label');
    if (!button || !label) return;

    // Label should be horizontally centered within button
    if (label.x !== button.x || label.w !== button.w) {
        label.x = button.x;
        label.w = button.w;
        fixes.push('Aligned CTA label horizontally with CTA button');
    }

    // Label should be vertically centered within button
    const labelH = label.font_size ? label.font_size + 4 : label.h;
    const expectedY = button.y + Math.round((button.h - labelH) / 2);
    if (Math.abs(label.y - expectedY) > 2) {
        label.y = expectedY;
        label.h = labelH;
        fixes.push('Aligned CTA label vertically within CTA button');
    }
}

// ── Rule 6: Minimum Font Size ────────────────────

function enforceMinFont(
    elements: RenderElement[],
    fixes: string[],
): void {
    for (const el of elements) {
        if (el.type !== 'text') continue;
        if (!el.font_size || el.font_size >= MIN_FONT_SIZE) continue;

        const old = el.font_size;
        el.font_size = MIN_FONT_SIZE;
        fixes.push(`Increased "${el.name}" font ${old}->${MIN_FONT_SIZE}px (minimum)`);
    }
}

// ── Rule 7: Proportional Guard ───────────────────

function proportionalGuard(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
    fixes: string[],
): void {
    const maxW = canvasW * MAX_ELEMENT_RATIO;
    const maxH = canvasH * MAX_ELEMENT_RATIO;

    for (const el of elements) {
        if (el.name === 'background') continue;
        if (el.name?.includes('overlay')) continue; // overlays can be large

        if (el.w > maxW) {
            el.w = Math.round(maxW);
            fixes.push(`Shrunk "${el.name}" width to ${el.w}px (max ${Math.round(MAX_ELEMENT_RATIO * 100)}% of canvas)`);
        }
        if (el.h > maxH) {
            el.h = Math.round(maxH);
            fixes.push(`Shrunk "${el.name}" height to ${el.h}px (max ${Math.round(MAX_ELEMENT_RATIO * 100)}% of canvas)`);
        }
    }
}

// ── Main Entry Point ─────────────────────────────

/**
 * Validate and fix a RenderElement[] array using deterministic math rules.
 * Returns the same array (mutated) with fixes applied.
 * This replaces the old AI pixel-guessing approach.
 */
export function validateLayout(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
): ValidationResult {
    // Deep clone to avoid mutating the original
    const els = elements.map(e => ({ ...e }));
    const fixes: string[] = [];

    // Apply rules in order
    clampBounds(els, canvasW, canvasH, fixes);
    enforceTextPadding(els, canvasW, canvasH, fixes);
    enforceMinFont(els, fixes);
    enforceHierarchy(els, fixes);
    alignCTA(els, fixes);
    fixOverlaps(els, canvasH, fixes);
    proportionalGuard(els, canvasW, canvasH, fixes);

    if (fixes.length > 0) {
        console.log(`[LayoutValidator] Applied ${fixes.length} fix(es):`, fixes);
    }

    return {
        elements: els,
        fixes,
        isClean: fixes.length === 0,
    };
}
