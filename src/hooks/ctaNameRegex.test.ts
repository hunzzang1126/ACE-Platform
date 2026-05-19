// ─────────────────────────────────────────────────
// ctaNameRegex.test.ts — ★ REGRESSION: 'rectangle' contains 'cta'
// ─────────────────────────────────────────────────
// Root cause: name.includes('cta') matches 're[cta]ngle'.
// Fix: isCtaName/isCtaOrButton/isCtaLabel from nameRoleMatch.ts
// This file guards against regression across ALL modules.
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { isCtaName, isLabelName, isCtaOrButton, isCtaLabel } from '@/utils/nameRoleMatch';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Verify ALL production modules use nameRoleMatch (not raw includes) ──

const FILES_THAT_MUST_NOT_USE_INCLUDES = [
    { path: 'src/hooks/agentFlowHelpers.ts', label: 'agentFlowHelpers' },
    { path: 'src/hooks/agentImageOverlay.ts', label: 'agentImageOverlay' },
    { path: 'src/hooks/agentColorRecolor.ts', label: 'agentColorRecolor' },
    { path: 'src/hooks/agentColorRecolorHarmony.ts', label: 'agentColorRecolorHarmony' },
    { path: 'src/ai/executors/designElementCreators.ts', label: 'designElementCreators' },
    { path: 'src/services/templateResolver.ts', label: 'templateResolver' },
    { path: 'src/services/designPolish.ts', label: 'designPolish' },
];

describe('★ REGRESSION: CTA name detection must NOT use name.includes', () => {
    for (const { path, label } of FILES_THAT_MUST_NOT_USE_INCLUDES) {
        it(`${label}: must NOT use name.includes('cta')`, () => {
            const src = readFileSync(resolve(__dirname, '../../', path), 'utf-8');
            const lines = src.split('\n');
            const violations = lines
                .map((line, i) => ({ line: line.trim(), num: i + 1 }))
                .filter(({ line }) =>
                    line.includes("name.includes('cta')") &&
                    !line.startsWith('//') &&
                    !line.startsWith('*')
                );
            if (violations.length > 0) {
                const details = violations.map(v => `  L${v.num}: ${v.line}`).join('\n');
                throw new Error(
                    `${label} uses name.includes('cta') which matches 'rectangle'!\n` +
                    `Use isCtaName/isCtaOrButton from nameRoleMatch.ts instead.\n${details}`
                );
            }
        });

        it(`${label}: must NOT use name.includes('label')`, () => {
            const src = readFileSync(resolve(__dirname, '../../', path), 'utf-8');
            const lines = src.split('\n');
            const violations = lines
                .map((line, i) => ({ line: line.trim(), num: i + 1 }))
                .filter(({ line }) =>
                    line.includes("name.includes('label')") &&
                    !line.startsWith('//') &&
                    !line.startsWith('*')
                );
            if (violations.length > 0) {
                const details = violations.map(v => `  L${v.num}: ${v.line}`).join('\n');
                throw new Error(
                    `${label} uses name.includes('label') — use isLabelName from nameRoleMatch.ts instead.\n${details}`
                );
            }
        });
    }
});

describe('★ REGRESSION: isCtaName rejects rectangle variants', () => {
    const rejectNames = ['rectangle', 'Rectangle #21', 'rectangle_001', 'rounded_rectangle'];
    const acceptNames = ['cta', 'cta_button', 'main_cta', 'cta bg', 'CTA'];

    for (const name of rejectNames) {
        it(`"${name}" must NOT match isCtaName`, () => {
            expect(isCtaName(name.toLowerCase())).toBe(false);
        });
    }
    for (const name of acceptNames) {
        it(`"${name}" SHOULD match isCtaName`, () => {
            expect(isCtaName(name.toLowerCase())).toBe(true);
        });
    }
});

describe('★ REGRESSION: isLabelName rejects rectangle/labelling', () => {
    const rejectNames = ['rectangle', 'labelling', 'labeller'];
    const acceptNames = ['label', 'cta_label', 'label_text', 'main_label'];

    for (const name of rejectNames) {
        it(`"${name}" must NOT match isLabelName`, () => {
            expect(isLabelName(name.toLowerCase())).toBe(false);
        });
    }
    for (const name of acceptNames) {
        it(`"${name}" SHOULD match isLabelName`, () => {
            expect(isLabelName(name.toLowerCase())).toBe(true);
        });
    }
});

describe('isCtaOrButton combines cta + button', () => {
    it('matches button names', () => {
        expect(isCtaOrButton('button_primary')).toBe(true);
        expect(isCtaOrButton('submit_button')).toBe(true);
    });
    it('matches cta names', () => {
        expect(isCtaOrButton('cta_bg')).toBe(true);
    });
    it('rejects rectangle', () => {
        expect(isCtaOrButton('rectangle')).toBe(false);
    });
});

describe('isCtaLabel combines cta + label', () => {
    it('matches cta_label', () => {
        expect(isCtaLabel('cta_label')).toBe(true);
    });
    it('rejects rectangle', () => {
        expect(isCtaLabel('rectangle')).toBe(false);
    });
});
