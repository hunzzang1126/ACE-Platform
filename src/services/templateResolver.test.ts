// ─────────────────────────────────────────────────
// templateResolver.test — Supabase-only template resolution
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, './templateResolver.ts'), 'utf-8');

// ── Code-level structural tests ──

describe('templateResolver — structure', () => {
    it('imports constraintsToAbsolute from constraintUtils (SINGLE RESOLVER)', () => {
        expect(SRC).toContain("constraintsToAbsolute");
        expect(SRC).toContain("@/engine/constraintUtils");
    });

    it('does NOT import from templateLayoutsA or templateLayoutsB (no hardcoded fallback)', () => {
        expect(SRC).not.toContain('templateLayoutsA');
        expect(SRC).not.toContain('templateLayoutsB');
    });

    it('does NOT call .build() anywhere (no hardcoded layout generation)', () => {
        expect(SRC).not.toContain('.build(');
    });

    it('reads from templateStore (Supabase-synced source)', () => {
        expect(SRC).toContain('useTemplateStore');
        expect(SRC).toContain('getById');
    });

    it('tries ai- and builtin- prefixed IDs for resolution', () => {
        expect(SRC).toContain('`ai-${templateId}`');
        expect(SRC).toContain('`builtin-${templateId}`');
    });

    it('exports resolveTemplateElements function', () => {
        expect(SRC).toContain('export function resolveTemplateElements');
    });

    it('exports getTemplateBackground function', () => {
        expect(SRC).toContain('export function getTemplateBackground');
    });

    it('parses variantSnapshot JSON', () => {
        expect(SRC).toContain('JSON.parse(tmpl.variantSnapshot)');
    });

    it('throws on missing template (no silent fallback)', () => {
        expect(SRC).toContain('throw new Error');
        expect(SRC).toContain('not found in store');
    });

    it('handles text, shape, and button element types', () => {
        expect(SRC).toContain("case 'text':");
        expect(SRC).toContain("case 'shape':");
        expect(SRC).toContain("case 'button':");
    });

    it('handles gradient shapes', () => {
        expect(SRC).toContain('gradient_start_hex');
        expect(SRC).toContain('gradient_end_hex');
        expect(SRC).toContain('gradient_angle');
    });

    it('handles ellipse shapes', () => {
        expect(SRC).toContain("'ellipse'");
    });

    it('handles rounded_rect shapes', () => {
        expect(SRC).toContain("'rounded_rect'");
        expect(SRC).toContain('borderRadius');
    });

    it('scales font size with Math.min(scaleX, scaleY)', () => {
        expect(SRC).toContain('Math.min(scaleX, scaleY)');
    });

    it('enforces minimum font size of 8px', () => {
        expect(SRC).toContain('Math.max(8');
    });
});

// ── agentGenerateFlow regression ──

describe('★ REGRESSION: agentGenerateFlow uses Supabase resolver', () => {
    let actualSrc = '';
    try {
        actualSrc = readFileSync(resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8');
    } catch { /* file not found */ }

    it('imports resolveTemplateElements (not template.build)', () => {
        expect(actualSrc).toContain('resolveTemplateElements');
    });

    it('does NOT call template.build() anymore', () => {
        expect(actualSrc).not.toContain('template.build(');
    });

    it('imports from templateResolver service', () => {
        expect(actualSrc).toContain('templateResolver');
    });
});
