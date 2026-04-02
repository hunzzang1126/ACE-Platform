// ─────────────────────────────────────────────────
// criticAgent.test.ts — Design critic agent tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'test-model',
}));

vi.mock('@/services/brandContextBuilder', () => ({
    buildBrandComplianceForCritic: vi.fn().mockReturnValue({
        allowedColors: ['#c9a84c', '#1a1a2e', '#ff6b35', '#0a0e1a', '#ffffff'],
        forbiddenColors: ['#ff0000'],
        requiredAssets: ['Main Logo'],
        fontFamilies: ['Inter', 'Montserrat'],
        logoPlacementRules: 'top-left',
    }),
}));

vi.mock('@/services/toolRegistry', () => ({
    executeTool: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));

import { runStructuralCritic, runVisionCritic } from './criticAgent';
import { callAnthropicApi } from '@/services/anthropicClient';
import type { SceneGraph } from '@/services/sceneGraphBuilder';

function makeScene(elements: any[], overrides?: Partial<SceneGraph>): SceneGraph {
    const nodes = elements.map((e, i) => ({
        id: `el-${i}`, name: e.name ?? `El-${i}`, role: e.role ?? null, type: e.type ?? 'shape',
        bounds: e.bounds ?? { x: 10, y: 10, w: 100, h: 50 },
        style: { opacity: 1, fill: e.fill, color: e.color, fontFamily: e.fontFamily, fontSize: e.fontSize },
        zIndex: i, visible: true, locked: false,
    }));
    return {
        canvas: { width: 300, height: 250 },
        elements: nodes,
        relationships: nodes.map(n => {
            const overlaps = elements
                .filter((_e: any, j: number) => j !== nodes.indexOf(n))
                .filter((e: any) => {
                    const ob = e.bounds ?? { x: 10, y: 10, w: 100, h: 50 };
                    return n.bounds.x < ob.x + ob.w && n.bounds.x + n.bounds.w > ob.x &&
                           n.bounds.y < ob.y + ob.h && n.bounds.y + n.bounds.h > ob.y;
                })
                .map((e: any, j: number) => e.name ?? `El-${j}`);
            return {
                elementId: n.id, elementName: n.name, overlaps,
                containedBy: null,
                distanceToEdge: { top: n.bounds.y, right: 300 - n.bounds.x - n.bounds.w, bottom: 250 - n.bounds.y - n.bounds.h, left: n.bounds.x },
            };
        }),
        tokens: { colors: [], fonts: [] },
        ...overrides,
    };
}

describe('criticAgent', () => {
    describe('runStructuralCritic', () => {
        it('should score clean design at 100', () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', fill: '#0a0e1a', bounds: { x: 0, y: 0, w: 300, h: 250 } },
                { name: 'Headline', role: 'headline', type: 'text', fontSize: 28, color: '#ffffff', fontFamily: 'Inter', bounds: { x: 20, y: 30, w: 260, h: 40 } },
            ]);
            const result = runStructuralCritic(scene, null);
            expect(result.score).toBeGreaterThanOrEqual(90);
        });

        it('should detect clipping elements', () => {
            const scene = makeScene([
                { name: 'Overflow', bounds: { x: -10, y: 20, w: 100, h: 50 } },
            ]);
            const result = runStructuralCritic(scene, null);
            const clipping = result.issues.find(i => i.type === 'clipping');
            expect(clipping).toBeDefined();
            expect(clipping!.severity).toBe('error');
        });

        it('should detect safe zone violations', () => {
            const scene = makeScene([
                { name: 'EdgeText', role: 'headline', bounds: { x: 2, y: 2, w: 100, h: 30 } },
            ]);
            const result = runStructuralCritic(scene, null);
            const spacing = result.issues.find(i => i.type === 'spacing');
            expect(spacing).toBeDefined();
        });

        it('should pass designs with score >= 82', () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', bounds: { x: 0, y: 0, w: 300, h: 250 } },
            ]);
            const result = runStructuralCritic(scene, null);
            expect(result.pass).toBe(true);
        });

        it('should include fix suggestions for fixable issues', () => {
            const scene = makeScene([
                { name: 'Clipped', bounds: { x: -20, y: 20, w: 100, h: 50 } },
            ]);
            const result = runStructuralCritic(scene, null);
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('runStructuralCritic with brand kit', () => {
        const brandKit = {} as any;

        it('should detect forbidden color usage', () => {
            const scene = makeScene([
                { name: 'BadShape', fill: '#ff0000', bounds: { x: 20, y: 20, w: 100, h: 50 } },
            ]);
            const result = runStructuralCritic(scene, brandKit);
            const violation = result.issues.find(i => i.type === 'brand_violation' && i.description?.includes('forbidden'));
            expect(violation).toBeDefined();
            expect(violation!.severity).toBe('error');
        });

        it('should detect missing logo', () => {
            const scene = makeScene([
                { name: 'Headline', role: 'headline', bounds: { x: 20, y: 20, w: 260, h: 40 } },
            ]);
            const result = runStructuralCritic(scene, brandKit);
            const missing = result.issues.find(i => i.type === 'missing_logo');
            expect(missing).toBeDefined();
        });

        it('should detect wrong font', () => {
            const scene = makeScene([
                { name: 'Text', type: 'text', fontFamily: 'Arial', fontSize: 16, bounds: { x: 20, y: 20, w: 260, h: 30 } },
            ]);
            const result = runStructuralCritic(scene, brandKit);
            const mismatch = result.issues.find(i => i.type === 'font_mismatch');
            expect(mismatch).toBeDefined();
        });

        it('should calculate brand compliance score', () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', fill: '#0a0e1a', bounds: { x: 0, y: 0, w: 300, h: 250 } },
            ]);
            const result = runStructuralCritic(scene, brandKit);
            expect(result.brandComplianceScore).toBeDefined();
            expect(typeof result.brandComplianceScore).toBe('number');
        });
    });

    describe('runVisionCritic', () => {
        it('should skip API call when structural score is high', async () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', fill: '#0a0e1a', bounds: { x: 0, y: 0, w: 300, h: 250 } },
            ]);
            const result = await runVisionCritic('data:image/png;base64,abc', scene, null, new AbortController().signal);
            expect(callAnthropicApi).not.toHaveBeenCalled();
            expect(result.score).toBeGreaterThanOrEqual(95);
        });

        it('should merge vision issues with structural', async () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', bounds: { x: 0, y: 0, w: 300, h: 250 } },
                { name: 'X', bounds: { x: -5, y: 20, w: 50, h: 30 } },
            ]);
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: '{"additionalScore":-5,"additionalIssues":[{"type":"contrast","severity":"warning","element":"X","description":"Low contrast"}]}' }],
            });
            const result = await runVisionCritic('base64data', scene, null, new AbortController().signal);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        it('should fall back to structural on vision API failure', async () => {
            const scene = makeScene([
                { name: 'BG', role: 'background', bounds: { x: 0, y: 0, w: 300, h: 250 } },
                { name: 'X', bounds: { x: -5, y: 20, w: 50, h: 30 } },
            ]);
            vi.mocked(callAnthropicApi).mockRejectedValue(new Error('API error'));
            const result = await runVisionCritic('base64data', scene, null, new AbortController().signal);
            expect(result).toBeDefined();
            expect(result.score).toBeDefined();
        });
    });
});
