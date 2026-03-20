// ─────────────────────────────────────────────────
// smartSizingQA — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the client-side layout validation rules.

import { describe, it, expect } from 'vitest';
import { runSmartSizingQA } from './smartSizingQA';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement, ShapeElement, TextElement } from '@/schema/elements.types';

// ── Fixtures ──

function makeVariant(width: number, height: number, elements: DesignElement[]): BannerVariant {
    return {
        id: 'v1',
        preset: { id: 'p1', name: `${width}x${height}`, width, height, category: 'display' },
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
        visible: opts?.visible ?? true,
        locked: false,
        opacity: 1,
        zIndex: opts?.zIndex ?? 0,
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

// ── Rule 1: Out of bounds ──

describe('smartSizingQA — Out of Bounds Detection', () => {
    it('element inside canvas → no issues', () => {
        const v = makeVariant(300, 250, [makeEl('a', 10, 10, 100, 50)]);
        const issues = runSmartSizingQA([v]);
        const oob = issues.filter(i => i.rule === 'out-of-bounds');
        expect(oob).toHaveLength(0);
    });

    it('element completely off-screen → error', () => {
        const v = makeVariant(300, 250, [makeEl('a', -200, -200, 50, 50)]);
        const issues = runSmartSizingQA([v]);
        const oob = issues.filter(i => i.rule === 'out-of-bounds');
        expect(oob).toHaveLength(1);
        expect(oob[0]!.severity).toBe('error');
    });

    it('element partially clipped → warning', () => {
        const v = makeVariant(300, 250, [makeEl('a', -10, 10, 100, 50)]);
        const issues = runSmartSizingQA([v]);
        const clipped = issues.filter(i => i.rule === 'partially-clipped');
        expect(clipped).toHaveLength(1);
        expect(clipped[0]!.severity).toBe('warning');
    });

    it('hidden element off-screen → no issue (skipped)', () => {
        const v = makeVariant(300, 250, [makeEl('a', -200, -200, 50, 50, { visible: false })]);
        const issues = runSmartSizingQA([v]);
        const oob = issues.filter(i => i.rule === 'out-of-bounds');
        expect(oob).toHaveLength(0);
    });
});

// ── Rule 2: Overlaps ──

describe('smartSizingQA — Overlap Detection', () => {
    it('two overlapping content elements → error', () => {
        const v = makeVariant(300, 250, [
            makeEl('a', 10, 10, 100, 50, { role: 'headline' }),
            makeEl('b', 50, 30, 100, 50, { role: 'subline' }),
        ]);
        const issues = runSmartSizingQA([v]);
        const overlaps = issues.filter(i => i.rule === 'overlap');
        expect(overlaps.length).toBeGreaterThanOrEqual(1);
    });

    it('non-overlapping elements → no overlap issue', () => {
        const v = makeVariant(300, 250, [
            makeEl('a', 10, 10, 50, 30, { role: 'headline' }),
            makeEl('b', 10, 100, 50, 30, { role: 'subline' }),
        ]);
        const issues = runSmartSizingQA([v]);
        const overlaps = issues.filter(i => i.rule === 'overlap');
        expect(overlaps).toHaveLength(0);
    });

    it('background overlapping content → NOT flagged (backgrounds excluded)', () => {
        const v = makeVariant(300, 250, [
            makeEl('bg', 0, 0, 300, 250, { role: 'background' }),
            makeEl('h', 50, 50, 200, 40, { role: 'headline' }),
        ]);
        const issues = runSmartSizingQA([v]);
        const overlaps = issues.filter(i => i.rule === 'overlap');
        expect(overlaps).toHaveLength(0);
    });
});

// ── Rule 3: TnC font size ──

describe('smartSizingQA — TnC Font Size', () => {
    it('TnC with fontSize > 11 → warning', () => {
        const tnc = makeEl('tnc', 10, 220, 200, 20, { type: 'text', role: 'tnc', fontSize: 14 } as any);
        const v = makeVariant(300, 250, [tnc]);
        const issues = runSmartSizingQA([v]);
        const tncIssues = issues.filter(i => i.rule === 'tnc-too-large');
        expect(tncIssues).toHaveLength(1);
    });

    it('TnC with fontSize 9 → no issue', () => {
        const tnc = makeEl('tnc', 10, 220, 200, 20, { type: 'text', role: 'tnc', fontSize: 9 } as any);
        const v = makeVariant(300, 250, [tnc]);
        const issues = runSmartSizingQA([v]);
        const tncIssues = issues.filter(i => i.rule === 'tnc-too-large');
        expect(tncIssues).toHaveLength(0);
    });
});

// ── Rule 4: Headline too wide ──

describe('smartSizingQA — Headline Width', () => {
    it('headline wider than 95% of canvas → warning', () => {
        const h = makeEl('h', 0, 50, 295, 40, { role: 'headline' });
        const v = makeVariant(300, 250, [h]);
        const issues = runSmartSizingQA([v]);
        const wide = issues.filter(i => i.rule === 'headline-too-wide');
        expect(wide).toHaveLength(1);
    });

    it('headline at 80% width → no issue', () => {
        const h = makeEl('h', 30, 50, 240, 40, { role: 'headline' });
        const v = makeVariant(300, 250, [h]);
        const issues = runSmartSizingQA([v]);
        const wide = issues.filter(i => i.rule === 'headline-too-wide');
        expect(wide).toHaveLength(0);
    });
});

// ── Rule 5: Layout patterns ──

describe('smartSizingQA — Layout Pattern Validation', () => {
    it('ultra-wide CTA on left side → warning', () => {
        const cta = makeEl('cta', 10, 30, 80, 30, { role: 'cta' });
        const v = makeVariant(728, 90, [cta]);
        const issues = runSmartSizingQA([v]);
        const layoutIssues = issues.filter(i => i.rule === 'layout-ultrawide-cta');
        expect(layoutIssues).toHaveLength(1);
    });

    it('ultra-wide CTA on right side → no issue', () => {
        const cta = makeEl('cta', 600, 30, 100, 30, { role: 'cta' });
        const v = makeVariant(728, 90, [cta]);
        const issues = runSmartSizingQA([v]);
        const layoutIssues = issues.filter(i => i.rule === 'layout-ultrawide-cta');
        expect(layoutIssues).toHaveLength(0);
    });

    it('portrait: headline below CTA → error', () => {
        const headline = makeEl('h', 20, 500, 120, 40, { role: 'headline' });
        const cta = makeEl('cta', 40, 200, 80, 30, { role: 'cta' });
        const v = makeVariant(160, 600, [headline, cta]);
        const issues = runSmartSizingQA([v]);
        const layoutIssues = issues.filter(i => i.rule === 'layout-portrait-order');
        expect(layoutIssues).toHaveLength(1);
        expect(layoutIssues[0]!.severity).toBe('error');
    });
});

// ── Rule 6: Missing critical roles ──

describe('smartSizingQA — Missing Roles', () => {
    it('no background → info', () => {
        const v = makeVariant(300, 250, [makeEl('h', 50, 50, 200, 40, { role: 'headline' })]);
        const issues = runSmartSizingQA([v]);
        const missing = issues.filter(i => i.rule === 'missing-background');
        expect(missing).toHaveLength(1);
        expect(missing[0]!.severity).toBe('info');
    });

    it('no CTA → warning', () => {
        const v = makeVariant(300, 250, [makeEl('bg', 0, 0, 300, 250, { role: 'background' })]);
        const issues = runSmartSizingQA([v]);
        const missing = issues.filter(i => i.rule === 'missing-cta');
        expect(missing).toHaveLength(1);
        expect(missing[0]!.severity).toBe('warning');
    });

    it('complete design → no missing role issues', () => {
        const v = makeVariant(300, 250, [
            makeEl('bg', 0, 0, 300, 250, { role: 'background' }),
            makeEl('cta', 100, 200, 100, 30, { role: 'cta' }),
        ]);
        const issues = runSmartSizingQA([v]);
        const missing = issues.filter(i => i.rule === 'missing-background' || i.rule === 'missing-cta');
        expect(missing).toHaveLength(0);
    });
});

// ── Multiple variants ──

describe('smartSizingQA — Multiple Variants', () => {
    it('validates all variants, not just the first', () => {
        const v1 = makeVariant(300, 250, [makeEl('a', -200, -200, 50, 50)]); // out of bounds
        const v2 = makeVariant(728, 90, [makeEl('b', -200, -200, 50, 50)]); // out of bounds
        const issues = runSmartSizingQA([v1, v2]);
        const oob = issues.filter(i => i.rule === 'out-of-bounds');
        expect(oob).toHaveLength(2);
    });
});
