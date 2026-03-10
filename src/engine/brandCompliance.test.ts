// ─────────────────────────────────────────────────
// brandCompliance.test — Brand compliance checker tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { checkBrandCompliance, autoFixViolations } from './brandCompliance';
import type { BrandKit } from '@/stores/brandKitStore';
import type { EngineNode } from '@/hooks/canvasTypes';

const mockBrandKit: BrandKit = {
    id: 'bk1',
    name: 'Test Brand',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    assets: [],
    palette: {
        primary: '#c9a84c',
        secondary: '#1a1f2e',
        accent: '#ff6b35',
        background: '#0a0e1a',
        text: '#ffffff',
        gradients: [],
    },
    typography: {
        heading: { family: 'Inter', weights: [700, 800], letterSpacing: -0.5 },
        body: { family: 'Inter', weights: [400, 500], letterSpacing: 0 },
        cta: { family: 'Inter', weights: [600, 700], transform: 'uppercase' },
    },
    guidelines: {
        name: 'Test',
        industry: 'tech',
        voiceTone: 'Professional',
        tagline: 'Test tagline',
        ctaPhrases: ['Learn More'],
        forbiddenColors: ['#ff0000'],
        forbiddenWords: ['cheap', 'free'],
        logoPlacementRules: 'Top-right',
    },
};

function makeNode(id: number, type: string, r = 0.8, g = 0.66, b = 0.3): EngineNode {
    return {
        id, type: type as any,
        x: 10, y: 20, w: 100, h: 50,
        opacity: 1, z_index: 0,
        fill_r: r, fill_g: g, fill_b: b, fill_a: 1,
        border_radius: 0,
        name: `Element ${id}`,
    };
}

describe('checkBrandCompliance', () => {
    it('returns high score for on-brand elements', () => {
        // Colors close to brand palette
        const nodes = [makeNode(1, 'rect', 0.79, 0.66, 0.30)];
        const result = checkBrandCompliance(nodes, mockBrandKit);
        expect(result.score).toBeGreaterThanOrEqual(70);
        expect(result.grade).not.toBe('F');
    });

    it('detects forbidden color', () => {
        // Red (#ff0000) -> 1, 0, 0
        const nodes = [makeNode(1, 'rect', 1, 0, 0)];
        const result = checkBrandCompliance(nodes, mockBrandKit);
        expect(result.violations.some(v => v.category === 'color' && v.message.includes('forbidden'))).toBe(true);
    });

    it('detects off-brand color', () => {
        // Bright green -> clearly off-brand
        const nodes = [makeNode(1, 'rect', 0, 1, 0)];
        const result = checkBrandCompliance(nodes, mockBrandKit);
        expect(result.violations.some(v => v.category === 'color')).toBe(true);
    });

    it('suggests adding logo when brand has logos', () => {
        const kit = {
            ...mockBrandKit,
            assets: [{ category: 'logo' }] as any,
        };
        const result = checkBrandCompliance([], kit);
        expect(result.suggestions.some(s => s.includes('logo'))).toBe(true);
    });

    it('warns about no text elements', () => {
        const nodes = [makeNode(1, 'rect')];
        const result = checkBrandCompliance(nodes, mockBrandKit);
        expect(result.suggestions.some(s => s.includes('text') || s.includes('headline'))).toBe(true);
    });

    it('assigns correct grade', () => {
        const r1 = checkBrandCompliance([], mockBrandKit);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(r1.grade);
    });
});

describe('autoFixViolations', () => {
    it('returns patches for fixable violations', () => {
        const nodes = [makeNode(1, 'rect', 1, 0, 0)];
        const result = checkBrandCompliance(nodes, mockBrandKit);
        const patches = autoFixViolations(result.violations);
        expect(patches.length).toBeGreaterThan(0);
        expect(patches[0]!.elementId).toBe(1);
    });
});
