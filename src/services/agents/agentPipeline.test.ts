// ─────────────────────────────────────────────────
// agentPipeline.test.ts — Critic & Pipeline Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { runStructuralCritic } from '@/services/agents/criticAgent';
import type { SceneGraph } from '@/services/sceneGraphBuilder';
import type { BrandKit } from '@/stores/brandKitStore';

// ── Helpers ──

function makeSceneGraph(elements: Partial<SceneGraph['elements'][0]>[]): SceneGraph {
    return {
        canvas: { width: 300, height: 250 },
        elements: elements.map((el, i) => ({
            id: `el-${i}`,
            name: el.name ?? `Element ${i}`,
            role: el.role ?? null,
            type: el.type ?? 'shape',
            bounds: el.bounds ?? { x: 0, y: 0, w: 100, h: 100 },
            style: el.style ?? { opacity: 1 },
            zIndex: i,
            visible: true,
            locked: false,
        })),
        relationships: [],
        tokens: { colors: [], fonts: [] },
    };
}

function makeSceneGraphWithRelationships(elements: SceneGraph['elements']): SceneGraph {
    // Compute relationships
    const relationships = elements.map(el => {
        const overlaps = elements
            .filter(other => other.id !== el.id)
            .filter(other =>
                el.bounds.x < other.bounds.x + other.bounds.w &&
                el.bounds.x + el.bounds.w > other.bounds.x &&
                el.bounds.y < other.bounds.y + other.bounds.h &&
                el.bounds.y + el.bounds.h > other.bounds.y)
            .map(o => o.name);

        return {
            elementId: el.id,
            elementName: el.name,
            overlaps,
            containedBy: null,
            distanceToEdge: {
                top: el.bounds.y,
                right: 300 - (el.bounds.x + el.bounds.w),
                bottom: 250 - (el.bounds.y + el.bounds.h),
                left: el.bounds.x,
            },
        };
    });

    return {
        canvas: { width: 300, height: 250 },
        elements,
        relationships,
        tokens: { colors: [], fonts: [] },
    };
}

// ── Structural Critic Tests ──

describe('criticAgent — runStructuralCritic', () => {
    it('returns score 100 for empty scene graph', () => {
        const sg = makeSceneGraph([]);
        const result = runStructuralCritic(sg, null);
        expect(result.score).toBe(100);
        expect(result.pass).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('detects elements clipping outside canvas', () => {
        const sg = makeSceneGraph([
            { name: 'Offscreen', bounds: { x: -10, y: 20, w: 100, h: 50 } },
        ]);
        const result = runStructuralCritic(sg, null);
        expect(result.issues.some(i => i.type === 'clipping')).toBe(true);
    });

    it('detects safe zone violations', () => {
        const sg = makeSceneGraph([
            { name: 'EdgeElement', bounds: { x: 2, y: 2, w: 50, h: 30 } },
        ]);
        const result = runStructuralCritic(sg, null);
        expect(result.issues.some(i => i.type === 'spacing')).toBe(true);
    });

    it('detects overlapping non-background elements', () => {
        const elements: SceneGraph['elements'] = [
            { id: 'e1', name: 'Box A', role: null, type: 'shape', bounds: { x: 50, y: 50, w: 100, h: 100 }, style: { opacity: 1 }, zIndex: 0, visible: true, locked: false },
            { id: 'e2', name: 'Box B', role: null, type: 'shape', bounds: { x: 100, y: 80, w: 100, h: 100 }, style: { opacity: 1 }, zIndex: 1, visible: true, locked: false },
        ];
        const sg = makeSceneGraphWithRelationships(elements);
        const result = runStructuralCritic(sg, null);
        expect(result.issues.some(i => i.type === 'overlap')).toBe(true);
    });

    it('does not flag overlap with background', () => {
        const elements: SceneGraph['elements'] = [
            { id: 'bg', name: 'Background', role: 'background', type: 'shape', bounds: { x: 0, y: 0, w: 300, h: 250 }, style: { opacity: 1, fill: '#000' }, zIndex: 0, visible: true, locked: false },
            { id: 'txt', name: 'Title', role: 'headline', type: 'text', bounds: { x: 30, y: 30, w: 200, h: 40 }, style: { opacity: 1, fontSize: 24 }, zIndex: 1, visible: true, locked: false },
        ];
        const sg = makeSceneGraphWithRelationships(elements);
        const result = runStructuralCritic(sg, null);
        // Should not have overlap issues (bg overlap is expected)
        const nonBgOverlaps = result.issues.filter(i => i.type === 'overlap' && i.element !== 'Background');
        expect(nonBgOverlaps).toHaveLength(0);
    });

    it('checks brand compliance when brand kit is provided', () => {
        const sg = makeSceneGraph([
            { name: 'Box', type: 'shape', bounds: { x: 30, y: 30, w: 100, h: 50 }, style: { opacity: 1, fill: '#ff0000' } },
        ]);
        const kit: BrandKit = {
            id: 'bk1', name: 'TestBrand',
            createdAt: '', updatedAt: '',
            assets: [],
            palette: { primary: '#0000ff', secondary: '#00ff00', accent: '#ffff00', background: '#000000', text: '#ffffff', gradients: [] },
            typography: { heading: { family: 'Inter', weights: [700], letterSpacing: 0 }, body: { family: 'Inter', weights: [400], letterSpacing: 0 }, cta: { family: 'Inter', weights: [600], transform: 'uppercase' } },
            guidelines: { name: 'TestBrand', industry: 'tech', voiceTone: 'Pro', tagline: '', ctaPhrases: [], forbiddenColors: [], forbiddenWords: [], logoPlacementRules: '' },
        };
        const result = runStructuralCritic(sg, kit);
        expect(result.issues.some(i => i.type === 'brand_violation')).toBe(true);
        expect(result.brandComplianceScore).toBeDefined();
    });

    it('detects missing required logo', () => {
        const sg = makeSceneGraph([
            { name: 'Title', type: 'text', bounds: { x: 30, y: 30, w: 200, h: 40 } },
        ]);
        const kit: BrandKit = {
            id: 'bk1', name: 'TestBrand',
            createdAt: '', updatedAt: '',
            assets: [{ id: 'a1', name: 'Logo', category: 'logo', tags: [], role: 'primary_logo', src: '', thumbSrc: '', width: 100, height: 50, format: 'png', sizeBytes: 0, hash: '', uploadedAt: '', usageCount: 0, isFavorite: false, deletedAt: null, metadata: { hasTransparency: true, dominantColors: [], suggestedPlacement: null } }],
            palette: { primary: '#ffffff', secondary: '#000000', accent: '#ff0000', background: '#000000', text: '#ffffff', gradients: [] },
            typography: { heading: { family: 'Inter', weights: [700], letterSpacing: 0 }, body: { family: 'Inter', weights: [400], letterSpacing: 0 }, cta: { family: 'Inter', weights: [600], transform: 'uppercase' } },
            guidelines: { name: 'TestBrand', industry: 'tech', voiceTone: 'Pro', tagline: '', ctaPhrases: [], forbiddenColors: [], forbiddenWords: [], logoPlacementRules: '' },
        };
        const result = runStructuralCritic(sg, kit);
        expect(result.issues.some(i => i.type === 'missing_logo')).toBe(true);
    });

    it('provides fix patches for clipping issues', () => {
        const sg = makeSceneGraph([
            { name: 'Offscreen', bounds: { x: -20, y: 10, w: 100, h: 50 } },
        ]);
        const result = runStructuralCritic(sg, null);
        const clippingFix = result.issues.find(i => i.type === 'clipping');
        expect(clippingFix?.fixTool).toBe('move_node');
        expect(clippingFix?.fixParams).toBeDefined();
    });

    it('passes designs with score >= 82', () => {
        const sg = makeSceneGraph([
            { name: 'BG', role: 'background', bounds: { x: 0, y: 0, w: 300, h: 250 } },
            { name: 'Title', role: 'headline', bounds: { x: 20, y: 30, w: 200, h: 40 }, style: { opacity: 1, fontSize: 28 } },
        ]);
        const result = runStructuralCritic(sg, null);
        expect(result.score).toBeGreaterThanOrEqual(82);
        expect(result.pass).toBe(true);
    });
});
