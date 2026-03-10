// ─────────────────────────────────────────────────
// sizingOverrideStore.test — Sizing override tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useSizingOverrideStore } from './sizingOverrideStore';

describe('useSizingOverrideStore', () => {
    beforeEach(() => {
        useSizingOverrideStore.setState({ overrides: {} });
    });

    it('sets an override', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x', 'y']);
        expect(useSizingOverrideStore.getState().hasOverride('v1', 'el1')).toBe(true);
    });

    it('merges override properties', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x']);
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['y', 'w']);
        const overrides = useSizingOverrideStore.getState().getVariantOverrides('v1');
        expect(overrides[0]!.overriddenProps).toContain('x');
        expect(overrides[0]!.overriddenProps).toContain('y');
        expect(overrides[0]!.overriddenProps).toContain('w');
    });

    it('locks and unlocks element', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x']);
        useSizingOverrideStore.getState().lockElement('v1', 'el1');
        expect(useSizingOverrideStore.getState().isLocked('v1', 'el1')).toBe(true);

        useSizingOverrideStore.getState().unlockElement('v1', 'el1');
        expect(useSizingOverrideStore.getState().isLocked('v1', 'el1')).toBe(false);
    });

    it('resets to master', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x']);
        useSizingOverrideStore.getState().resetToMaster('v1', 'el1');
        expect(useSizingOverrideStore.getState().hasOverride('v1', 'el1')).toBe(false);
    });

    it('resets entire variant', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x']);
        useSizingOverrideStore.getState().setOverride('v1', 'el2', ['y']);
        useSizingOverrideStore.getState().resetVariant('v1');
        expect(useSizingOverrideStore.getState().getOverrideCount('v1')).toBe(0);
    });

    it('counts overrides per variant', () => {
        useSizingOverrideStore.getState().setOverride('v1', 'el1', ['x']);
        useSizingOverrideStore.getState().setOverride('v1', 'el2', ['y']);
        expect(useSizingOverrideStore.getState().getOverrideCount('v1')).toBe(2);
    });

    it('returns false for non-existent overrides', () => {
        expect(useSizingOverrideStore.getState().hasOverride('v1', 'el1')).toBe(false);
        expect(useSizingOverrideStore.getState().isLocked('v1', 'el1')).toBe(false);
    });
});
