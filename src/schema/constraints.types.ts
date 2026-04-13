// ─────────────────────────────────────────────────
// Constraint Types – Anchor + Offset Based Layout
// ─────────────────────────────────────────────────
// Elements use constraint-based positioning instead of absolute coordinates (x:100).
// During resizing, the Wasm/JS engine computes actual coordinates from constraints.

export type HorizontalAnchor = 'left' | 'center' | 'right' | 'stretch';
export type VerticalAnchor = 'top' | 'center' | 'bottom' | 'stretch';

export interface HorizontalConstraint {
    anchor: HorizontalAnchor;
    /** Pixel offset from anchor */
    offset: number;
    /** Left/right margin when stretch mode (px) */
    marginLeft?: number;
    marginRight?: number;
}

export interface VerticalConstraint {
    anchor: VerticalAnchor;
    offset: number;
    marginTop?: number;
    marginBottom?: number;
}

export interface SizeConstraint {
    /** 'fixed' = absolute px, 'relative' = % of parent, 'auto' = content-based */
    widthMode: 'fixed' | 'relative' | 'auto';
    heightMode: 'fixed' | 'relative' | 'auto';
    /** px value when fixed, 0~1 ratio when relative */
    width: number;
    height: number;
    /** Min/max size constraints */
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    /** Lock aspect ratio */
    aspectRatioLocked?: boolean;
}

export interface ElementConstraints {
    horizontal: HorizontalConstraint;
    vertical: VerticalConstraint;
    size: SizeConstraint;
    /** Rotation (degrees) */
    rotation: number;
    /** ★ Cached absolute position for perfect same-size roundtrip (set by absoluteToConstraints) */
    _absOrigin?: { x: number; y: number; w: number; h: number; cw: number; ch: number };
}

/**
 * Constraints → actual coordinate calculation
 * (Pure function — replaceable with Wasm in the future)
 */
export function resolveConstraints(
    constraints: ElementConstraints,
    parentWidth: number,
    parentHeight: number,
): { x: number; y: number; width: number; height: number } {
    // ── Width calculation ──
    let width: number;
    if (constraints.size.widthMode === 'fixed') {
        width = constraints.size.width;
    } else if (constraints.size.widthMode === 'relative') {
        width = parentWidth * constraints.size.width;
    } else {
        width = constraints.size.width; // auto fallback
    }

    // ── Height calculation ──
    let height: number;
    if (constraints.size.heightMode === 'fixed') {
        height = constraints.size.height;
    } else if (constraints.size.heightMode === 'relative') {
        height = parentHeight * constraints.size.height;
    } else {
        height = constraints.size.height;
    }

    // Lock aspect ratio
    if (constraints.size.aspectRatioLocked && constraints.size.width > 0 && constraints.size.height > 0) {
        const ratio = constraints.size.width / constraints.size.height;
        height = width / ratio;
    }

    // min/max clamp
    if (constraints.size.minWidth != null) width = Math.max(width, constraints.size.minWidth);
    if (constraints.size.maxWidth != null) width = Math.min(width, constraints.size.maxWidth);
    if (constraints.size.minHeight != null) height = Math.max(height, constraints.size.minHeight);
    if (constraints.size.maxHeight != null) height = Math.min(height, constraints.size.maxHeight);

    // ── X calculation ──
    let x: number;
    const hc = constraints.horizontal;
    switch (hc.anchor) {
        case 'left':
            x = hc.offset;
            break;
        case 'center':
            x = (parentWidth - width) / 2 + hc.offset;
            break;
        case 'right':
            x = parentWidth - width - hc.offset;
            break;
        case 'stretch':
            x = hc.marginLeft ?? 0;
            width = parentWidth - (hc.marginLeft ?? 0) - (hc.marginRight ?? 0);
            break;
    }

    // ── Y calculation ──
    let y: number;
    const vc = constraints.vertical;
    switch (vc.anchor) {
        case 'top':
            y = vc.offset;
            break;
        case 'center':
            y = (parentHeight - height) / 2 + vc.offset;
            break;
        case 'bottom':
            y = parentHeight - height - vc.offset;
            break;
        case 'stretch':
            y = vc.marginTop ?? 0;
            height = parentHeight - (vc.marginTop ?? 0) - (vc.marginBottom ?? 0);
            break;
    }

    return { x: x!, y: y!, width, height };
}
