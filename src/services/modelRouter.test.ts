// ─────────────────────────────────────────────────
// modelRouter.test.ts — Model Router Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { getModelForRole, getModelId, getMaxTokens, listModels, type AceModelRole } from '@/services/modelRouter';

describe('modelRouter', () => {
    it('planner uses Sonnet 4 (default)', () => {
        const config = getModelForRole('planner');
        expect(config.id).toBe('anthropic/claude-sonnet-4');
        expect(config.supportsTools).toBe(true);
        expect(config.maxTokens).toBeGreaterThan(0);
    });

    it('design uses same model as planner (Sonnet 4)', () => {
        const design = getModelForRole('design');
        const planner = getModelForRole('planner');
        expect(design.id).toBe(planner.id);
        expect(design.supportsVision).toBe(true);
        expect(design.supportsTools).toBe(true);
    });

    it('executor uses cheaper model than planner', () => {
        const planner = getModelForRole('planner');
        const executor = getModelForRole('executor');
        expect(executor.costPer1MInput).toBeLessThan(planner.costPer1MInput);
        expect(executor.id).toContain('haiku');
    });

    it('critic supports vision', () => {
        const config = getModelForRole('critic');
        expect(config.supportsVision).toBe(true);
    });

    it('image_fast and image_quality have different model IDs', () => {
        const fast = getModelId('image_fast');
        const quality = getModelId('image_quality');
        expect(fast).not.toBe(quality);
        expect(fast).toContain('gemini'); // NANO Banana 2.0
        expect(quality).toContain('gemini'); // Gemini 3 Pro Image
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
});
