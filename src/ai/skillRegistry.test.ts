// ─────────────────────────────────────────────────
// Skill Registry Tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    BUILT_IN_SKILLS,
    loadLearnedSkills,
    promoteToSkill,
    removeLearnedSkill,
    getAllSkills,
    skillsToPromptSection,
    incrementSkillUsage,
} from './skillRegistry';

// Mock localStorage
const localStorageMock: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => localStorageMock[key] ?? null,
    setItem: (key: string, value: string) => { localStorageMock[key] = value; },
    removeItem: (key: string) => { delete localStorageMock[key]; },
});

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    getSupabase: () => null,
}));

describe('skillRegistry', () => {
    beforeEach(() => {
        Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
    });

    describe('BUILT_IN_SKILLS', () => {
        it('should have exactly 8 built-in skills', () => {
            expect(BUILT_IN_SKILLS).toHaveLength(8);
        });

        it('should all have source "built-in"', () => {
            for (const skill of BUILT_IN_SKILLS) {
                expect(skill.source).toBe('built-in');
            }
        });

        it('should all have unique IDs', () => {
            const ids = BUILT_IN_SKILLS.map(s => s.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('should all have at least one example', () => {
            for (const skill of BUILT_IN_SKILLS) {
                expect(skill.examples.length).toBeGreaterThanOrEqual(1);
            }
        });

        it('should all have at least one tool', () => {
            for (const skill of BUILT_IN_SKILLS) {
                expect(skill.tools.length).toBeGreaterThanOrEqual(1);
            }
        });

        it('should include full-design-pipeline skill', () => {
            expect(BUILT_IN_SKILLS.some(s => s.id === 'full-design-pipeline')).toBe(true);
        });

        it('should include dynamic-action as catch-all', () => {
            const da = BUILT_IN_SKILLS.find(s => s.id === 'dynamic-action');
            expect(da).toBeDefined();
            expect(da!.tools).toContain('execute_dynamic_action');
        });
    });

    describe('Learned Skills', () => {
        it('should return empty array when no learned skills', () => {
            expect(loadLearnedSkills()).toEqual([]);
        });

        it('should promote a dynamic action to a learned skill', async () => {
            const skill = await promoteToSkill(
                'Translate All Text',
                'Translates all text elements to a target language',
                'User wants to translate all text',
                ['translate all to English', 'change language to Korean'],
                'elements.filter(e => e.type === "text").forEach(e => e.content = translate(e.content))',
            );

            expect(skill.source).toBe('learned');
            expect(skill.name).toBe('Translate All Text');
            expect(skill.usageCount).toBe(1);
            expect(skill.codePattern).toContain('translate');

            const loaded = loadLearnedSkills();
            expect(loaded).toHaveLength(1);
            expect(loaded[0]!.id).toBe(skill.id);
        });

        it('should increment usage count', async () => {
            const skill = await promoteToSkill(
                'Test Skill',
                'Test',
                'Test trigger',
                ['test'],
                'test()',
            );
            expect(skill.usageCount).toBe(1);

            incrementSkillUsage(skill.id);
            const loaded = loadLearnedSkills();
            expect(loaded[0]!.usageCount).toBe(2);
        });

        it('should remove a learned skill', async () => {
            await promoteToSkill('To Remove', 'desc', 'trig', ['ex'], 'code()');
            expect(loadLearnedSkills()).toHaveLength(1);

            const skillId = loadLearnedSkills()[0]!.id;
            removeLearnedSkill(skillId);
            expect(loadLearnedSkills()).toHaveLength(0);
        });

        it('should limit learned skills to 20', async () => {
            for (let i = 0; i < 25; i++) {
                await promoteToSkill(`Skill ${i}`, 'desc', 'trig', ['ex'], 'code()');
            }
            expect(loadLearnedSkills().length).toBeLessThanOrEqual(20);
        });
    });

    describe('getAllSkills', () => {
        it('should return built-in + learned', async () => {
            await promoteToSkill('Learned One', 'desc', 'trig', ['ex'], 'code()');
            const all = getAllSkills();
            expect(all.length).toBe(BUILT_IN_SKILLS.length + 1);
            expect(all[all.length - 1]!.source).toBe('learned');
        });
    });

    describe('skillsToPromptSection', () => {
        it('should include all built-in skill names', () => {
            const prompt = skillsToPromptSection();
            for (const skill of BUILT_IN_SKILLS) {
                expect(prompt).toContain(skill.name);
            }
        });

        it('should include learned skills with [LEARNED] badge', async () => {
            await promoteToSkill('Custom Magic', 'does magic', 'when magic', ['magic'], 'doMagic()');
            const prompt = skillsToPromptSection();
            expect(prompt).toContain('Custom Magic');
            expect(prompt).toContain('[LEARNED]');
        });

        it('should include skill rules', () => {
            const prompt = skillsToPromptSection();
            expect(prompt).toContain('SKILL RULES');
            expect(prompt).toContain('Dynamic Action');
        });
    });
});
