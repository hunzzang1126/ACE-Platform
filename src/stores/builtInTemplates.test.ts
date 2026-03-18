// ─────────────────────────────────────────────────
// builtInTemplates.test — Validate template integrity
// ─────────────────────────────────────────────────
// Ensures all built-in templates have valid element
// positions, no overlaps, correct types, and proper
// font sizes relative to canvas dimensions.
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATES } from './builtInTemplates';

describe('BUILT_IN_TEMPLATES', () => {
    it('exports exactly 5 built-in templates', () => {
        expect(BUILT_IN_TEMPLATES).toHaveLength(5);
    });

    it('all templates are marked as built-in', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            expect(t.isBuiltIn).toBe(true);
        }
    });

    it('all templates have unique IDs', () => {
        const ids = BUILT_IN_TEMPLATES.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all templates have valid dimensions (> 0)', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            expect(t.width).toBeGreaterThan(0);
            expect(t.height).toBeGreaterThan(0);
        }
    });

    it('all templates have valid category', () => {
        const validCategories = ['display', 'social', 'video'];
        for (const t of BUILT_IN_TEMPLATES) {
            expect(validCategories).toContain(t.category);
        }
    });

    it('all templates have non-empty name and description', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            expect(t.name.length).toBeGreaterThan(0);
            expect(t.description.length).toBeGreaterThan(0);
        }
    });

    it('all templates have parseable variantSnapshot', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            expect(() => JSON.parse(t.variantSnapshot)).not.toThrow();
            const variant = JSON.parse(t.variantSnapshot);
            expect(variant.id).toBeTruthy();
            expect(variant.elements).toBeInstanceOf(Array);
            expect(variant.elements.length).toBeGreaterThan(0);
        }
    });

    it('all template elements have valid types', () => {
        const validTypes = ['text', 'shape', 'button', 'image', 'video'];
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            for (const el of variant.elements) {
                expect(validTypes).toContain(el.type);
            }
        }
    });

    it('all templates have at least one background shape', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            const bgElements = variant.elements.filter(
                (el: any) => el.type === 'shape' && el.role === 'background',
            );
            expect(bgElements.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('all templates have at least one headline text', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            const headlines = variant.elements.filter(
                (el: any) => el.type === 'text' && el.role === 'headline',
            );
            expect(headlines.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('all templates have at least one CTA', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            const ctas = variant.elements.filter(
                (el: any) => el.role === 'cta',
            );
            expect(ctas.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('text elements have positive fontSize', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            for (const el of variant.elements) {
                if (el.type === 'text' || el.type === 'button') {
                    expect(el.fontSize).toBeGreaterThan(0);
                }
            }
        }
    });

    it('elements have constraints with valid offsets', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            for (const el of variant.elements) {
                expect(el.constraints).toBeDefined();
                expect(el.constraints.horizontal).toBeDefined();
                expect(el.constraints.vertical).toBeDefined();
                expect(el.constraints.size).toBeDefined();
                // Offsets should be non-negative for built-in templates
                expect(el.constraints.horizontal.offset).toBeGreaterThanOrEqual(0);
                expect(el.constraints.vertical.offset).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('headline fontSize is proportional to canvas size', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            const headline = variant.elements.find((el: any) => el.role === 'headline');
            if (!headline) continue;
            // Headline should be at least 2% of the canvas diagonal
            const diagonal = Math.sqrt(t.width * t.width + t.height * t.height);
            const minFontSize = diagonal * 0.02;
            expect(headline.fontSize).toBeGreaterThanOrEqual(minFontSize);
        }
    });

    it('element positions are within canvas bounds', () => {
        for (const t of BUILT_IN_TEMPLATES) {
            const variant = JSON.parse(t.variantSnapshot);
            for (const el of variant.elements) {
                const x = el.constraints.horizontal.offset;
                const y = el.constraints.vertical.offset;
                // Position should be within canvas (with some tolerance for edge elements)
                expect(x).toBeLessThanOrEqual(t.width);
                expect(y).toBeLessThanOrEqual(t.height);
            }
        }
    });

    // ── Per-template snapshot tests ──

    it('T1 Bold Dark: 300x250 with correct element count', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-bold-dark')!;
        expect(t.width).toBe(300);
        expect(t.height).toBe(250);
        const variant = JSON.parse(t.variantSnapshot);
        expect(variant.elements.length).toBe(5); // bg, accent, headline, body, cta
    });

    it('T2 Warm Gradient: 728x90 leaderboard', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-warm-gradient')!;
        expect(t.width).toBe(728);
        expect(t.height).toBe(90);
        const variant = JSON.parse(t.variantSnapshot);
        expect(variant.elements.length).toBe(4); // bg, headline, subline, cta
    });

    it('T3 Clean Minimal: 300x250 SaaS', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-clean-minimal')!;
        expect(t.width).toBe(300);
        expect(t.height).toBe(250);
        const variant = JSON.parse(t.variantSnapshot);
        expect(variant.elements.length).toBe(6); // bg, top-bar, headline, body, cta, badge
    });

    it('T4 Luxury Gold: 160x600 skyscraper', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-luxury-gold')!;
        expect(t.width).toBe(160);
        expect(t.height).toBe(600);
        const variant = JSON.parse(t.variantSnapshot);
        expect(variant.elements.length).toBe(6); // bg, gold-line, headline, divider, body, cta
    });

    it('T5 Vibrant Event: 1080x1080 social', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-vibrant-event')!;
        expect(t.width).toBe(1080);
        expect(t.height).toBe(1080);
        expect(t.category).toBe('social');
        const variant = JSON.parse(t.variantSnapshot);
        expect(variant.elements.length).toBe(8); // bg, glow, date, headline, subline, line, location, cta
    });

    it('T5 headline and subline do not overlap', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-vibrant-event')!;
        const variant = JSON.parse(t.variantSnapshot);
        const headline = variant.elements.find((el: any) => el.role === 'headline');
        const subline = variant.elements.find((el: any) => el.role === 'body');
        expect(headline).toBeDefined();
        expect(subline).toBeDefined();

        const headlineY = headline.constraints.vertical.offset;
        const headlineH = headline.constraints.size.height;
        const sublineY = subline.constraints.vertical.offset;

        // Subline must start AFTER headline bounding box ends
        expect(sublineY).toBeGreaterThanOrEqual(headlineY + headlineH);
    });

    it('T4 elements are center-aligned (not left-biased)', () => {
        const t = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-luxury-gold')!;
        const variant = JSON.parse(t.variantSnapshot);
        const headline = variant.elements.find((el: any) => el.role === 'headline');
        expect(headline).toBeDefined();

        const headlineX = headline.constraints.horizontal.offset;
        const headlineW = headline.constraints.size.width;
        const centerOffset = Math.abs((headlineX + headlineW / 2) - t.width / 2);
        // Center should be within 15px of canvas center
        expect(centerOffset).toBeLessThan(15);
    });
});
