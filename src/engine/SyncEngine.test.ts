// ─────────────────────────────────────────────────
// SyncEngine — Plug-Aware Propagation Tests
// ─────────────────────────────────────────────────
// Guards the plug graph-based propagation logic.
// Run: npx vitest run src/engine/SyncEngine.test.ts

import { describe, it, expect } from 'vitest';
import { SyncEngine } from './SyncEngine';
import type { CreativeSet, BannerVariant, BannerPreset } from '@/schema/design.types';
import type { ShapeElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

// ── Fixtures ──

const MASTER_PRESET: BannerPreset = {
    id: 'preset-300x250', name: '300x250', width: 300, height: 250, category: 'display',
};
const PRESET_B: BannerPreset = {
    id: 'preset-728x90', name: '728x90', width: 728, height: 90, category: 'display',
};
const PRESET_C: BannerPreset = {
    id: 'preset-160x600', name: '160x600', width: 160, height: 600, category: 'display',
};

function makeVariant(id: string, preset: BannerPreset, elements: ShapeElement[] = []): BannerVariant {
    return {
        id,
        preset,
        elements: elements as any[],
        overriddenElementIds: [],
        syncLocked: false,
    };
}

function makeElement(id: string, fill = '#FF0000'): ShapeElement {
    return {
        id,
        type: 'shape',
        shapeType: 'rectangle',
        name: `El ${id}`,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        fill,
        constraints: createDefaultConstraints(),
    } as ShapeElement;
}

function makeCreativeSet(opts: {
    variants: BannerVariant[];
    masterVariantId: string;
    plugConnections?: Record<string, string>;
}): CreativeSet {
    return {
        id: 'cs-test',
        name: 'Test Set',
        masterVariantId: opts.masterVariantId,
        variants: opts.variants,
        plugConnections: opts.plugConnections ?? {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

// ── Tests ──

describe('SyncEngine — Plug-Aware Propagation', () => {

    it('propagates to all variants when no plugConnections exist (legacy mode)', () => {
        const el = makeElement('el-1');
        const master = makeVariant('v-master', MASTER_PRESET, [el]);
        const slaveB = makeVariant('v-b', PRESET_B, [{ ...el }]);
        const slaveC = makeVariant('v-c', PRESET_C, [{ ...el }]);

        const cs = makeCreativeSet({
            variants: [master, slaveB, slaveC],
            masterVariantId: 'v-master',
            plugConnections: {},  // empty = legacy mode
        });

        const result = SyncEngine.propagateChange(el, cs, 'v-master');

        // Should propagate to both B and C (legacy fallback)
        expect(result.deltas.length).toBe(2);
        expect(result.skipped.length).toBe(0);
    });

    it('only propagates to plugged targets', () => {
        const el = makeElement('el-1');
        const master = makeVariant('v-master', MASTER_PRESET, [el]);
        const slaveB = makeVariant('v-b', PRESET_B, [{ ...el }]);
        const slaveC = makeVariant('v-c', PRESET_C, [{ ...el }]);

        const cs = makeCreativeSet({
            variants: [master, slaveB, slaveC],
            masterVariantId: 'v-master',
            plugConnections: {
                'v-b': 'v-master',  // B plugged into master
                // C is NOT plugged
            },
        });

        const result = SyncEngine.propagateChange(el, cs, 'v-master');

        // Should propagate only to B
        const propagatedIds = result.deltas.map(d => d.variantId);
        expect(propagatedIds).toContain('v-b');
        expect(propagatedIds).not.toContain('v-c');

        // C should be in skipped with 'not-plugged' reason
        const skippedC = result.skipped.find(s => s.variantId === 'v-c');
        expect(skippedC).toBeDefined();
        expect(skippedC!.reason).toBe('not-plugged');
    });

    it('skips the source variant itself', () => {
        const el = makeElement('el-1');
        const master = makeVariant('v-master', MASTER_PRESET, [el]);
        const slaveB = makeVariant('v-b', PRESET_B, [{ ...el }]);

        const cs = makeCreativeSet({
            variants: [master, slaveB],
            masterVariantId: 'v-master',
            plugConnections: { 'v-b': 'v-master' },
        });

        const result = SyncEngine.propagateChange(el, cs, 'v-master');

        const propagatedIds = result.deltas.map(d => d.variantId);
        expect(propagatedIds).not.toContain('v-master');
    });

    it('respects syncLocked variants', () => {
        const el = makeElement('el-1');
        const master = makeVariant('v-master', MASTER_PRESET, [el]);
        const locked = makeVariant('v-locked', PRESET_B, [{ ...el }]);
        locked.syncLocked = true;

        const cs = makeCreativeSet({
            variants: [master, locked],
            masterVariantId: 'v-master',
            plugConnections: { 'v-locked': 'v-master' },
        });

        const result = SyncEngine.propagateChange(el, cs, 'v-master');

        expect(result.deltas).toHaveLength(0);
        const skipped = result.skipped.find(s => s.variantId === 'v-locked');
        expect(skipped).toBeDefined();
        expect(skipped!.reason).toBe('syncLocked');
    });

    it('propagates from non-master origin via plug graph', () => {
        const el = makeElement('el-1');
        const master = makeVariant('v-master', MASTER_PRESET, [el]);
        const originA = makeVariant('v-a', PRESET_B, [{ ...el }]);
        const targetC = makeVariant('v-c', PRESET_C, [{ ...el }]);

        const cs = makeCreativeSet({
            variants: [master, originA, targetC],
            masterVariantId: 'v-master',
            plugConnections: {
                'v-a': 'v-master',  // A plugged into master
                'v-c': 'v-a',       // C plugged into A (not master)
            },
        });

        // Propagate from A (not master)
        const result = SyncEngine.propagateChange(el, cs, 'v-a');

        const propagatedIds = result.deltas.map(d => d.variantId);
        expect(propagatedIds).toContain('v-c');
        expect(propagatedIds).not.toContain('v-master');
    });
});
