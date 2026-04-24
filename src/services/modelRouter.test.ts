// ─────────────────────────────────────────────────
// Model Router — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getModelForRole, getModelId, getMaxTokens, listModels } from './modelRouter';
import type { AceModelRole } from './modelRouter';

describe('Model Router', () => {
    describe('getModelForRole', () => {
        it('planner uses Sonnet 4', () => {
            const config = getModelForRole('planner');
            expect(config.id).toContain('sonnet');
            expect(config.supportsTools).toBe(true);
            expect(config.supportsVision).toBe(true);
        });

        it('executor uses Haiku (cheaper)', () => {
            const config = getModelForRole('executor');
            expect(config.id).toContain('haiku');
            expect(config.supportsTools).toBe(true);
        });

        it('executor is cheaper than planner', () => {
            const planner = getModelForRole('planner');
            const executor = getModelForRole('executor');
            expect(executor.costPer1MInput).toBeLessThan(planner.costPer1MInput);
            expect(executor.costPer1MOutput).toBeLessThan(planner.costPer1MOutput);
        });

        it('executor maxTokens is less than planner', () => {
            expect(getMaxTokens('executor')).toBeLessThan(getMaxTokens('planner'));
        });
    });

    describe('getModelId', () => {
        const roles: AceModelRole[] = ['planner', 'executor', 'critic', 'vision', 'design', 'image_fast', 'image_quality'];
        for (const role of roles) {
            it(`returns valid model ID for ${role}`, () => {
                const id = getModelId(role);
                expect(id).toBeTruthy();
                expect(typeof id).toBe('string');
                expect(id.includes('/')).toBe(true); // format: provider/model
            });
        }
    });

    describe('listModels', () => {
        it('lists all roles', () => {
            const models = listModels();
            expect(Object.keys(models)).toContain('planner');
            expect(Object.keys(models)).toContain('executor');
            expect(Object.keys(models)).toContain('image_fast');
        });
    });

    describe('Cost estimation', () => {
        it('★ REGRESSION: 3-round conversation cost savings', () => {
            const planner = getModelForRole('planner');
            const executor = getModelForRole('executor');
            // Old: all Sonnet 4
            const oldCost = 3 * (2000 * planner.costPer1MInput / 1e6 + 1000 * planner.costPer1MOutput / 1e6);
            // New: 1 Sonnet + 2 Haiku
            const newCost =
                1 * (2000 * planner.costPer1MInput / 1e6 + 1000 * planner.costPer1MOutput / 1e6) +
                2 * (2000 * executor.costPer1MInput / 1e6 + 1000 * executor.costPer1MOutput / 1e6);
            const savings = 1 - newCost / oldCost;
            expect(savings).toBeGreaterThan(0.40); // At least 40% savings
        });
    });
});
