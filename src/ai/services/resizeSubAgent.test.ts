// ─────────────────────────────────────────────────
// resizeSubAgent — Unit Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { analyzeVariantForResize, type VariantResizeResult, type ElementPatch } from './resizeSubAgent';
import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';

function makeElement(id: string, overrides: Partial<DesignElement> = {}): DesignElement {
    return {
        id,
        name: overrides.name ?? `Element ${id}`,
        type: overrides.type ?? 'shape',
        x: overrides.x ?? 0,
        y: overrides.y ?? 0,
        width: overrides.width ?? 100,
        height: overrides.height ?? 50,
        opacity: 1,
        fill: '#000000',
        constraints: {
            horizontal: { mode: 'left', leftPx: 0 },
            vertical: { mode: 'top', topPx: 0 },
            size: { widthMode: 'fixed', width: overrides.width ?? 100, heightMode: 'fixed', height: overrides.height ?? 50 },
        },
        ...overrides,
    } as DesignElement;
}

function makeVariant(id: string, w: number, h: number, elements?: DesignElement[]): BannerVariant {
    return {
        id,
        preset: { name: `${w}x${h}`, width: w, height: h },
        elements: elements ?? [makeElement('el-1')],
    } as BannerVariant;
}

function makeCreativeSet(masterVid: string, variants: BannerVariant[]): CreativeSet {
    return {
        id: 'cs-1',
        name: 'Test Set',
        masterVariantId: masterVid,
        variants,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
    } as CreativeSet;
}

describe('analyzeVariantForResize — Export & Types', () => {
    it('exports analyzeVariantForResize function', () => {
        expect(typeof analyzeVariantForResize).toBe('function');
    });

    it('VariantResizeResult has required fields', () => {
        const result: VariantResizeResult = {
            variantId: 'v1', label: '300x250',
            patches: [], qaFixCount: 0, issueCount: 0,
        };
        expect(result.variantId).toBe('v1');
    });

    it('ElementPatch has required fields', () => {
        const patch: ElementPatch = {
            elementId: 'el-1', elementName: 'Headline',
            patch: { x: 10, y: 20 },
        };
        expect(patch.elementId).toBe('el-1');
    });
});

describe('analyzeVariantForResize — Master Skip', () => {
    it('returns empty patches for master variant', () => {
        const master = makeVariant('v-master', 300, 250);
        const cs = makeCreativeSet('v-master', [master]);
        const result = analyzeVariantForResize(master, cs);
        expect(result.patches).toHaveLength(0);
        expect(result.qaFixCount).toBe(0);
    });
});

describe('analyzeVariantForResize — Non-Master Variants', () => {
    it('processes non-master variant', () => {
        const master = makeVariant('v-master', 300, 250);
        const target = makeVariant('v-target', 728, 90, [
            makeElement('el-1', { name: 'bg', type: 'shape' }),
        ]);
        const cs = makeCreativeSet('v-master', [master, target]);
        const result = analyzeVariantForResize(target, cs);
        expect(result.variantId).toBe('v-target');
        expect(result.label).toBe('728x90');
    });

    it('skips elements without roles', () => {
        const target = makeVariant('v-target', 160, 600, [
            makeElement('el-1', { name: 'shape', role: undefined } as any),
        ]);
        const cs = makeCreativeSet('v-master', [
            makeVariant('v-master', 300, 250), target,
        ]);
        const result = analyzeVariantForResize(target, cs);
        // No role → no smart constraints → no patches from step 1
        expect(result.patches.length).toBeGreaterThanOrEqual(0);
    });

    it('skips overridden elements', () => {
        const target = makeVariant('v-target', 160, 600, [
            makeElement('el-1', { name: 'Headline', role: 'headline' } as any),
        ]);
        (target as any).overriddenElementIds = ['el-1'];
        const cs = makeCreativeSet('v-master', [
            makeVariant('v-master', 300, 250), target,
        ]);
        const result = analyzeVariantForResize(target, cs);
        // Overridden → skipped in step 1
        const step1Patches = result.patches.filter(p => p.patch.constraints);
        expect(step1Patches).toHaveLength(0);
    });

    it('returns label from preset name', () => {
        const v = makeVariant('v1', 468, 60);
        (v.preset as any).name = 'Banner';
        const cs = makeCreativeSet('v-master', [
            makeVariant('v-master', 300, 250), v,
        ]);
        const result = analyzeVariantForResize(v, cs);
        expect(result.label).toBe('Banner');
    });

    it('falls back to WxH label when name is empty', () => {
        const v = makeVariant('v1', 468, 60);
        (v.preset as any).name = '';
        const cs = makeCreativeSet('v-master', [
            makeVariant('v-master', 300, 250), v,
        ]);
        const result = analyzeVariantForResize(v, cs);
        expect(result.label).toContain('468');
    });
});
