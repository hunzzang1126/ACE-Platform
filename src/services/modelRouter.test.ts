// ─────────────────────────────────────────────────
// modelRouter.test.ts — Model Router Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { getModelForRole, getModelId, getMaxTokens, listModels, type AceModelRole } from '@/services/modelRouter';

describe('modelRouter', () => {
    it('returns correct model for planner role (Opus 4)', () => {
        const config = getModelForRole('planner');
        expect(config.id).toContain('opus');
        expect(config.supportsTools).toBe(true);
        expect(config.maxTokens).toBeGreaterThan(0);
    });

    it('uses cheaper model for executor role', () => {
        const planner = getModelForRole('planner');
        const executor = getModelForRole('executor');
        expect(executor.costPer1MInput).toBeLessThan(planner.costPer1MInput);
    });

    it('critic supports vision', () => {
        const config = getModelForRole('critic');
        expect(config.supportsVision).toBe(true);
    });

    it('image_fast and image_quality have different model IDs', () => {
        const fast = getModelId('image_fast');
        const quality = getModelId('image_quality');
        expect(fast).not.toBe(quality);
        expect(fast).toContain('flux');
        expect(quality).toContain('imagen');
    });

    it('getMaxTokens returns correct value', () => {
        expect(getMaxTokens('planner')).toBe(4096);
        expect(getMaxTokens('vision')).toBe(1024);
    });

    it('listModels covers all 7 roles', () => {
        const models = listModels();
        const roles: AceModelRole[] = ['planner', 'executor', 'critic', 'vision', 'design', 'image_fast', 'image_quality'];
        for (const role of roles) {
            expect(models[role]).toBeDefined();
            expect(models[role].id).toBeTruthy();
            expect(models[role].name).toBeTruthy();
        }
    });

    it('design role uses Sonnet 4', () => {
        const config = getModelForRole('design');
        expect(config.id).toContain('sonnet');
        expect(config.supportsVision).toBe(true);
        expect(config.supportsTools).toBe(true);
    });
});
