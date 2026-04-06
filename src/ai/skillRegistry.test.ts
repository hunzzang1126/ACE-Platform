// ─────────────────────────────────────────────────
// skillRegistry.test.ts — AI skill registry
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: () => null,
}));

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
});

import {
    BUILT_IN_SKILLS,
    loadLearnedSkills,
    getAllSkills,
    skillsToPromptSection,
} from './skillRegistry';

beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe('BUILT_IN_SKILLS', () => {
    it('has at least 5 skills', () => {
        expect(BUILT_IN_SKILLS.length).toBeGreaterThanOrEqual(5);
    });

    it('all have required fields', () => {
        for (const s of BUILT_IN_SKILLS) {
            expect(s.id).toBeTruthy();
            expect(s.name).toBeTruthy();
            expect(s.tools.length).toBeGreaterThan(0);
            expect(s.source).toBe('built-in');
        }
    });
});

describe('loadLearnedSkills', () => {
    it('returns empty array with no saved skills', () => {
        expect(loadLearnedSkills()).toEqual([]);
    });

    it('returns saved skills from localStorage', () => {
        mockStorage['ace-ai-learned-skills'] = JSON.stringify([
            { id: 's1', name: 'Test', description: 'd', trigger: 't', tools: ['t1'], examples: [], source: 'learned' },
        ]);
        const skills = loadLearnedSkills();
        expect(skills).toHaveLength(1);
    });
});

describe('getAllSkills', () => {
    it('returns at least built-in skills', () => {
        expect(getAllSkills().length).toBeGreaterThanOrEqual(BUILT_IN_SKILLS.length);
    });
});

describe('skillsToPromptSection', () => {
    it('returns non-empty string', () => {
        const section = skillsToPromptSection();
        expect(section.length).toBeGreaterThan(0);
    });
});
