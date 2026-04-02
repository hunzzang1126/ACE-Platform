// ─────────────────────────────────────────────────
// SyncEngine.test.ts — Extended: plug propagation, fullSync, batch
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { SyncEngine } from './SyncEngine';
import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import type { DesignElement, ShapeElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

function makeCS(opts: { plugs?: Record<string, string>; locked?: string[]; overridden?: Record<string, string[]> } = {}): CreativeSet {
    const masterEl: DesignElement = { id: 'el-1', type: 'shape', name: 'BG', visible: true, locked: false, opacity: 1, zIndex: 0, constraints: createDefaultConstraints() } as any;
    const slaveEl: DesignElement = { ...masterEl, opacity: 0.8 };
    const master: BannerVariant = { id: 'v-master', preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'display' }, elements: [masterEl], backgroundColor: '#fff', overriddenElementIds: [], syncLocked: false };
    const slave: BannerVariant = { id: 'v-slave', preset: { id: 'p2', name: '728x90', width: 728, height: 90, category: 'display' }, elements: [slaveEl], backgroundColor: '#fff', overriddenElementIds: opts.overridden?.['v-slave'] ?? [], syncLocked: opts.locked?.includes('v-slave') ?? false };
    return {
        id: 'cs-1', name: 'Test', masterVariantId: 'v-master',
        variants: [master, slave],
        plugConnections: opts.plugs ?? {},
        brand: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Inter' },
        createdAt: '', updatedAt: '',
    };
}

describe('SyncEngine.propagateChange', () => {
    it('should propagate to all non-master variants when no plugConnections', () => {
        const cs = makeCS();
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas).toHaveLength(1);
        expect(result.deltas[0].variantId).toBe('v-slave');
    });

    it('should propagate opacity changes', () => {
        const cs = makeCS();
        cs.variants[0].elements[0].opacity = 0.5;
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas[0].changes.opacity).toBe(0.5);
    });

    it('should skip syncLocked variants', () => {
        const cs = makeCS({ locked: ['v-slave'] });
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas).toHaveLength(0);
        expect(result.skipped).toHaveLength(1);
        expect(result.skipped[0].reason).toBe('syncLocked');
    });

    it('should skip overridden elements', () => {
        const cs = makeCS({ overridden: { 'v-slave': ['el-1'] } });
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas).toHaveLength(0);
        expect(result.skipped[0].reason).toBe('overridden');
    });

    it('should only propagate to plugged targets when plugConnections exist', () => {
        const cs = makeCS({ plugs: { 'v-slave': 'v-master' } });
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas).toHaveLength(1);
    });

    it('should skip non-plugged targets', () => {
        // Plug exists but does NOT connect slave to master
        const cs = makeCS({ plugs: { 'v-other': 'v-master' } });
        const result = SyncEngine.propagateChange(cs.variants[0].elements[0], cs);
        expect(result.deltas).toHaveLength(0);
        expect(result.skipped.some(s => s.reason === 'not-plugged')).toBe(true);
    });
});

describe('SyncEngine.fullSync', () => {
    it('should sync all master elements', () => {
        const cs = makeCS();
        const result = SyncEngine.fullSync(cs);
        expect(result.deltas).toHaveLength(1); // 1 element × 1 slave
    });

    it('should return empty for missing master', () => {
        const cs = makeCS();
        cs.masterVariantId = 'nonexistent';
        const result = SyncEngine.fullSync(cs);
        expect(result.deltas).toHaveLength(0);
    });
});

describe('SyncEngine.batchPropagate', () => {
    it('should propagate multiple elements at once', () => {
        const cs = makeCS();
        const el2: DesignElement = { id: 'el-2', type: 'text', name: 'Title', visible: true, locked: false, opacity: 1, zIndex: 1, constraints: createDefaultConstraints() } as any;
        cs.variants[0].elements.push(el2);
        cs.variants[1].elements.push({ ...el2 });

        const result = SyncEngine.batchPropagate(cs.variants[0].elements, cs);
        expect(result.deltas).toHaveLength(2);
    });
});

describe('SyncEngine.absoluteToConstraints', () => {
    it('should delegate to canonical implementation', () => {
        const c = SyncEngine.absoluteToConstraints(10, 20, 100, 50, 300, 250);
        expect(c).toBeDefined();
        expect(c.size.width).toBe(100);
        expect(c.size.height).toBe(50);
    });
});
