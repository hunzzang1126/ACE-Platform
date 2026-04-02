// ─────────────────────────────────────────────────
// analyzeTools.test.ts — Design analysis tool tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { analyzeColors, analyzeTypography, analyzeSpacing, analyzeBrandCompliance, analyzeTools } from './analyzeTools';
import type { ToolContext } from './toolTypes';

const mockElements = [
    { id: 'e1', name: 'Headline', type: 'text', fontFamily: 'Inter', fontSize: 36, fontWeight: 700, color: '#ffffff', role: 'headline', visible: true, locked: false, opacity: 1, zIndex: 2, constraints: { horizontal: { anchor: 'left', offset: 20 }, vertical: { anchor: 'top', offset: 20 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 260, height: 40 } } },
    { id: 'e2', name: 'Sub', type: 'text', fontFamily: 'Inter', fontSize: 14, fontWeight: 400, color: '#cccccc', role: 'subheadline', visible: true, locked: false, opacity: 1, zIndex: 3, constraints: { horizontal: { anchor: 'left', offset: 20 }, vertical: { anchor: 'top', offset: 70 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 260, height: 20 } } },
    { id: 'e3', name: 'BG', type: 'shape', fill: '#0a0e1a', borderRadius: 0, shapeType: 'rectangle', visible: true, locked: false, opacity: 1, zIndex: 0, constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 300, height: 250 } } },
    { id: 'e4', name: 'CTA', type: 'button', label: 'Buy', backgroundColor: '#ff6b35', color: '#ffffff', borderRadius: 8, visible: true, locked: false, opacity: 1, zIndex: 4, constraints: { horizontal: { anchor: 'left', offset: 90 }, vertical: { anchor: 'top', offset: 200 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 120, height: 40 } } },
];

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
    return {
        activeCreativeSetId: 'cs-1', activeVariantId: 'v-1',
        canvasW: 300, canvasH: 250, brandKit: null,
        designActions: {
            addElementToMaster: vi.fn(), updateMasterElement: vi.fn(),
            removeElementFromMaster: vi.fn(), addVariant: vi.fn(), removeVariant: vi.fn(),
            getCreativeSet: () => ({ variants: [{ id: 'v-1', elements: mockElements }] }),
        },
        editorActions: { setSelectedElementId: vi.fn(), getSelectedElementId: () => null },
        ...overrides,
    };
}

describe('analyzeTools', () => {
    describe('analyzeColors', () => {
        it('should detect unique colors', () => {
            const result = analyzeColors.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.palette.length).toBeGreaterThan(0);
        });

        it('should count color frequency', () => {
            const data = analyzeColors.execute({}, makeCtx()).data as any;
            const white = data.palette.find((p: any) => p.hex === '#ffffff');
            expect(white).toBeDefined();
            expect(white.count).toBeGreaterThanOrEqual(2); // Used in Headline + CTA
        });

        it('should compute contrast matrix', () => {
            const data = analyzeColors.execute({}, makeCtx()).data as any;
            expect(data.contrastMatrix).toBeDefined();
            expect(data.contrastMatrix.length).toBeGreaterThan(0);
            for (const pair of data.contrastMatrix) {
                expect(pair.ratio).toBeGreaterThan(0);
                expect(typeof pair.wcagAA).toBe('boolean');
            }
        });

        it('should mark high contrast pairs as WCAG AA', () => {
            const data = analyzeColors.execute({}, makeCtx()).data as any;
            const whiteOnDark = data.contrastMatrix.find(
                (p: any) => (p.color1 === '#ffffff' && p.color2 === '#0a0e1a') || (p.color1 === '#0a0e1a' && p.color2 === '#ffffff'),
            );
            if (whiteOnDark) expect(whiteOnDark.wcagAA).toBe(true);
        });
    });

    describe('analyzeTypography', () => {
        it('should count text elements and fonts', () => {
            const result = analyzeTypography.execute({}, makeCtx());
            expect(result.success).toBe(true);
            expect(result.message).toContain('2 text elements');
        });

        it('should report font consistency', () => {
            const data = analyzeTypography.execute({}, makeCtx()).data as any;
            expect(data.isConsistent).toBe(true); // Both use Inter
            expect(data.fonts['Inter']).toBe(2);
        });

        it('should compute hierarchy score', () => {
            const data = analyzeTypography.execute({}, makeCtx()).data as any;
            expect(data.hierarchyScore).toBe('good'); // 36px vs 14px = distinct
        });

        it('should sort by font size descending', () => {
            const data = analyzeTypography.execute({}, makeCtx()).data as any;
            expect(data.hierarchy[0].size).toBe(36);
            expect(data.hierarchy[1].size).toBe(14);
        });
    });

    describe('analyzeSpacing', () => {
        it('should calculate safe padding', () => {
            const result = analyzeSpacing.execute({}, makeCtx());
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.safePadding).toBeGreaterThanOrEqual(10);
        });

        it('should detect safe zone violations', () => {
            const data = analyzeSpacing.execute({}, makeCtx()).data as any;
            expect(Array.isArray(data.safeZoneViolations)).toBe(true);
        });

        it('should detect overlaps', () => {
            const data = analyzeSpacing.execute({}, makeCtx()).data as any;
            expect(Array.isArray(data.overlaps)).toBe(true);
        });
    });

    describe('analyzeBrandCompliance', () => {
        it('should fail when no brand kit', () => {
            const result = analyzeBrandCompliance.execute({}, makeCtx());
            expect(result.success).toBe(false);
        });

        it('should calculate compliance score', () => {
            const brandKit = {
                palette: { primary: '#ff6b35', secondary: '#0a0e1a', accent: '#ffffff', background: '#0a0e1a', text: '#ffffff', gradients: [] },
                typography: { heading: { family: 'Inter' }, body: { family: 'Inter' }, cta: { family: 'Inter' } },
                guidelines: { name: 'TestBrand', forbiddenColors: [] },
                assets: [],
            };
            const ctx = makeCtx({ brandKit: brandKit as any });
            const result = analyzeBrandCompliance.execute({}, ctx);
            expect(result.success).toBe(true);
            const data = result.data as any;
            expect(data.score).toBeGreaterThan(0);
            expect(data.score).toBeLessThanOrEqual(100);
        });

        it('should flag off-brand colors', () => {
            const brandKit = {
                palette: { primary: '#000000', secondary: '#111111', accent: '#222222', background: '#333333', text: '#444444', gradients: [] },
                typography: { heading: { family: 'Arial' }, body: { family: 'Arial' }, cta: { family: 'Arial' } },
                guidelines: { name: 'StrictBrand', forbiddenColors: [] },
                assets: [],
            };
            const ctx = makeCtx({ brandKit: brandKit as any });
            const data = analyzeBrandCompliance.execute({}, ctx).data as any;
            expect(data.issues.length).toBeGreaterThan(0);
        });

        it('should flag forbidden colors', () => {
            const brandKit = {
                palette: { primary: '#ffffff', secondary: '#0a0e1a', accent: '#ff6b35', background: '#000', text: '#fff', gradients: [] },
                typography: { heading: { family: 'Inter' }, body: { family: 'Inter' }, cta: { family: 'Inter' } },
                guidelines: { name: 'B', forbiddenColors: ['#0a0e1a'] },
                assets: [],
            };
            const ctx = makeCtx({ brandKit: brandKit as any });
            const data = analyzeBrandCompliance.execute({}, ctx).data as any;
            const forbidden = data.issues.find((i: any) => i.severity === 'error' && i.issue.includes('forbidden'));
            expect(forbidden).toBeDefined();
        });

        it('should flag missing logo', () => {
            const brandKit = {
                palette: { primary: '#fff', secondary: '#000', accent: '#ccc', background: '#000', text: '#fff', gradients: [] },
                typography: { heading: { family: 'Inter' }, body: { family: 'Inter' }, cta: { family: 'Inter' } },
                guidelines: { name: 'B', forbiddenColors: [] },
                assets: [{ id: 'logo', role: 'primary_logo', name: 'Logo' }],
            };
            const ctx = makeCtx({ brandKit: brandKit as any });
            const data = analyzeBrandCompliance.execute({}, ctx).data as any;
            const logoIssue = data.issues.find((i: any) => i.issue.includes('logo'));
            expect(logoIssue).toBeDefined();
        });
    });

    describe('analyzeTools array', () => {
        it('should export 4 tools', () => { expect(analyzeTools).toHaveLength(4); });
        it('should all be analyze category', () => {
            for (const t of analyzeTools) expect(t.category).toBe('analyze');
        });
    });
});
