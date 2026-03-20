// ─────────────────────────────────────────────────
// smartSizingFixer — Unit Tests
// ─────────────────────────────────────────────────
// Tests for auto-fix generation from QA issues.

import { describe, it, expect } from 'vitest';
import { generateFixes } from './smartSizingFixer';
import type { QAIssue } from './smartSizingQA';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement, ShapeElement, TextElement } from '@/schema/elements.types';

// ── Fixtures ──

function makeVariant(id: string, width: number, height: number, elements: DesignElement[]): BannerVariant {
    return {
        id,
        preset: { id: `p-${id}`, name: `${width}x${height}`, width, height, category: 'display' },
        elements,
        backgroundColor: '#FFFFFF',
        overriddenElementIds: [],
        syncLocked: false,
    };
}

function makeEl(id: string, x: number, y: number, w: number, h: number, opts?: Partial<DesignElement>): DesignElement {
    return {
        id,
        name: opts?.name ?? `El ${id}`,
        type: opts?.type ?? 'shape',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        role: opts?.role,
        constraints: {
            horizontal: { anchor: 'left', offset: x },
            vertical: { anchor: 'top', offset: y },
            size: { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h },
        },
        ...(opts?.type === 'text' ? { content: 'Test', fontFamily: 'Inter', fontSize: opts?.fontSize ?? 16, fontWeight: 400, fontStyle: 'normal', color: '#000', textAlign: 'left', lineHeight: 1.2, letterSpacing: 0, autoShrink: false } : {}),
        ...(opts?.type === 'shape' ? { shapeType: 'rectangle', fill: '#FF0000' } : {}),
    } as DesignElement;
}

function makeIssue(rule: string, variantId: string, elementId?: string, severity: 'error' | 'warning' | 'info' = 'error'): QAIssue {
    return {
        severity,
        rule,
        message: `Test issue: ${rule}`,
        elementId,
        elementName: elementId ? `El ${elementId}` : undefined,
        variantId,
        variantName: 'Test',
    };
}

// ── Fix generation ──

describe('generateFixes — Out of Bounds', () => {
    it('generates fix for out-of-bounds element', () => {
        const el = makeEl('a', -50, 10, 80, 40);
        const v = makeVariant('v1', 300, 250, [el]);
        const issues = [makeIssue('out-of-bounds', 'v1', 'a')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.rule).toBe('out-of-bounds');
        expect(fixes[0]!.patch.constraints).toBeDefined();
    });

    it('uses smart layout for elements with roles', () => {
        const el = makeEl('h', -50, 10, 200, 40, { role: 'headline', type: 'text', fontSize: 24 } as any);
        const v = makeVariant('v1', 300, 250, [el]);
        const issues = [makeIssue('out-of-bounds', 'v1', 'h')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.description).toContain('smart layout');
    });

    it('generates fix for partially-clipped element', () => {
        const el = makeEl('a', -10, 10, 100, 50);
        const v = makeVariant('v1', 300, 250, [el]);
        const issues = [makeIssue('partially-clipped', 'v1', 'a', 'warning')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
    });
});

describe('generateFixes — TnC Too Large', () => {
    it('reduces TnC font to 8px', () => {
        const tnc = makeEl('tnc', 10, 220, 200, 20, { role: 'tnc', type: 'text', fontSize: 14 } as any);
        const v = makeVariant('v1', 300, 250, [tnc]);
        const issues = [makeIssue('tnc-too-large', 'v1', 'tnc', 'warning')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.fontSize).toBe(8);
    });
});

describe('generateFixes — Headline Too Wide', () => {
    it('reduces headline width to 90% relative', () => {
        const h = makeEl('h', 0, 50, 295, 40, { role: 'headline' });
        const v = makeVariant('v1', 300, 250, [h]);
        const issues = [makeIssue('headline-too-wide', 'v1', 'h', 'warning')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.constraints?.size?.widthMode).toBe('relative');
        expect(fixes[0]!.patch.constraints?.size?.width).toBe(0.9);
    });
});

describe('generateFixes — Layout Pattern Fixes', () => {
    it('moves ultra-wide CTA to right side', () => {
        const cta = makeEl('cta', 10, 30, 80, 30, { role: 'cta' });
        const v = makeVariant('v1', 728, 90, [cta]);
        const issues = [makeIssue('layout-ultrawide-cta', 'v1', 'cta', 'warning')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.constraints?.horizontal.anchor).toBe('right');
    });

    it('moves ultra-wide logo to left side', () => {
        const logo = makeEl('logo', 600, 30, 50, 30, { role: 'logo' });
        const v = makeVariant('v1', 728, 90, [logo]);
        const issues = [makeIssue('layout-ultrawide-logo', 'v1', 'logo', 'warning')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.constraints?.horizontal.anchor).toBe('left');
    });

    it('fixes portrait headline-below-CTA order', () => {
        const h = makeEl('h', 20, 500, 120, 40, { role: 'headline' });
        const v = makeVariant('v1', 160, 600, [h]);
        const issues = [makeIssue('layout-portrait-order', 'v1', 'h')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.constraints?.vertical.anchor).toBe('top');
    });
});

describe('generateFixes — Overlap', () => {
    it('reduces height for tall overlapping element', () => {
        const el = makeEl('a', 0, 0, 200, 200, { role: 'headline' }); // 200 > 250*0.4=100
        const v = makeVariant('v1', 300, 250, [el]);
        const issues = [makeIssue('overlap', 'v1', 'a')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.constraints?.size?.heightMode).toBe('relative');
    });

    it('shrinks font for text overlap', () => {
        const el = makeEl('t', 10, 10, 100, 30, { type: 'text', role: 'subline', fontSize: 20 } as any);
        const v = makeVariant('v1', 300, 250, [el]);
        const issues = [makeIssue('overlap', 'v1', 't')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(1);
        expect(fixes[0]!.patch.fontSize).toBeLessThan(20);
        expect(fixes[0]!.patch.fontSize).toBeGreaterThanOrEqual(10);
    });
});

describe('generateFixes — Edge Cases', () => {
    it('skips issues without elementId', () => {
        const v = makeVariant('v1', 300, 250, []);
        const issues = [makeIssue('missing-background', 'v1')];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(0);
    });

    it('skips issues for non-existent variants', () => {
        const issues = [makeIssue('out-of-bounds', 'non-existent', 'a')];
        const fixes = generateFixes(issues, []);
        expect(fixes).toHaveLength(0);
    });

    it('handles multiple issues for same variant', () => {
        const el1 = makeEl('a', -50, 10, 80, 40);
        const el2 = makeEl('b', 310, 10, 80, 40);
        const v = makeVariant('v1', 300, 250, [el1, el2]);
        const issues = [
            makeIssue('out-of-bounds', 'v1', 'a'),
            makeIssue('out-of-bounds', 'v1', 'b'),
        ];
        const fixes = generateFixes(issues, [v]);
        expect(fixes).toHaveLength(2);
    });
});
