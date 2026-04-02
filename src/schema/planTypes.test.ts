// ─────────────────────────────────────────────────
// planTypes.test.ts — Plan tier definitions and limit checks
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    PLAN_LIMITS, PLANS, getPlanLimits, isUnlimited, hasFeature,
} from './planTypes';
import type { PlanTier, ExportFormat, PlanLimits as PlanLimitsType } from './planTypes';

const ALL_TIERS: PlanTier[] = ['starter', 'creator', 'pro', 'enterprise', 'admin'];

describe('planTypes', () => {
    describe('PLAN_LIMITS', () => {
        it('should have limits for all tiers', () => {
            for (const tier of ALL_TIERS) {
                expect(PLAN_LIMITS[tier]).toBeDefined();
            }
        });

        it('should increase AI tokens with tier level', () => {
            expect(PLAN_LIMITS.starter.aiTokensPerMonth).toBeLessThan(PLAN_LIMITS.creator.aiTokensPerMonth);
            expect(PLAN_LIMITS.creator.aiTokensPerMonth).toBeLessThan(PLAN_LIMITS.pro.aiTokensPerMonth);
            expect(PLAN_LIMITS.pro.aiTokensPerMonth).toBeLessThan(PLAN_LIMITS.enterprise.aiTokensPerMonth);
        });

        it('should give starter limited sets', () => {
            expect(PLAN_LIMITS.starter.maxCreativeSets).toBeGreaterThan(0);
            expect(PLAN_LIMITS.starter.maxCreativeSets).toBeLessThan(10);
        });

        it('should give pro unlimited sets', () => {
            expect(isUnlimited(PLAN_LIMITS.pro.maxCreativeSets)).toBe(true);
        });

        it('should give admin unlimited everything', () => {
            const admin = PLAN_LIMITS.admin;
            expect(isUnlimited(admin.maxCreativeSets)).toBe(true);
            expect(isUnlimited(admin.maxVariantsPerSet)).toBe(true);
            expect(isUnlimited(admin.maxTeamMembers)).toBe(true);
        });

        it('should restrict starter to PNG only', () => {
            expect(PLAN_LIMITS.starter.allowedExports).toEqual(['png']);
        });

        it('should give enterprise all export formats', () => {
            const ent = PLAN_LIMITS.enterprise.allowedExports;
            expect(ent).toContain('png');
            expect(ent).toContain('html5');
            expect(ent).toContain('gif');
            expect(ent).toContain('mp4');
        });

        it('should enable brand cloud only for enterprise+', () => {
            expect(PLAN_LIMITS.starter.brandCloudEnabled).toBe(false);
            expect(PLAN_LIMITS.creator.brandCloudEnabled).toBe(false);
            expect(PLAN_LIMITS.enterprise.brandCloudEnabled).toBe(true);
        });
    });

    describe('PLANS', () => {
        it('should have 4 plans (starter, creator, pro, enterprise)', () => {
            expect(PLANS).toHaveLength(4);
        });

        it('should have starter as free', () => {
            const starter = PLANS.find(p => p.tier === 'starter')!;
            expect(starter.priceMonthly).toBe(0);
        });

        it('should mark creator as popular', () => {
            const creator = PLANS.find(p => p.tier === 'creator')!;
            expect(creator.popular).toBe(true);
        });

        it('should have enterprise with custom pricing', () => {
            const ent = PLANS.find(p => p.tier === 'enterprise')!;
            expect(ent.priceMonthly).toBe(-1);
        });

        it('should have annual discount over monthly', () => {
            const creator = PLANS.find(p => p.tier === 'creator')!;
            expect(creator.priceAnnual).toBeLessThan(creator.priceMonthly);
        });
    });

    describe('getPlanLimits', () => {
        it('should return correct limits for tier', () => {
            expect(getPlanLimits('pro')).toBe(PLAN_LIMITS.pro);
        });
    });

    describe('isUnlimited', () => {
        it('should return true for -1', () => {
            expect(isUnlimited(-1)).toBe(true);
        });

        it('should return false for positive values', () => {
            expect(isUnlimited(10)).toBe(false);
            expect(isUnlimited(0)).toBe(false);
        });
    });

    describe('hasFeature', () => {
        it('should detect boolean features', () => {
            expect(hasFeature('enterprise', 'brandCloudEnabled')).toBe(true);
            expect(hasFeature('starter', 'brandCloudEnabled')).toBe(false);
        });

        it('should detect numeric features', () => {
            expect(hasFeature('starter', 'maxCreativeSets')).toBe(true);
        });

        it('should detect array features', () => {
            expect(hasFeature('starter', 'allowedExports')).toBe(true);
        });
    });
});
