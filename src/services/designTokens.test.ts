// ─────────────────────────────────────────────────
// designTokens.test.ts — Design token derivation tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { deriveDesignTokens, buildTokenPromptForAI } from './designTokens';
import type { DesignToken } from './designTokens';

// ── Factory ──

function makeBrandKit() {
    return {
        palette: {
            primary: '#c9a84c',
            secondary: '#1a1a2e',
            accent: '#ff6b35',
            background: '#0a0e1a',
            text: '#ffffff',
            gradients: [{ name: 'Sunset', start: '#ff6b35', end: '#ffc107', angle: 135 }],
        },
        typography: {
            heading: { family: 'Inter', weights: [700, 800], letterSpacing: -0.5 },
            body: { family: 'Inter', weights: [400, 500], letterSpacing: 0 },
            cta: { family: 'Inter', weights: [600], transform: 'uppercase' },
        },
        guidelines: {
            name: 'TestBrand',
            industry: 'tech',
            voiceTone: 'professional',
            tagline: 'Build faster',
            ctaPhrases: ['Get Started', 'Try Free'],
            forbiddenColors: ['#ff0000'],
            forbiddenWords: ['cheap'],
        },
        assets: [],
    } as any;
}

describe('designTokens', () => {
    describe('deriveDesignTokens', () => {
        it('should derive color tokens from palette', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const colorTokens = tokens.filter(t => t.category === 'color');
            expect(colorTokens.length).toBeGreaterThanOrEqual(5);
            expect(colorTokens.find(t => t.key === 'color.primary')?.value).toBe('#c9a84c');
            expect(colorTokens.find(t => t.key === 'color.secondary')?.value).toBe('#1a1a2e');
        });

        it('should include gradient tokens', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const gradient = tokens.find(t => t.key === 'color.gradient.0');
            expect(gradient).toBeDefined();
            expect(gradient?.value).toContain('linear-gradient');
            expect(gradient?.value).toContain('#ff6b35');
        });

        it('should derive typography tokens', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const fontTokens = tokens.filter(t => t.category === 'font');
            expect(fontTokens.length).toBeGreaterThanOrEqual(6);
            expect(fontTokens.find(t => t.key === 'font.heading.family')?.value).toBe('Inter');
            expect(fontTokens.find(t => t.key === 'font.cta.transform')?.value).toBe('uppercase');
        });

        it('should include spacing tokens', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const spacingTokens = tokens.filter(t => t.category === 'spacing');
            expect(spacingTokens).toHaveLength(5);
            expect(spacingTokens.find(t => t.key === 'spacing.md')?.value).toBe('16px');
        });

        it('should include effect tokens', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const effectTokens = tokens.filter(t => t.category === 'effect');
            expect(effectTokens.length).toBeGreaterThan(0);
            expect(effectTokens.find(t => t.key === 'effect.radius.md')?.value).toBe('8px');
        });

        it('should have valid token structure', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            for (const t of tokens) {
                expect(t.key).toBeTruthy();
                expect(t.value).toBeTruthy();
                expect(['color', 'font', 'spacing', 'effect', 'layout']).toContain(t.category);
                expect(t.description).toBeTruthy();
            }
        });

        it('should have unique token keys', () => {
            const tokens = deriveDesignTokens(makeBrandKit());
            const keys = tokens.map(t => t.key);
            expect(new Set(keys).size).toBe(keys.length);
        });
    });

    describe('buildTokenPromptForAI', () => {
        it('should include color tokens section', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('COLOR TOKENS');
            expect(prompt).toContain('#c9a84c');
        });

        it('should include typography section', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('TYPOGRAPHY TOKENS');
            expect(prompt).toContain('Inter');
        });

        it('should include spacing section', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('SPACING TOKENS');
        });

        it('should include effect section', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('EFFECT TOKENS');
        });

        it('should include brand guidelines', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('BRAND GUIDELINES');
            expect(prompt).toContain('TestBrand');
            expect(prompt).toContain('Build faster');
        });

        it('should include CTA phrases', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('Get Started');
        });

        it('should include forbidden colors', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('#ff0000');
        });

        it('should include usage instruction', () => {
            const prompt = buildTokenPromptForAI(makeBrandKit());
            expect(prompt).toContain('Use these exact token values');
        });
    });
});
