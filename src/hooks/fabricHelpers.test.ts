// ─────────────────────────────────────────────────
// fabricHelpers.test.ts — Pure utility functions
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock fabric module
vi.mock('fabric', () => ({
    Textbox: class Textbox {
        type = 'textbox';
        text = '';
        fontSize = 16;
        fontFamily = 'Inter';
        fontWeight = '400';
        fill = '#000';
        textAlign = 'left';
        left = 0; top = 0; width = 100; height = 50;
        scaleX = 1; scaleY = 1; opacity = 1; angle = 0;
        constructor(t: string, opts: any = {}) {
            Object.assign(this, { text: t, ...opts });
        }
    },
    Shadow: class Shadow {},
}));

import {
    nextId, nextColor,
    hexToRgb01, rgbToHex,
    isArtboard, fabricToEngineNode,
    GLID_CUSTOM_PROPS, patchAceProps,
} from './fabricHelpers';

// ══════════════════════════════════════════════════
// nextId
// ══════════════════════════════════════════════════

describe('nextId', () => {
    it('returns incrementing integers', () => {
        const a = nextId();
        const b = nextId();
        expect(b).toBe(a + 1);
    });
});

// ══════════════════════════════════════════════════
// nextColor
// ══════════════════════════════════════════════════

describe('nextColor', () => {
    it('returns hex color strings', () => {
        const c = nextColor();
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('cycles through colors', () => {
        const colors = Array.from({ length: 10 }, () => nextColor());
        expect(colors[0]).not.toBe(colors[1]);
    });
});

// ══════════════════════════════════════════════════
// hexToRgb01
// ══════════════════════════════════════════════════

describe('hexToRgb01', () => {
    it('converts 6-digit hex to [0..1] RGB', () => {
        expect(hexToRgb01('#ff0000')).toEqual([1, 0, 0]);
        expect(hexToRgb01('#00ff00')).toEqual([0, 1, 0]);
        expect(hexToRgb01('#0000ff')).toEqual([0, 0, 1]);
    });

    it('converts 3-digit hex', () => {
        const [r, g, b] = hexToRgb01('#fff');
        expect(r).toBe(1);
        expect(g).toBe(1);
        expect(b).toBe(1);
    });

    it('handles rgba() strings', () => {
        const [r] = hexToRgb01('rgba(255, 0, 0, 1)');
        expect(r).toBe(1);
    });

    it('handles rgb() strings', () => {
        const [r] = hexToRgb01('rgb(128, 128, 128)');
        expect(r).toBeCloseTo(128 / 255, 2);
    });

    it('★ REGRESSION: returns fallback for non-string input', () => {
        expect(hexToRgb01(0.9 as any)).toEqual([0.5, 0.5, 0.5]);
    });

    it('returns fallback for invalid hex', () => {
        expect(hexToRgb01('notahex')).toEqual([0.5, 0.5, 0.5]);
    });
});

// ══════════════════════════════════════════════════
// rgbToHex
// ══════════════════════════════════════════════════

describe('rgbToHex', () => {
    it('converts [0..1] RGB to hex', () => {
        expect(rgbToHex(1, 0, 0)).toBe('#ff0000');
        expect(rgbToHex(0, 1, 0)).toBe('#00ff00');
        expect(rgbToHex(0, 0, 1)).toBe('#0000ff');
    });

    it('handles fractional values', () => {
        const hex = rgbToHex(0.5, 0.5, 0.5);
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('roundtrips with hexToRgb01', () => {
        const original = '#ab34ef';
        const [r, g, b] = hexToRgb01(original);
        expect(rgbToHex(r, g, b)).toBe(original);
    });
});

// ══════════════════════════════════════════════════
// isArtboard
// ══════════════════════════════════════════════════

describe('isArtboard', () => {
    it('returns true for artboard objects', () => {
        expect(isArtboard({ __glidArtboard: true } as any)).toBe(true);
    });

    it('returns false for regular objects', () => {
        expect(isArtboard({ type: 'rect' } as any)).toBe(false);
    });
});

// ══════════════════════════════════════════════════
// fabricToEngineNode
// ══════════════════════════════════════════════════

describe('fabricToEngineNode', () => {
    const makeObj = (overrides: any = {}) => ({
        type: 'rect',
        left: 10, top: 20, width: 100, height: 50,
        scaleX: 1, scaleY: 1, opacity: 0.8, angle: 0,
        fill: '#ff0000',
        __glidId: 42,
        __glidZIndex: 3,
        __glidName: '',
        rx: 0,
        ...overrides,
    });

    it('extracts position and scaled size', () => {
        const node = fabricToEngineNode(makeObj({ scaleX: 2, scaleY: 1.5 }) as any);
        expect(node.x).toBe(10);
        expect(node.y).toBe(20);
        expect(node.w).toBe(200);
        expect(node.h).toBe(75);
    });

    it('extracts fill color as RGB 0..1', () => {
        const node = fabricToEngineNode(makeObj({ fill: '#ff0000' }) as any);
        expect(node.fill_r).toBe(1);
        expect(node.fill_g).toBe(0);
        expect(node.fill_b).toBe(0);
    });

    it('detects rect type', () => {
        const node = fabricToEngineNode(makeObj() as any);
        expect(node.type).toBe('rect');
    });

    it('detects ellipse type', () => {
        const node = fabricToEngineNode(makeObj({ type: 'ellipse' }) as any);
        expect(node.type).toBe('ellipse');
    });

    it('detects image type', () => {
        const node = fabricToEngineNode(makeObj({ type: 'image' }) as any);
        expect(node.type).toBe('image');
    });

    it('detects rounded_rect when rx > 0', () => {
        const node = fabricToEngineNode(makeObj({ rx: 8 }) as any);
        expect(node.type).toBe('rounded_rect');
    });

    it('★ REGRESSION: scale-aware borderRadius', () => {
        const node = fabricToEngineNode(makeObj({ rx: 10, scaleX: 2, scaleY: 3 }) as any);
        expect(node.border_radius).toBe(20);
    });

    it('extracts gradient from custom props', () => {
        const node = fabricToEngineNode(makeObj({
            __glidGradientStart: '#ff0000',
            __glidGradientEnd: '#0000ff',
            __glidGradientAngle: 45,
        }) as any);
        expect(node.gradient_start).toBe('#ff0000');
        expect(node.gradient_end).toBe('#0000ff');
        expect(node.gradient_angle).toBe(45);
    });

    it('extracts gradient from Fabric gradient object', () => {
        const node = fabricToEngineNode(makeObj({
            fill: { colorStops: [{ color: '#aa0000' }, { color: '#00aa00' }] },
        }) as any);
        expect(node.gradient_start).toBe('#aa0000');
        expect(node.gradient_end).toBe('#00aa00');
    });

    it('uses __glidName when set', () => {
        const node = fabricToEngineNode(makeObj({ __glidName: 'Headline' }) as any);
        expect(node.name).toBe('Headline');
    });

    it('extracts opacity and angle', () => {
        const node = fabricToEngineNode(makeObj({ opacity: 0.5, angle: 45 }) as any);
        expect(node.opacity).toBe(0.5);
        expect(node.angle).toBe(45);
    });
});

// ══════════════════════════════════════════════════
// GLID_CUSTOM_PROPS & patchAceProps
// ══════════════════════════════════════════════════

describe('GLID_CUSTOM_PROPS', () => {
    it('includes essential custom properties', () => {
        expect(GLID_CUSTOM_PROPS).toContain('__glidId');
        expect(GLID_CUSTOM_PROPS).toContain('__glidZIndex');
        expect(GLID_CUSTOM_PROPS).toContain('__glidName');
        expect(GLID_CUSTOM_PROPS).toContain('__glidGradientStart');
        expect(GLID_CUSTOM_PROPS).toContain('__glidTextEffectType');
    });
});

describe('patchAceProps', () => {
    it('patches toObject to include custom props', () => {
        const obj = { type: 'rect', __glidId: 42, __glidZIndex: 3, toObject: () => ({}), toJSON: () => ({}) } as any;
        patchAceProps(obj);
        const data = obj.toObject();
        expect(data.__glidId).toBe(42);
        expect(data.__glidZIndex).toBe(3);
    });

    it('preserves original toObject data', () => {
        const obj = { type: 'rect', __glidId: 1, toObject: () => ({ width: 100 }), toJSON: () => ({}) } as any;
        patchAceProps(obj);
        const data = obj.toObject();
        expect(data.width).toBe(100);
        expect(data.__glidId).toBe(1);
    });
});
