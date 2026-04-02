// ─────────────────────────────────────────────────
// bannerDesignPrompt.test.ts — Design system prompt builder
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    getLayoutBlueprint,
    buildDesignSystemPrompt,
    getAvailableBlueprintSizes,
} from './bannerDesignPrompt';

// ══════════════════════════════════════════════════
// getLayoutBlueprint
// ══════════════════════════════════════════════════

describe('getLayoutBlueprint', () => {
    it('returns blueprint for standard banner sizes', () => {
        const bp = getLayoutBlueprint(300, 250);
        expect(bp).not.toBeNull();
        expect(bp!.sizeLabel).toContain('300');
    });

    it('returns blueprint for 970×250', () => {
        const bp = getLayoutBlueprint(970, 250);
        expect(bp).not.toBeNull();
    });

    it('returns null for unknown sizes', () => {
        expect(getLayoutBlueprint(123, 456)).toBeNull();
    });

    it('matches 9:16 social ratio', () => {
        const bp = getLayoutBlueprint(1080, 1920);
        expect(bp).not.toBeNull();
    });

    it('matches 1:1 social ratio', () => {
        const bp = getLayoutBlueprint(1080, 1080);
        expect(bp).not.toBeNull();
    });

    it('blueprint has required fields', () => {
        const bp = getLayoutBlueprint(300, 250)!;
        expect(bp.sizeLabel).toBeDefined();
        expect(bp.description).toBeDefined();
        expect(bp.layout).toBeDefined();
        expect(bp.padding).toBeDefined();
        expect(bp.maxElements).toBeDefined();
        expect(bp.elementPositions).toBeDefined();
        expect(bp.typographyScale).toBeDefined();
    });
});

// ══════════════════════════════════════════════════
// buildDesignSystemPrompt
// ══════════════════════════════════════════════════

describe('buildDesignSystemPrompt', () => {
    it('includes Design System Guidelines header', () => {
        const prompt = buildDesignSystemPrompt(300, 250, 'landscape');
        expect(prompt).toContain('Design System Guidelines');
    });

    it('includes layout blueprint for known sizes', () => {
        const prompt = buildDesignSystemPrompt(300, 250, 'landscape');
        expect(prompt).toContain('Layout Blueprint');
    });

    it('includes fallback for unknown sizes', () => {
        const prompt = buildDesignSystemPrompt(123, 456, 'portrait');
        expect(prompt).toContain('123×456');
        expect(prompt).toContain('centered stack layout');
    });

    it('includes brand colors when provided', () => {
        const prompt = buildDesignSystemPrompt(300, 250, 'landscape', { primary: '#ff0000', secondary: '#00ff00' });
        expect(prompt).toContain('#ff0000');
        expect(prompt).toContain('#00ff00');
        expect(prompt).toContain('Brand Colors');
    });

    it('includes default dark palette without brand colors', () => {
        const prompt = buildDesignSystemPrompt(300, 250, 'landscape');
        expect(prompt).toContain('#0F172A');
    });

    it('includes golden rules and typography', () => {
        const prompt = buildDesignSystemPrompt(300, 250, 'landscape');
        expect(prompt).toContain('GOLDEN RULES');
        expect(prompt).toContain('TYPOGRAPHY');
        expect(prompt).toContain('COPYWRITING');
    });
});

// ══════════════════════════════════════════════════
// getAvailableBlueprintSizes
// ══════════════════════════════════════════════════

describe('getAvailableBlueprintSizes', () => {
    it('returns non-empty array', () => {
        const sizes = getAvailableBlueprintSizes();
        expect(sizes.length).toBeGreaterThan(0);
    });

    it('includes common banner sizes', () => {
        const sizes = getAvailableBlueprintSizes();
        // At least some standard sizes should be present
        expect(sizes.some(s => s.includes('300'))).toBe(true);
    });
});
