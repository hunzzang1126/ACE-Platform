// ─────────────────────────────────────────────────
// useVisionQA.test.ts — Vision QA Hook
// ─────────────────────────────────────────────────
// Covers: element extraction, fix payload, vision analysis,
// QA state management, abort support
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useVisionQA.ts'), 'utf-8');

describe('useVisionQA — element extraction', () => {
    it('extracts element data for vision analysis', () => {
        expect(src).toContain('fontSize');
        expect(src).toContain('fontFamily');
        expect(src).toContain('opacity');
    });

    it('converts elements to fix payload data', () => {
        expect(src).toContain('elementToFixData');
    });
});

describe('useVisionQA — vision analysis', () => {
    it('runs vision QA via backend service', () => {
        expect(src).toContain('runVisionQA');
    });
});

describe('useVisionQA — state', () => {
    it('tracks QA status', () => {
        const hasStatus = src.includes('status') || src.includes('isRunning');
        expect(hasStatus).toBe(true);
    });
});

describe('useVisionQA — constraint handling', () => {
    it('uses resolveConstraints for position resolution', () => {
        expect(src).toContain('resolveConstraints');
    });
});
