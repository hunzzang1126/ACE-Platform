// ─────────────────────────────────────────────────
// designPolish — Post-render design quality auto-fixes
// ─────────────────────────────────────────────────
// ★ v735: Automated quality pass after template processing.
// Fixes contrast, overflow, and CTA sizing issues.
// All fixes are deterministic (zero API cost).
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';

/**
 * Relative luminance from hex color (WCAG 2.0 formula).
 */
function luminance(hex: string): number {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * WCAG contrast ratio between two hex colors.
 * Returns ratio between 1 (no contrast) and 21 (max contrast).
 */
function contrastRatio(fg: string, bg: string): number {
    const lFg = luminance(fg);
    const lBg = luminance(bg);
    const lighter = Math.max(lFg, lBg);
    const darker = Math.min(lFg, lBg);
    return (lighter + 0.05) / (darker + 0.05);
}

export interface PolishResult {
    elements: RenderElement[];
    fixes: string[];
}

/**
 * Run automated design quality fixes on rendered elements.
 * - Contrast: ensures text is readable against background
 * - Overflow: clamps elements within canvas bounds
 * - CTA sizing: enforces minimum button dimensions
 */
export function polishDesign(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
    bgColor: string,
): PolishResult {
    const fixes: string[] = [];
    const result = elements.map(el => {
        const copy = { ...el };

        // ── Contrast fix: ensure text is readable ──
        if (copy.type === 'text' && copy.color_hex) {
            const ratio = contrastRatio(copy.color_hex, bgColor);
            if (ratio < 3.0) {
                // Poor contrast — flip to white or dark based on background luminance
                const bgLum = luminance(bgColor);
                const newColor = bgLum > 0.5 ? '#1A1A2E' : '#FFFFFF';
                fixes.push(`Contrast fix: "${copy.name}" ${copy.color_hex} → ${newColor} (ratio was ${ratio.toFixed(1)})`);
                copy.color_hex = newColor;
            }
        }

        // ── Overflow guard: clamp within canvas ──
        if (copy.type === 'text') {
            if ((copy.x ?? 0) + (copy.w ?? 0) > canvasW + 5) {
                copy.w = Math.round(canvasW - (copy.x ?? 0) - 8);
                fixes.push(`Overflow fix: "${copy.name}" width clamped to ${copy.w}`);
            }
            if ((copy.y ?? 0) + (copy.h ?? 0) > canvasH + 5) {
                copy.h = Math.round(canvasH - (copy.y ?? 0) - 4);
                fixes.push(`Overflow fix: "${copy.name}" height clamped to ${copy.h}`);
            }
        }

        // ── CTA minimum size: buttons must be tappable ──
        const name = (copy.name ?? '').toLowerCase();
        if ((copy.type === 'rounded_rect' || (copy.radius && copy.radius > 0)) &&
            (name.includes('cta') || name.includes('button'))) {
            if ((copy.w ?? 0) < 80) {
                fixes.push(`CTA fix: "${copy.name}" width ${copy.w} → 80px minimum`);
                copy.w = 80;
            }
            if ((copy.h ?? 0) < 30) {
                fixes.push(`CTA fix: "${copy.name}" height ${copy.h} → 30px minimum`);
                copy.h = 30;
            }
        }

        return copy;
    });

    if (fixes.length > 0) {
        console.log(`[designPolish] Applied ${fixes.length} auto-fix(es):`, fixes.join(' | '));
    }

    return { elements: result, fixes };
}
