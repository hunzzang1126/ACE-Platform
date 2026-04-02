// ─────────────────────────────────────────────────
// smartSizingExtended.test.ts — Image BG + text fit + clamp
// ─────────────────────────────────────────────────
// Covers uncovered lines: 57-60 (image BG aspect), 109-128 (postStretchTextFit)

import { describe, it, expect } from 'vitest';
import { smartSizeElements } from './smartSizing';
import type { DesignElement, ImageElement, TextElement } from '@/schema/elements.types';

function makeBGImage(w: number, h: number): ImageElement {
    return {
        id: 'bg-img', type: 'image', name: 'Background', src: 'idb://hash',
        visible: true, locked: false, opacity: 1, zIndex: 0,
        constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h } },
    } as ImageElement;
}

function makeText(id: string, fontSize: number, x: number, y: number, w: number, h: number): TextElement {
    return {
        id, type: 'text', name: `Text-${id}`, content: 'Hello',
        fontFamily: 'Inter', fontSize, fontWeight: 400, fontStyle: 'normal',
        color: '#fff', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0,
        autoShrink: false, visible: true, locked: false, opacity: 1, zIndex: 1,
        constraints: { horizontal: { anchor: 'left', offset: x }, vertical: { anchor: 'top', offset: y }, size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h } },
    } as TextElement;
}

describe('smartSizeElements — Image Background Aspect Fit', () => {
    it('should cover-fit wider image to narrower canvas', () => {
        const bg = makeBGImage(400, 200);
        const result = smartSizeElements([bg], 300, 250, 160, 600);
        const bgOut = result[0];
        expect(bgOut.constraints.size.width).toBeGreaterThanOrEqual(160);
        expect(bgOut.constraints.size.height).toBeGreaterThanOrEqual(600);
    });

    it('should cover-fit taller image to wider canvas', () => {
        const bg = makeBGImage(200, 400);
        const result = smartSizeElements([bg], 300, 250, 728, 90);
        const bgOut = result[0];
        expect(bgOut.constraints.size.width).toBeGreaterThanOrEqual(728);
        expect(bgOut.constraints.size.height).toBeGreaterThanOrEqual(90);
    });

    it('should fill exact size for non-image background', () => {
        const bg: DesignElement = {
            id: 'bg-shape', type: 'shape', shapeType: 'rectangle', name: 'Background',
            fill: '#000', visible: true, locked: false, opacity: 1, zIndex: 0,
            constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 300, height: 250 } },
        } as any;
        const result = smartSizeElements([bg], 300, 250, 728, 90);
        expect(result[0].constraints.size.width).toBe(728);
        expect(result[0].constraints.size.height).toBe(90);
    });
});

describe('smartSizeElements — Text Font Shrink-to-Fit (via resize)', () => {
    it('should shrink font when scaled box is too small for line height', () => {
        // fontSize=36, lineHeight=1.2 → after scaling to 160x600: uniformScale=0.267
        // scaled fontSize = max(8, round(36*0.267)) = max(8, 10) = 10
        // scaled h = max(4, round(60*0.267)) = 16
        // 10 * 1.2 = 12 < 16 → no shrink needed at this size
        // Use 300x250 → 100x50 to force aggressive shrink
        const text = makeText('t1', 48, 10, 10, 280, 200);
        const result = smartSizeElements([text], 300, 250, 100, 50);
        const out = result[0] as any;
        // uniformScale = min(100/300, 50/250) = min(0.333, 0.2) = 0.2
        // fontSize = max(8, round(48*0.2)) = max(8, 10) = 10
        expect(out.fontSize).toBeLessThanOrEqual(12);
        expect(out.fontSize).toBeGreaterThanOrEqual(8); // min font
    });

    it('should not shrink font when box is large enough', () => {
        const text = makeText('t2', 14, 10, 10, 200, 100);
        const result = smartSizeElements([text], 300, 250, 600, 500);
        const out = result[0] as any;
        // Scaling up: uniformScale = 2, fontSize = 28, box h=200 → 28*1.2=33.6 < 200
        expect(out.fontSize).toBeGreaterThanOrEqual(14);
    });
});

describe('smartSizeElements — Canvas Boundary Clamping (via resize)', () => {
    it('should clamp elements within target bounds after resize', () => {
        // Text at far right of 300x250 → resize to 100x50
        const text = makeText('t3', 16, 250, 200, 50, 40);
        const result = smartSizeElements([text], 300, 250, 100, 50);
        const out = result[0];
        // After scale + clamp, element should fit within 100x50
        const rightEdge = out.constraints.horizontal.offset + out.constraints.size.width;
        expect(rightEdge).toBeLessThanOrEqual(100);
    });
});

describe('smartSizeElements — Centering Content Group', () => {
    it('should center content group in target canvas', () => {
        // Small element at top-left of 300x250 → resize to 600x500
        const rect: DesignElement = {
            id: 'rect', type: 'shape', shapeType: 'rectangle', name: 'Rect',
            visible: true, locked: false, opacity: 1, zIndex: 1,
            fill: '#f00', constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 50, height: 50 } },
        } as any;
        const result = smartSizeElements([rect], 300, 250, 600, 500);
        const out = result[0];
        // uniformScale = min(2, 2) = 2 → new: x=20, y=20, w=100, h=100
        // centering offset: (600-100)/2 - 20 = 230
        const centerX = out.constraints.horizontal.offset + out.constraints.size.width / 2;
        expect(centerX).toBeGreaterThan(200);
        expect(centerX).toBeLessThan(400);
    });
});
