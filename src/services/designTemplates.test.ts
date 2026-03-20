// ─────────────────────────────────────────────────
// designTemplates — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the 12 layout template build() functions,
// selectTemplate(), classifyAspect, and buildContentPrompt.

import { describe, it, expect } from 'vitest';
import { DESIGN_TEMPLATES, selectTemplate, buildContentPrompt } from './designTemplates';
import type { DesignStyleGuide } from './designStyleGuides';

// ── Shared test style guide ──

const testGuide: DesignStyleGuide = {
    id: 'test', name: 'Test', description: '', keywords: [],
    colors: {
        background: '#0f172a', surface: '#1e293b', border: '#334155',
        foreground: '#f8fafc', secondary: '#94a3b8', tertiary: '#64748b',
        muted: '#475569', accent: '#8b5cf6', accentForeground: '#ffffff',
        error: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
        gradientStart: '#0f172a', gradientEnd: '#1e1b4b', gradientAngle: 135,
    },
    typography: {
        primaryFont: 'Inter', secondaryFont: 'Inter',
        scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
        weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
        letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
    radius: 6,
};

const testContent = {
    headline: 'Test Headline',
    subheadline: 'Test Subheadline',
    cta: 'Learn More',
    tag: 'NEW',
};

// ── DESIGN_TEMPLATES registry ──

describe('DESIGN_TEMPLATES', () => {
    it('has exactly 12 templates', () => {
        expect(DESIGN_TEMPLATES).toHaveLength(12);
    });

    it('all templates have unique IDs', () => {
        const ids = DESIGN_TEMPLATES.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all templates have non-empty name and description', () => {
        for (const t of DESIGN_TEMPLATES) {
            expect(t.name.length).toBeGreaterThan(0);
            expect(t.description.length).toBeGreaterThan(0);
        }
    });

    it('all templates have at least one aspect ratio', () => {
        for (const t of DESIGN_TEMPLATES) {
            expect(t.aspectRatios.length).toBeGreaterThan(0);
        }
    });
});

// ── Template build() — every template at every size ──

describe('Template build() — output validation', () => {
    const sizes: [number, number][] = [[1080, 1080], [728, 90], [300, 250], [160, 600], [1200, 628]];

    for (const tmpl of DESIGN_TEMPLATES) {
        describe(tmpl.name, () => {
            for (const [w, h] of sizes) {
                it(`${w}x${h} → returns elements array`, () => {
                    const elements = tmpl.build(w, h, testGuide, testContent);
                    expect(Array.isArray(elements)).toBe(true);
                    expect(elements.length).toBeGreaterThan(0);
                });

                it(`${w}x${h} → has background element`, () => {
                    const elements = tmpl.build(w, h, testGuide, testContent);
                    const filtered = elements.filter(e => typeof e !== 'number');
                    const bg = filtered.find((e: any) => e.name?.includes('background'));
                    expect(bg).toBeDefined();
                });

                it(`${w}x${h} → has headline element`, () => {
                    const elements = tmpl.build(w, h, testGuide, testContent);
                    const filtered = elements.filter(e => typeof e !== 'number');
                    const headline = filtered.find((e: any) => e.name?.includes('headline'));
                    expect(headline).toBeDefined();
                });

                it(`${w}x${h} → all elements have valid positions`, () => {
                    const elements = tmpl.build(w, h, testGuide, testContent);
                    const filtered = elements.filter(e => typeof e !== 'number');
                    for (const el of filtered) {
                        const e = el as any;
                        expect(typeof e.x).toBe('number');
                        expect(typeof e.y).toBe('number');
                        expect(e.w).toBeGreaterThan(0);
                        expect(e.h).toBeGreaterThan(0);
                    }
                });

                it(`${w}x${h} → text elements have positive font_size`, () => {
                    const elements = tmpl.build(w, h, testGuide, testContent);
                    const filtered = elements.filter(e => typeof e !== 'number');
                    for (const el of filtered) {
                        const e = el as any;
                        if (e.type === 'text') {
                            expect(e.font_size).toBeGreaterThan(0);
                        }
                    }
                });
            }
        });
    }
});

// ── selectTemplate ──

describe('selectTemplate', () => {
    it('returns a template for square canvas', () => {
        const t = selectTemplate(1080, 1080);
        expect(t).not.toBeNull();
        expect(t!.id).toBeTruthy();
    });

    it('returns a template for wide canvas', () => {
        const t = selectTemplate(728, 90);
        expect(t).not.toBeNull();
    });

    it('returns a template for portrait canvas', () => {
        const t = selectTemplate(160, 600);
        expect(t).not.toBeNull();
    });

    it('rotates through templates (variety)', () => {
        const ids = new Set<string>();
        for (let i = 0; i < 12; i++) {
            const t = selectTemplate(1080, 1080);
            if (t) ids.add(t.id);
        }
        // Should have at least 2 different templates
        expect(ids.size).toBeGreaterThanOrEqual(2);
    });
});

// ── buildContentPrompt ──

describe('buildContentPrompt', () => {
    it('includes user prompt in output', () => {
        const prompt = buildContentPrompt('tech launch', 1080, 1080, 'Centered Stack');
        expect(prompt).toContain('tech launch');
    });

    it('includes template name', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'Bold Headline');
        expect(prompt).toContain('Bold Headline');
    });

    it('includes canvas dimensions', () => {
        const prompt = buildContentPrompt('test', 728, 90, 'Test');
        expect(prompt).toContain('728x90');
    });

    it('mentions single-line for wide canvas', () => {
        const prompt = buildContentPrompt('test', 728, 90, 'Test');
        expect(prompt).toContain('single line');
    });

    it('includes language parameter', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'Test', 'Korean');
        expect(prompt).toContain('Korean');
    });

    it('defaults to English', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'Test');
        expect(prompt).toContain('English');
    });

    it('instructs JSON structure output', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'Test');
        expect(prompt).toContain('"headline"');
        expect(prompt).toContain('"subheadline"');
        expect(prompt).toContain('"cta"');
        expect(prompt).toContain('"tag"');
    });
});
