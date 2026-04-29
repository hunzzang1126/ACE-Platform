// ─────────────────────────────────────────────────
// overlayStyles.ts — Variant-Aware Overlay System
// ─────────────────────────────────────────────────
// v710: Replaces monotonous black scrim with diverse overlay styles.
// Each layout variant maps to a distinct overlay for visual variety.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import type { LayoutVariant } from './layoutRules';
import { hexR, hexG, hexB } from './colorHelpers';

// ── Overlay Style Types ──────────────────────────

export type OverlayStyle =
    | 'scrim'            // Classic dark rect behind content
    | 'gradient-bottom'  // Bottom-to-top gradient fade
    | 'gradient-top'     // Top-to-bottom gradient fade
    | 'full-dim'         // Full canvas dim
    | 'color-wash'       // Brand-colored semi-transparent
    | 'side-panel'       // Side panel overlay (left/right)
    | 'none';            // No overlay (high contrast text)

// ── Variant → Overlay Style Map ──────────────────

const OVERLAY_MAP: Record<LayoutVariant, OverlayStyle> = {
    'centered':        'scrim',
    'left-hero':       'side-panel',
    'offset-right':    'side-panel',
    'top-heavy':       'gradient-top',
    'bottom-stack':    'gradient-bottom',
    'split-left':      'side-panel',
    'minimal-center':  'none',
    'bold-statement':  'full-dim',
    'editorial':       'color-wash',
    'compact-bar':     'gradient-bottom',
};

/** Pick overlay style based on layout variant. */
export function pickOverlayStyle(variant: LayoutVariant): OverlayStyle {
    return OVERLAY_MAP[variant] ?? 'scrim';
}

/** Build overlay elements for a given style. */
export function buildOverlayElements(
    style: OverlayStyle,
    oX: number, oY: number, oW: number, oH: number,
    canvasW: number, canvasH: number, canvasMin: number,
    accentColor: string,
): RenderElement[] {
    switch (style) {
        case 'gradient-bottom':
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: 0, y: Math.round(canvasH * 0.35),
                w: canvasW, h: Math.round(canvasH * 0.65),
                gradient_start_hex: 'rgba(0,0,0,0)',
                gradient_end_hex: '#000000',
                gradient_angle: 180,
                r: 0, g: 0, b: 0, a: 0.55,
            }];

        case 'gradient-top':
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: 0, y: 0,
                w: canvasW, h: Math.round(canvasH * 0.65),
                gradient_start_hex: '#000000',
                gradient_end_hex: 'rgba(0,0,0,0)',
                gradient_angle: 180,
                r: 0, g: 0, b: 0, a: 0.55,
            }];

        case 'full-dim':
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: 0, y: 0, w: canvasW, h: canvasH,
                r: 0, g: 0, b: 0, a: 0.45,
            }];

        case 'color-wash': {
            const cr = hexR(accentColor);
            const cg = hexG(accentColor);
            const cb = hexB(accentColor);
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: 0, y: 0, w: canvasW, h: canvasH,
                r: cr * 0.3, g: cg * 0.3, b: cb * 0.3, a: 0.55,
            }];
        }

        case 'side-panel': {
            // Panel on the content side with slight rounded corners
            const panelPad = Math.round(canvasMin * 0.02);
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: Math.max(0, oX - panelPad),
                y: Math.max(0, oY - panelPad),
                w: Math.min(canvasW, oW + panelPad * 2),
                h: Math.min(canvasH, oH + panelPad * 2),
                r: 0, g: 0, b: 0, a: 0.40,
                radius: Math.round(canvasMin * 0.025),
            }];
        }

        case 'none':
            // No overlay — text relies on color contrast alone
            return [];

        case 'scrim':
        default:
            return [{
                name: 'text_overlay',
                type: 'rect' as any,
                x: oX, y: oY, w: oW, h: oH,
                r: 0, g: 0, b: 0, a: 0.35,
                radius: Math.round(canvasMin * 0.02),
            }];
    }
}
