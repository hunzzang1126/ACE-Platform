// ─────────────────────────────────────────────────
// elements.types — Unit Tests
// ─────────────────────────────────────────────────
// Tests for factory helpers and type structure.

import { describe, it, expect } from 'vitest';
import { createDefaultConstraints } from '@/schema/elements.types';
import type {
    TextElement,
    ImageElement,
    ShapeElement,
    ButtonElement,
    VideoElement,

    DesignElement,
    DesignElementType,
    TextEffectType,
    ElementAnimation,
} from '@/schema/elements.types';

// ── createDefaultConstraints ──

describe('createDefaultConstraints', () => {
    it('returns valid constraints object', () => {
        const c = createDefaultConstraints();
        expect(c).toBeDefined();
        expect(c.horizontal).toBeDefined();
        expect(c.vertical).toBeDefined();
        expect(c.size).toBeDefined();
    });

    it('defaults to left/top anchor', () => {
        const c = createDefaultConstraints();
        expect(c.horizontal.anchor).toBe('left');
        expect(c.vertical.anchor).toBe('top');
    });

    it('defaults to 0 offset', () => {
        const c = createDefaultConstraints();
        expect(c.horizontal.offset).toBe(0);
        expect(c.vertical.offset).toBe(0);
    });

    it('defaults to fixed size mode', () => {
        const c = createDefaultConstraints();
        expect(c.size.widthMode).toBe('fixed');
        expect(c.size.heightMode).toBe('fixed');
    });

    it('defaults to 100x100', () => {
        const c = createDefaultConstraints();
        expect(c.size.width).toBe(100);
        expect(c.size.height).toBe(100);
    });

    it('defaults to rotation 0', () => {
        const c = createDefaultConstraints();
        expect(c.rotation).toBe(0);
    });

    it('each call returns a fresh object (no shared refs)', () => {
        const a = createDefaultConstraints();
        const b = createDefaultConstraints();
        expect(a).not.toBe(b);
        expect(a.horizontal).not.toBe(b.horizontal);
        a.horizontal.offset = 999;
        expect(b.horizontal.offset).toBe(0);
    });
});

// ── Type structure validation (compile-time + runtime) ──

describe('Element type structure', () => {
    it('TextElement has all required fields', () => {
        const t: TextElement = {
            id: 't1', name: 'Test', type: 'text',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            content: 'Hello', fontFamily: 'Inter', fontSize: 24,
            fontWeight: 700, fontStyle: 'normal', color: '#fff',
            textAlign: 'center', lineHeight: 1.2, letterSpacing: 0,
            autoShrink: false,
        };
        expect(t.type).toBe('text');
        expect(t.content).toBe('Hello');
    });

    it('ShapeElement supports gradients', () => {
        const s: ShapeElement = {
            id: 's1', name: 'BG', type: 'shape', shapeType: 'rectangle',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 0,
            fill: '#000', gradientStart: '#000', gradientEnd: '#333',
            gradientAngle: 135,
        };
        expect(s.gradientStart).toBe('#000');
        expect(s.gradientEnd).toBe('#333');
    });

    it('ButtonElement has backgroundColor and label', () => {
        const b: ButtonElement = {
            id: 'b1', name: 'CTA', type: 'button',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 15,
            label: 'Buy Now', fontFamily: 'Inter', fontSize: 14,
            fontWeight: 700, color: '#fff', backgroundColor: '#3b82f6',
            borderRadius: 8,
        };
        expect(b.label).toBe('Buy Now');
        expect(b.backgroundColor).toBe('#3b82f6');
    });

    it('ImageElement has fit and optional crop', () => {
        const img: ImageElement = {
            id: 'i1', name: 'Hero', type: 'image',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            src: '/test.png', fit: 'cover',
            cropRect: { x: 0, y: 0, w: 1, h: 1 },
        };
        expect(img.fit).toBe('cover');
        expect(img.cropRect).toBeDefined();
    });

    it('VideoElement has videoSrc and playback flags', () => {
        const v: VideoElement = {
            id: 'v1', name: 'Video', type: 'video',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            videoSrc: 'blob://video', fit: 'cover',
            muted: true, loop: true, autoplay: true,
        };
        expect(v.muted).toBe(true);
        expect(v.loop).toBe(true);
    });


});

// ── TextEffect types ──

describe('TextEffectType', () => {
    it('all effect types are valid strings', () => {
        const effects: TextEffectType[] = ['none', 'drop', 'glow', 'echo', 'outline', 'splice', 'neon', 'glitch', 'curve', '70s'];
        expect(effects).toHaveLength(10);
    });
});

// ── ElementAnimation ──

describe('ElementAnimation', () => {
    it('supports all preset types', () => {
        const presets: ElementAnimation['preset'][] = [
            'none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend',
        ];
        expect(presets).toHaveLength(9);
    });

    it('animation config has required fields', () => {
        const anim: ElementAnimation = { preset: 'fade', duration: 0.5, startTime: 0 };
        expect(anim.preset).toBe('fade');
        expect(anim.duration).toBe(0.5);
        expect(anim.startTime).toBe(0);
    });
});

// ── Optional fields ──

describe('BaseElement optional fields', () => {
    it('element can have shadow', () => {
        const t: TextElement = {
            id: 't1', name: 'Test', type: 'text',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            content: 'Hello', fontFamily: 'Inter', fontSize: 24,
            fontWeight: 700, fontStyle: 'normal', color: '#fff',
            textAlign: 'center', lineHeight: 1.2, letterSpacing: 0,
            autoShrink: false,
            shadow: { offsetX: 2, offsetY: 4, blur: 8, color: '#000' },
        };
        expect(t.shadow?.blur).toBe(8);
    });

    it('element can have textEffect config', () => {
        const t: TextElement = {
            id: 't1', name: 'Test', type: 'text',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            content: 'Hello', fontFamily: 'Inter', fontSize: 24,
            fontWeight: 700, fontStyle: 'normal', color: '#fff',
            textAlign: 'center', lineHeight: 1.2, letterSpacing: 0,
            autoShrink: false,
            textEffect: { type: 'neon', intensity: 75, color: '#ff00ff' },
        };
        expect(t.textEffect?.type).toBe('neon');
        expect(t.textEffect?.intensity).toBe(75);
    });

    it('element can have animation config', () => {
        const t: TextElement = {
            id: 't1', name: 'Test', type: 'text',
            constraints: createDefaultConstraints(),
            opacity: 1, visible: true, locked: false, zIndex: 1,
            content: 'Hello', fontFamily: 'Inter', fontSize: 24,
            fontWeight: 700, fontStyle: 'normal', color: '#fff',
            textAlign: 'center', lineHeight: 1.2, letterSpacing: 0,
            autoShrink: false,
            animation: { preset: 'slide-left', duration: 1.0, startTime: 0.5 },
        };
        expect(t.animation?.preset).toBe('slide-left');
    });
});
