// ─────────────────────────────────────────────────
// Smart Layout Engine — Aspect-Ratio-Aware Element Positioning
// ─────────────────────────────────────────────────
// The core differentiator of ACE: given an element's semantic role
// and a target canvas size, compute the optimal constraints.
//
// Layout patterns:
//   ULTRA-WIDE (970×250, 728×90): horizontal flow — logo LEFT, headline CENTER, CTA RIGHT
//   LANDSCAPE  (300×250, 336×280): vertical stack — centered, standard hierarchy
//   SQUARE     (250×250):          compact vertical stack
//   PORTRAIT   (160×600, 120×600): tall vertical — logo TOP, headline MULTI-LINE, CTA BOTTOM
// ─────────────────────────────────────────────────

import type { ElementConstraints } from '@/schema/constraints.types';
import { resolveConstraints } from '@/schema/constraints.types';
import type { LayoutRole, AspectCategory } from '@/schema/layoutRoles';
import { getAspectCategory } from '@/schema/layoutRoles';

/**
 * Extra props needed for smart constraint computation.
 * These come from the element being positioned.
 */
export interface SmartLayoutInput {
    role: LayoutRole;
    canvasW: number;
    canvasH: number;
    /** Element's current/desired width (px) — used for fixed-size elements */
    elWidth?: number;
    /** Element's current/desired height (px) */
    elHeight?: number;
    /** Font size (for text/button elements) */
    fontSize?: number;
    /** Number of text lines to allocate vertical space for */
    lineCount?: number;
}

// ── Internal sizing helpers ──────────────────────

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

/** Compute a reasonable font size given canvas dimensions */
function scaledFontSize(base: number, canvasW: number, canvasH: number): number {
    const minDim = Math.min(canvasW, canvasH);
    if (minDim < 100) return Math.max(8, base * 0.5);
    if (minDim < 200) return Math.max(9, base * 0.7);
    return base;
}

/** Compute text element height given font size and line count */
function textHeight(fontSize: number, lines: number = 1): number {
    return Math.ceil(fontSize * 1.4 * lines + 4);
}

// ── Layout rule tables per aspect category ───────

interface PositionRule {
    hAnchor: 'left' | 'center' | 'right' | 'stretch';
    hOffsetPct: number;     // % of canvas width
    vAnchor: 'top' | 'center' | 'bottom';
    vOffsetPct: number;     // % of canvas height
    widthPct: number;       // % of canvas width (0 = use elWidth)
    heightPct: number;      // % of canvas height (0 = use elHeight)
    fontScale?: number;     // multiplier vs base font size
    maxLines?: number;      // forced line count for text reflow
}

// ── ULTRA-WIDE: logo LEFT — headline CENTER — CTA RIGHT ──

const ULTRA_WIDE_RULES: Partial<Record<LayoutRole, PositionRule>> = {
    background: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 1 },
    accent: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 0.14 },
    logo: { hAnchor: 'left', hOffsetPct: 0.03, vAnchor: 'center', vOffsetPct: 0, widthPct: 0.15, heightPct: 0 },
    headline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: -0.08, widthPct: 0.45, heightPct: 0, fontScale: 0.9, maxLines: 1 },
    subline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0.12, widthPct: 0.4, heightPct: 0, fontScale: 0.85 },
    detail: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0.25, widthPct: 0.35, heightPct: 0, fontScale: 0.8 },
    cta: { hAnchor: 'right', hOffsetPct: 0.04, vAnchor: 'center', vOffsetPct: 0, widthPct: 0.18, heightPct: 0 },
    tnc: { hAnchor: 'right', hOffsetPct: 0.03, vAnchor: 'bottom', vOffsetPct: 0.04, widthPct: 0.25, heightPct: 0, fontScale: 0.6 },
    hero: { hAnchor: 'left', hOffsetPct: 0.02, vAnchor: 'center', vOffsetPct: 0, widthPct: 0.3, heightPct: 0.85 },
    badge: { hAnchor: 'right', hOffsetPct: 0.02, vAnchor: 'top', vOffsetPct: 0.05, widthPct: 0.1, heightPct: 0 },
};

// ── LANDSCAPE: standard vertical stack, centered ──

const LANDSCAPE_RULES: Partial<Record<LayoutRole, PositionRule>> = {
    background: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 1 },
    accent: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 0.12 },
    logo: { hAnchor: 'left', hOffsetPct: 0.04, vAnchor: 'top', vOffsetPct: 0.04, widthPct: 0.25, heightPct: 0 },
    headline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.18, widthPct: 0.85, heightPct: 0, maxLines: 2 },
    subline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.38, widthPct: 0.8, heightPct: 0, fontScale: 0.85 },
    detail: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.52, widthPct: 0.75, heightPct: 0, fontScale: 0.8 },
    cta: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.14, widthPct: 0.55, heightPct: 0 },
    tnc: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.03, widthPct: 0.8, heightPct: 0, fontScale: 0.65 },
    hero: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0, widthPct: 0.9, heightPct: 0.5 },
    badge: { hAnchor: 'right', hOffsetPct: 0.03, vAnchor: 'top', vOffsetPct: 0.03, widthPct: 0.15, heightPct: 0 },
};

// ── SQUARE: compact vertical stack ──

const SQUARE_RULES: Partial<Record<LayoutRole, PositionRule>> = {
    background: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 1 },
    accent: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 0.1 },
    logo: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.05, widthPct: 0.3, heightPct: 0 },
    headline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.2, widthPct: 0.85, heightPct: 0, maxLines: 2 },
    subline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.42, widthPct: 0.8, heightPct: 0, fontScale: 0.85 },
    detail: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0.1, widthPct: 0.75, heightPct: 0, fontScale: 0.8 },
    cta: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.14, widthPct: 0.6, heightPct: 0 },
    tnc: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.03, widthPct: 0.85, heightPct: 0, fontScale: 0.65 },
    hero: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: -0.05, widthPct: 0.9, heightPct: 0.45 },
    badge: { hAnchor: 'right', hOffsetPct: 0.03, vAnchor: 'top', vOffsetPct: 0.03, widthPct: 0.18, heightPct: 0 },
};

// ── PORTRAIT: logo TOP — headline MULTI-LINE CENTER — CTA BOTTOM ──

const PORTRAIT_RULES: Partial<Record<LayoutRole, PositionRule>> = {
    background: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 1 },
    accent: { hAnchor: 'stretch', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0, widthPct: 1, heightPct: 0.05 },
    logo: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.04, widthPct: 0.5, heightPct: 0 },
    headline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: -0.1, widthPct: 0.85, heightPct: 0, fontScale: 0.8, maxLines: 3 },
    subline: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0.08, widthPct: 0.8, heightPct: 0, fontScale: 0.75 },
    detail: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'center', vOffsetPct: 0.18, widthPct: 0.75, heightPct: 0, fontScale: 0.7 },
    cta: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.1, widthPct: 0.7, heightPct: 0 },
    tnc: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'bottom', vOffsetPct: 0.02, widthPct: 0.85, heightPct: 0, fontScale: 0.6 },
    hero: { hAnchor: 'center', hOffsetPct: 0, vAnchor: 'top', vOffsetPct: 0.1, widthPct: 0.9, heightPct: 0.3 },
    badge: { hAnchor: 'right', hOffsetPct: 0.05, vAnchor: 'top', vOffsetPct: 0.03, widthPct: 0.25, heightPct: 0 },
};

const RULES_BY_CATEGORY: Record<AspectCategory, Partial<Record<LayoutRole, PositionRule>>> = {
    'ultra-wide': ULTRA_WIDE_RULES,
    'landscape': LANDSCAPE_RULES,
    'square': SQUARE_RULES,
    'portrait': PORTRAIT_RULES,
};

// ── Main API ─────────────────────────────────────

/**
 * Compute optimal constraints for an element based on its semantic role
 * and the target canvas size.
 *
 * This is the core of ACE Smart Sizing — it knows that:
 * - Ultra-wide: logo LEFT, headline CENTER, CTA RIGHT
 * - Portrait:   logo TOP, headline MULTI-LINE CENTER, CTA BOTTOM
 * - Landscape:  standard vertical stack
 */
export function computeSmartConstraints(input: SmartLayoutInput): ElementConstraints {
    const { role, canvasW, canvasH, fontSize: baseFontSize } = input;
    const category = getAspectCategory(canvasW, canvasH);
    const rules = RULES_BY_CATEGORY[category];
    const rule = rules[role];

    // Fallback: no rule for this role — use basic center positioning
    if (!rule) {
        return fallbackConstraints(input);
    }

    const fontSize = baseFontSize
        ? scaledFontSize(baseFontSize * (rule.fontScale ?? 1), canvasW, canvasH)
        : 14;

    // ── Width ──
    let widthMode: 'fixed' | 'relative' = 'fixed';
    let width: number;
    if (rule.hAnchor === 'stretch') {
        widthMode = 'relative';
        width = 1; // 100%
    } else if (rule.widthPct > 0) {
        width = Math.round(canvasW * rule.widthPct);
    } else {
        width = input.elWidth ?? Math.round(canvasW * 0.5);
    }

    // ── Height ──
    let height: number;
    if (rule.heightPct > 0) {
        height = Math.round(canvasH * rule.heightPct);
    } else if (role === 'headline' || role === 'subline' || role === 'detail' || role === 'tnc') {
        const lines = rule.maxLines ?? input.lineCount ?? 1;
        height = textHeight(fontSize, lines);
    } else if (role === 'cta') {
        height = clamp(Math.round(canvasH * 0.14), 28, 44);
    } else {
        height = input.elHeight ?? Math.round(canvasH * 0.1);
    }

    // ── Horizontal offset ──
    let hOffset: number;
    if (rule.hAnchor === 'stretch') {
        hOffset = 0;
    } else if (rule.hAnchor === 'center') {
        hOffset = Math.round(canvasW * rule.hOffsetPct);
    } else if (rule.hAnchor === 'left') {
        hOffset = Math.round(canvasW * rule.hOffsetPct);
    } else {
        // right
        hOffset = Math.round(canvasW * rule.hOffsetPct);
    }

    // ── Vertical offset ──
    let vOffset: number;
    if (rule.vAnchor === 'center') {
        vOffset = Math.round(canvasH * rule.vOffsetPct);
    } else if (rule.vAnchor === 'top') {
        vOffset = Math.round(canvasH * rule.vOffsetPct);
    } else {
        // bottom
        vOffset = Math.round(canvasH * rule.vOffsetPct);
    }

    return {
        horizontal: {
            anchor: rule.hAnchor,
            offset: hOffset,
            ...(rule.hAnchor === 'stretch' ? { marginLeft: 0, marginRight: 0 } : {}),
        },
        vertical: {
            anchor: rule.vAnchor,
            offset: vOffset,
        },
        size: {
            widthMode,
            heightMode: 'fixed',
            width,
            height,
        },
        rotation: 0,
    };
}

/**
 * Check if a given set of constraints would cause an element to be
 * partially or fully outside the canvas bounds.
 */
export function isOutOfBounds(
    constraints: ElementConstraints,
    canvasW: number,
    canvasH: number,
): boolean {
    // Use the already-imported resolveConstraints to get actual coordinates
    const resolved = resolveConstraints(constraints, canvasW, canvasH);
    return resolved.x + resolved.width < 0 || resolved.y + resolved.height < 0 || resolved.x > canvasW || resolved.y > canvasH;
}

/**
 * Get the recommended font size for a given role in a canvas.
 */
export function getSmartFontSize(role: LayoutRole, canvasW: number, canvasH: number): number {
    const minDim = Math.min(canvasW, canvasH);
    const baseSizes: Partial<Record<LayoutRole, number>> = {
        headline: 24,
        subline: 16,
        detail: 13,
        tnc: 9,
        cta: 14,
        badge: 11,
    };
    const base = baseSizes[role] ?? 14;
    return scaledFontSize(base, canvasW, canvasH);
}

// ── Fallback ─────────────────────────────────────

function fallbackConstraints(input: SmartLayoutInput): ElementConstraints {
    return {
        horizontal: { anchor: 'center', offset: 0 },
        vertical: { anchor: 'center', offset: 0 },
        size: {
            widthMode: 'fixed',
            heightMode: 'fixed',
            width: input.elWidth ?? Math.round(input.canvasW * 0.5),
            height: input.elHeight ?? Math.round(input.canvasH * 0.1),
        },
        rotation: 0,
    };
}
