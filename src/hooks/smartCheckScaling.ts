// ─────────────────────────────────────────────────
// smartCheckScaling — Element scaling + clipping for Smart Check
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/elements.types';
import { constraintsToAbsolute } from '@/engine/elementConverters';

/**
 * Proportionally scale a single element's constraints
 * from master size (mW×mH) to target size (tW×tH).
 *
 * SAFE: Never changes anchor type. Keeps relative constraints as-is.
 * Only adjusts fixed offset values proportionally.
 */
export function scaleElementToTarget(
    el: DesignElement,
    masterW: number, masterH: number,
    targetW: number, targetH: number,
): Partial<DesignElement> {
    const scaleX = targetW / masterW;
    const scaleY = targetH / masterH;
    const c = el.constraints;
    const patch: Record<string, unknown> = {};
    const newConstraints = JSON.parse(JSON.stringify(c));
    let changed = false;

    // Horizontal
    if (c.horizontal.anchor === 'stretch') {
        if (c.horizontal.marginLeft !== undefined) { newConstraints.horizontal.marginLeft = Math.round(c.horizontal.marginLeft * scaleX); changed = true; }
        if (c.horizontal.marginRight !== undefined) { newConstraints.horizontal.marginRight = Math.round(c.horizontal.marginRight * scaleX); changed = true; }
    } else {
        newConstraints.horizontal.offset = Math.round(c.horizontal.offset * scaleX);
        changed = true;
    }

    // Vertical
    if (c.vertical.anchor === 'stretch') {
        if (c.vertical.marginTop !== undefined) { newConstraints.vertical.marginTop = Math.round(c.vertical.marginTop * scaleY); changed = true; }
        if (c.vertical.marginBottom !== undefined) { newConstraints.vertical.marginBottom = Math.round(c.vertical.marginBottom * scaleY); changed = true; }
    } else {
        newConstraints.vertical.offset = Math.round(c.vertical.offset * scaleY);
        changed = true;
    }

    // Size: scale fixed dimensions; keep relative as-is
    if (c.size.widthMode === 'fixed') { newConstraints.size.width = Math.max(1, Math.round(c.size.width * scaleX)); changed = true; }
    if (c.size.heightMode === 'fixed') { newConstraints.size.height = Math.max(1, Math.round(c.size.height * scaleY)); changed = true; }

    if (changed) patch.constraints = newConstraints;

    // Scale font size for text / button elements
    if ((el.type === 'text' || el.type === 'button') && 'fontSize' in el) {
        const el2 = el as DesignElement & { fontSize: number };
        const uniformScale = Math.min(scaleX, scaleY);
        const newFs = Math.max(8, Math.round(el2.fontSize * uniformScale));
        if (newFs !== el2.fontSize) patch.fontSize = newFs;
    }

    return patch as Partial<DesignElement>;
}

/**
 * If an element is completely outside the canvas, nudge it back in.
 * Does NOT move elements that are partially visible.
 */
export function clipOutOfBounds(
    el: DesignElement, canvasW: number, canvasH: number,
): { elementId: string; patch: Partial<DesignElement> } | null {
    const bounds = constraintsToAbsolute(el.constraints, canvasW, canvasH);
    const isCompletelyOut = bounds.x + bounds.w < 0 || bounds.y + bounds.h < 0 || bounds.x > canvasW || bounds.y > canvasH;
    if (!isCompletelyOut) return null;

    const newX = Math.max(8, Math.min(bounds.x, canvasW - bounds.w - 8));
    const newY = Math.max(8, Math.min(bounds.y, canvasH - bounds.h - 8));

    return {
        elementId: el.id,
        patch: { constraints: { ...el.constraints, horizontal: { anchor: 'left', offset: Math.round(newX) }, vertical: { anchor: 'top', offset: Math.round(newY) } } },
    };
}
