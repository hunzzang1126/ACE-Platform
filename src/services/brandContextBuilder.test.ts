// ─────────────────────────────────────────────────
// brandContextBuilder.test.ts — Brand kit → AI context tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    buildBrandContextForPlanner,
    buildAssetReferencesForExecutor,
    buildBrandComplianceForCritic,
    buildCompactBrandContext,
    buildBrandVisionBlocks,
} from './brandContextBuilder';

// ── Factory ──

function makeBrandKit(overrides?: Record<string, unknown>) {
    return {
        name: 'TestBrand',
        palette: {
            primary: '#c9a84c', secondary: '#1a1a2e', accent: '#ff6b35',
            background: '#0a0e1a', text: '#ffffff',
            gradients: [{ name: 'Sunset', start: '#ff6b35', end: '#ffc107', angle: 135 }],
        },
        typography: {
            heading: { family: 'Montserrat', weights: [700, 800], letterSpacing: -0.5 },
            body: { family: 'Inter', weights: [400, 500], letterSpacing: 0 },
            cta: { family: 'Inter', weights: [600], transform: 'uppercase' },
        },
        guidelines: {
            name: 'TestBrand',
            industry: 'tech',
            voiceTone: 'professional',
            tagline: 'Build Better',
            ctaPhrases: ['Get Started', 'Learn More'],
            logoPlacementRules: 'Top-left corner',
            forbiddenColors: ['#ff0000'],
            forbiddenWords: ['cheap'],
        },
        assets: [
            { id: 'a1', name: 'Main Logo', category: 'logo', role: 'primary_logo', width: 200, height: 50, format: 'png', isFavorite: true, usageCount: 5, src: 'data:image/png;base64,abc123', thumbSrc: 'data:image/png;base64,thumb1', metadata: { suggestedPlacement: 'top-left' } },
            { id: 'a2', name: 'Product Shot', category: 'product', role: null, width: 400, height: 300, format: 'jpg', isFavorite: false, usageCount: 2, src: 'data:image/jpeg;base64,def456', thumbSrc: null, metadata: { suggestedPlacement: 'center' } },
            { id: 'a3', name: 'Deleted Asset', category: 'logo', role: null, width: 100, height: 100, format: 'png', deletedAt: '2026-01-01', isFavorite: false, usageCount: 0, src: '', metadata: { suggestedPlacement: null } },
        ],
        ...overrides,
    } as any;
}

describe('brandContextBuilder', () => {
    // ── buildBrandContextForPlanner ──
    describe('buildBrandContextForPlanner', () => {
        it('should include brand name and industry', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('TestBrand');
            expect(ctx).toContain('tech');
        });

        it('should include palette colors', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('#c9a84c');
            expect(ctx).toContain('#ff6b35');
        });

        it('should include gradient info', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('Sunset');
            expect(ctx).toContain('#ffc107');
        });

        it('should include typography', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('Montserrat');
            expect(ctx).toContain('Inter');
        });

        it('should list logos (excluding deleted)', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('Main Logo');
            expect(ctx).not.toContain('Deleted Asset');
        });

        it('should list product images', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('Product Shot');
        });

        it('should include favorites', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('[FAV]');
        });

        it('should include tagline', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('Build Better');
        });

        it('should include forbidden colors', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('#ff0000');
        });

        it('should include planner instructions', () => {
            const ctx = buildBrandContextForPlanner(makeBrandKit());
            expect(ctx).toContain('INSTRUCTIONS FOR PLANNER');
        });
    });

    // ── buildAssetReferencesForExecutor ──
    describe('buildAssetReferencesForExecutor', () => {
        it('should return active assets only', () => {
            const refs = buildAssetReferencesForExecutor(makeBrandKit());
            expect(refs).toHaveLength(2); // excludes deleted
        });

        it('should include asset dimensions', () => {
            const refs = buildAssetReferencesForExecutor(makeBrandKit());
            const logo = refs.find(r => r.name === 'Main Logo');
            expect(logo).toBeDefined();
            expect(logo!.width).toBe(200);
            expect(logo!.height).toBe(50);
        });

        it('should include suggested placement', () => {
            const refs = buildAssetReferencesForExecutor(makeBrandKit());
            expect(refs[0].suggestedPlacement).toBe('top-left');
        });
    });

    // ── buildBrandComplianceForCritic ──
    describe('buildBrandComplianceForCritic', () => {
        it('should include all allowed colors', () => {
            const rules = buildBrandComplianceForCritic(makeBrandKit());
            expect(rules.allowedColors).toContain('#c9a84c');
            expect(rules.allowedColors).toContain('#ff6b35');
            expect(rules.allowedColors).toContain('#ffc107'); // gradient
        });

        it('should include forbidden colors', () => {
            const rules = buildBrandComplianceForCritic(makeBrandKit());
            expect(rules.forbiddenColors).toContain('#ff0000');
        });

        it('should list required assets', () => {
            const rules = buildBrandComplianceForCritic(makeBrandKit());
            expect(rules.requiredAssets).toContain('Main Logo'); // primary_logo role
        });

        it('should include font families', () => {
            const rules = buildBrandComplianceForCritic(makeBrandKit());
            expect(rules.fontFamilies).toContain('Montserrat');
            expect(rules.fontFamilies).toContain('Inter');
        });
    });

    // ── buildCompactBrandContext ──
    describe('buildCompactBrandContext', () => {
        it('should be a single line', () => {
            const compact = buildCompactBrandContext(makeBrandKit());
            expect(compact.split('\n')).toHaveLength(1);
        });

        it('should include brand name and colors', () => {
            const compact = buildCompactBrandContext(makeBrandKit());
            expect(compact).toContain('TestBrand');
            expect(compact).toContain('#c9a84c');
        });

        it('should include asset counts (excluding deleted)', () => {
            const compact = buildCompactBrandContext(makeBrandKit());
            expect(compact).toContain('Logos: 1');
            expect(compact).toContain('Products: 1');
        });
    });

    // ── buildBrandVisionBlocks ──
    describe('buildBrandVisionBlocks', () => {
        it('should return empty for no assets', () => {
            const kit = makeBrandKit({ assets: [] });
            expect(buildBrandVisionBlocks(kit)).toEqual([]);
        });

        it('should return text + image blocks for assets', () => {
            const blocks = buildBrandVisionBlocks(makeBrandKit());
            expect(blocks.length).toBeGreaterThan(0);
            const imageBlocks = blocks.filter(b => b.type === 'image');
            expect(imageBlocks.length).toBeGreaterThan(0);
        });

        it('should extract base64 data from data URLs', () => {
            const blocks = buildBrandVisionBlocks(makeBrandKit());
            const imageBlock = blocks.find(b => b.type === 'image') as any;
            expect(imageBlock.source.type).toBe('base64');
            expect(imageBlock.source.data).toBeTruthy();
        });

        it('should include asset labels', () => {
            const blocks = buildBrandVisionBlocks(makeBrandKit());
            const textBlocks = blocks.filter(b => b.type === 'text') as any[];
            const labels = textBlocks.map(b => b.text);
            expect(labels.some(l => l.includes('Main Logo'))).toBe(true);
        });

        it('should limit to 6 assets', () => {
            const manyAssets = Array.from({ length: 10 }, (_, i) => ({
                id: `a${i}`, name: `Asset ${i}`, category: 'product', role: null,
                width: 100, height: 100, format: 'png',
                src: 'data:image/png;base64,abc', thumbSrc: 'data:image/png;base64,thumb',
                metadata: { suggestedPlacement: null },
            }));
            const blocks = buildBrandVisionBlocks(makeBrandKit({ assets: manyAssets }));
            const imageBlocks = blocks.filter(b => b.type === 'image');
            expect(imageBlocks.length).toBeLessThanOrEqual(6);
        });
    });
});
