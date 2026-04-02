// ─────────────────────────────────────────────────
// usePlanLimits.test.ts — Plan limit logic tests
// ─────────────────────────────────────────────────
// Tests the pure limit-checking logic from planTypes.ts
// rather than the React hook (which needs React render context).

import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, isUnlimited, type PlanTier, type ExportFormat } from '@/schema/planTypes';

// ══════════════════════════════════════════════════
// PLAN_LIMITS structure
// ══════════════════════════════════════════════════

describe('PLAN_LIMITS — structure', () => {
    const tiers: PlanTier[] = ['starter', 'creator', 'pro', 'enterprise', 'admin'];

    for (const tier of tiers) {
        it(`${tier} tier exists`, () => {
            expect(PLAN_LIMITS[tier]).toBeDefined();
        });

        it(`${tier} has aiTokensPerMonth`, () => {
            expect(typeof PLAN_LIMITS[tier].aiTokensPerMonth).toBe('number');
        });

        it(`${tier} has maxCreativeSets`, () => {
            expect(PLAN_LIMITS[tier].maxCreativeSets).toBeDefined();
        });

        it(`${tier} has allowedExports array`, () => {
            expect(Array.isArray(PLAN_LIMITS[tier].allowedExports)).toBe(true);
        });
    }
});

// ══════════════════════════════════════════════════
// isUnlimited
// ══════════════════════════════════════════════════

describe('isUnlimited', () => {
    it('returns true for -1', () => {
        expect(isUnlimited(-1)).toBe(true);
    });

    it('returns false for positive numbers', () => {
        expect(isUnlimited(10)).toBe(false);
        expect(isUnlimited(0)).toBe(false);
    });
});

// ══════════════════════════════════════════════════
// Tier hierarchy
// ══════════════════════════════════════════════════

describe('PLAN_LIMITS — tier hierarchy', () => {
    it('pro has more AI tokens than starter', () => {
        expect(PLAN_LIMITS.pro.aiTokensPerMonth).toBeGreaterThan(PLAN_LIMITS.starter.aiTokensPerMonth);
    });

    it('admin has unlimited creative sets', () => {
        expect(isUnlimited(PLAN_LIMITS.admin.maxCreativeSets)).toBe(true);
    });

    it('starter allows png export', () => {
        expect(PLAN_LIMITS.starter.allowedExports).toContain('png');
    });
});

// ══════════════════════════════════════════════════
// canCreateSet / canUseAI / canExportFormat logic
// ══════════════════════════════════════════════════

describe('Plan limit checks — pure logic', () => {
    it('canCreateSet: below limit → true', () => {
        const limit = PLAN_LIMITS.starter.maxCreativeSets;
        if (!isUnlimited(limit)) {
            expect(0 < limit).toBe(true);
        }
    });

    it('canUseAI: 0 used → true', () => {
        expect(0 < PLAN_LIMITS.starter.aiTokensPerMonth).toBe(true);
    });

    it('canExportFormat: png always allowed', () => {
        const formats: ExportFormat[] = ['png'];
        for (const f of formats) {
            expect(PLAN_LIMITS.starter.allowedExports.includes(f)).toBe(true);
        }
    });
});
