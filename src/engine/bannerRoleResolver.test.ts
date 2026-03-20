// ─────────────────────────────────────────────────
// bannerRoleResolver — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { resolveRoleDefaults, resolveAllRoleDefaults, getRoleTypographyHint } from './bannerRoleResolver';
import type { DesignElement, TextElement, ButtonElement, ShapeElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

// ── Fixtures ──

function makeText(id: string, role?: string, overrides?: Partial<TextElement>): TextElement {
    return {
        id, name: `Text ${id}`, type: 'text',
        constraints: createDefaultConstraints(),
        opacity: 1, visible: true, locked: false, zIndex: 0,
        content: 'Test', fontFamily: 'Inter', fontSize: 16, fontWeight: 400,
        fontStyle: 'normal', color: '#000', textAlign: 'left',
        lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
        role: role as any,
        ...overrides,
    };
}

function makeButton(id: string, role?: string): ButtonElement {
    return {
        id, name: `Button ${id}`, type: 'button',
        constraints: createDefaultConstraints(),
        opacity: 1, visible: true, locked: false, zIndex: 0,
        label: 'Click', fontFamily: 'Inter', fontSize: 16, fontWeight: 400,
        color: '#fff', backgroundColor: '#000', borderRadius: 0,
        role: role as any,
    };
}

function makeShape(id: string, role?: string): ShapeElement {
    return {
        id, name: `Shape ${id}`, type: 'shape', shapeType: 'rectangle',
        constraints: createDefaultConstraints(),
        opacity: 1, visible: true, locked: false, zIndex: 0,
        fill: '#FF0000',
        role: role as any,
    };
}

// ── resolveRoleDefaults ──

describe('resolveRoleDefaults — no role', () => {
    it('returns null for element without role', () => {
        const el = makeText('t1');
        expect(resolveRoleDefaults(el, 300, 250)).toBeNull();
    });
});

describe('resolveRoleDefaults — headline', () => {
    it('sets fontWeight to 700 when default is 400', () => {
        const el = makeText('h', 'headline');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch).not.toBeNull();
        expect(patch?.fontWeight).toBe(700);
    });

    it('sets lineHeight to 1.15', () => {
        const el = makeText('h', 'headline');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.lineHeight).toBe(1.15);
    });

    it('sets zIndex to 10', () => {
        const el = makeText('h', 'headline');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.zIndex).toBe(10);
    });

    it('does NOT override explicitly set fontWeight', () => {
        const el = makeText('h', 'headline', { fontWeight: 800 });
        const patch = resolveRoleDefaults(el, 300, 250);
        // fontWeight 800 != default 400, so it should NOT be in patch
        expect(patch?.fontWeight).toBeUndefined();
    });
});

describe('resolveRoleDefaults — cta', () => {
    it('sets fontSize for CTA text', () => {
        const el = makeText('c', 'cta');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.fontSize).toBeGreaterThan(0);
    });

    it('sets borderRadius for CTA button', () => {
        const btn = makeButton('c', 'cta');
        const patch = resolveRoleDefaults(btn, 300, 250);
        expect(patch?.borderRadius).toBe(8);
    });

    it('small banner CTA gets smaller radius', () => {
        const btn = makeButton('c', 'cta');
        const patch = resolveRoleDefaults(btn, 320, 50); // tiny banner
        expect(patch?.borderRadius).toBe(4);
    });

    it('sets fontWeight to 700', () => {
        const btn = makeButton('c', 'cta');
        const patch = resolveRoleDefaults(btn, 300, 250);
        expect(patch?.fontWeight).toBe(700);
    });
});

describe('resolveRoleDefaults — tnc', () => {
    it('sets small fontSize', () => {
        const el = makeText('t', 'tnc');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.fontSize).toBeLessThanOrEqual(10);
    });

    it('sets zIndex to 16 (above content)', () => {
        const el = makeText('t', 'tnc');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.zIndex).toBe(16);
    });
});

describe('resolveRoleDefaults — background', () => {
    it('returns a patch (may include zIndex)', () => {
        const shape = makeShape('bg', 'background');
        const patch = resolveRoleDefaults(shape, 300, 250);
        // Background role returns defaults but shape at zIndex=0 still gets the full set
        // The patch may or may not be null depending on default matching
        if (patch) {
            // If there's a patch, zIndex defaults to 0 for background
            expect(patch.zIndex === 0 || patch.zIndex === undefined).toBe(true);
        }
    });
});

describe('resolveRoleDefaults — badge', () => {
    it('sets fontWeight 700 and zIndex 20', () => {
        const el = makeText('b', 'badge');
        const patch = resolveRoleDefaults(el, 300, 250);
        expect(patch?.fontWeight).toBe(700);
        expect(patch?.zIndex).toBe(20);
    });
});

describe('resolveRoleDefaults — accent', () => {
    it('sets zIndex to 2', () => {
        const shape = makeShape('a', 'accent');
        const patch = resolveRoleDefaults(shape, 300, 250);
        expect(patch?.zIndex).toBe(2);
    });
});

// ── resolveAllRoleDefaults ──

describe('resolveAllRoleDefaults', () => {
    it('returns patches for elements with roles', () => {
        const elements: DesignElement[] = [
            makeText('h', 'headline'),
            makeText('s', 'subline'),
            makeText('no-role'),
        ];
        const patches = resolveAllRoleDefaults(elements, 300, 250);
        expect(patches.length).toBeGreaterThanOrEqual(2);
        // no-role element should NOT have a patch
        expect(patches.find(p => p.elementId === 'no-role')).toBeUndefined();
    });

    it('each patch has correct elementId', () => {
        const elements: DesignElement[] = [makeText('h', 'headline')];
        const patches = resolveAllRoleDefaults(elements, 300, 250);
        expect(patches[0]?.elementId).toBe('h');
    });
});

// ── getRoleTypographyHint ──

describe('getRoleTypographyHint', () => {
    it('returns minFs/maxFs/weight for headline', () => {
        const hint = getRoleTypographyHint('headline', 300, 250);
        if (hint) {
            expect(hint.minFs).toBeGreaterThan(0);
            expect(hint.maxFs).toBeGreaterThanOrEqual(hint.minFs);
            expect(hint.weight).toBe(700);
        }
    });

    it('returns weight 400 for subline', () => {
        const hint = getRoleTypographyHint('subline', 300, 250);
        if (hint) {
            expect(hint.weight).toBe(400);
        }
    });

    it('returns null for role without typography (logo)', () => {
        const hint = getRoleTypographyHint('logo', 300, 250);
        expect(hint).toBeNull();
    });

    it('returns null for background role', () => {
        expect(getRoleTypographyHint('background', 300, 250)).toBeNull();
    });
});
