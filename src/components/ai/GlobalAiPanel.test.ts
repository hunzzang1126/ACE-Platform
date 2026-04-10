// ─────────────────────────────────────────────────
// GlobalAiPanel.test.ts — Model selection + plan enforcement
// ─────────────────────────────────────────────────
// Covers: Sonnet 4 default, no Haiku enforcement,
// model display, role initialization
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './GlobalAiPanel.tsx'), 'utf-8');

describe('GlobalAiPanel — model selection', () => {
    it('defaults to design role (Sonnet 4) for all plans', () => {
        // Must use 'design' as initial role, not 'executor'
        expect(src).toContain("useState<AceModelRole>('design')");
    });

    it('★ REGRESSION: does NOT force starter users to executor role', () => {
        // Old code: if (userPlan === 'starter' && selectedRole === 'design') setSelectedRole('executor')
        expect(src).not.toContain("setSelectedRole('executor')");
    });

    it('★ REGRESSION: does NOT use executor as initial state for starter', () => {
        // Old code: return plan === 'starter' ? 'executor' : 'design'
        expect(src).not.toContain("'executor' : 'design'");
    });

    it('has no starter→executor enforcement useEffect', () => {
        // Ensure no useEffect that checks userPlan === 'starter' to force executor
        const starterCheck = src.includes("userPlan === 'starter' && selectedRole === 'design'");
        expect(starterCheck).toBe(false);
    });
});

describe('GlobalAiPanel — UI structure', () => {
    it('displays activeModel.name from getModelForRole', () => {
        expect(src).toContain('activeModel.name');
    });

    it('has ModelDropdown for role selection', () => {
        expect(src).toContain('ModelDropdown');
        expect(src).toContain('showModelDropdown');
    });

    it('has keyboard shortcut Cmd+K to toggle', () => {
        expect(src).toContain("e.key === 'k'");
    });
});
