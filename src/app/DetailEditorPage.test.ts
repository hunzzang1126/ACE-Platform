// ─────────────────────────────────────────────────
// DetailEditorPage.test.ts — Hook order regression guard
// ─────────────────────────────────────────────────
// ★ REGRESSION: React #300 "Rendered fewer hooks than expected"
// Caused by early return before hook calls in DetailEditorPage.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, 'DetailEditorPage.tsx');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('★ REGRESSION: DetailEditorPage hook order (#300/#520)', () => {
    it('should not have early returns before hook calls', () => {
        const lines = source.split('\n');
        const funcStart = lines.findIndex(l => l.includes('export function DetailEditorPage'));
        expect(funcStart).toBeGreaterThan(-1);

        let lastHookLine = -1;
        let firstEarlyReturnLine = -1;

        for (let i = funcStart; i < lines.length; i++) {
            const line = lines[i]!;
            const trimmed = line.trim();

            // Detect hook calls
            if (/\buse[A-Z]\w*[<(]/.test(trimmed)) {
                lastHookLine = i;
            }

            // Detect early returns with Navigate
            if (trimmed.includes('return') && trimmed.includes('<Navigate') && firstEarlyReturnLine === -1) {
                firstEarlyReturnLine = i;
            }
        }

        expect(lastHookLine).toBeGreaterThan(-1);
        expect(firstEarlyReturnLine).toBeGreaterThan(-1);

        // THE RULE: All hooks must be called BEFORE any early return
        expect(firstEarlyReturnLine).toBeGreaterThan(lastHookLine);
    });

    it('should use fallback dimensions when variant is null', () => {
        // Variant derivation should use optional chaining with fallback
        expect(source).toContain('creativeSet?.variants.find');
        expect(source).toContain('variant?.preset.width ?? 300');
        expect(source).toContain('variant?.preset.height ?? 250');
    });

    it('should have regression guard comment marker', () => {
        // Guard: the comment must exist as a regression marker
        expect(source).toContain('EARLY RETURNS');
        expect(source).toContain('AFTER all hooks');
        expect(source).toContain('HOOKS MUST BE CALLED UNCONDITIONALLY');
    });
});
