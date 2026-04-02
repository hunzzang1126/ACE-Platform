// ─────────────────────────────────────────────────
// smartSizingTypes.test.ts — Size classification & role detection
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    classifyRatio,
    detectElementRole,
    classifyMasterGroup,
    groupSizesByMaster,
    getMasterGroupDescriptions,
    getMasterGroupFontBoost,
    LAYOUT_ZONES,
    type SizeCategory,
    type MasterGroup,
} from './smartSizingTypes';

// ══════════════════════════════════════════════════
// classifyRatio
// ══════════════════════════════════════════════════

describe('classifyRatio', () => {
    const cases: [number, number, SizeCategory][] = [
        [970, 90, 'ultra-wide'],   // 10.78
        [728, 90, 'ultra-wide'],   // 8.09
        [970, 250, 'wide'],        // 3.88
        [300, 250, 'square'],      // 1.2 — boundary: >1.2 needed for landscape
        [1080, 1080, 'square'],    // 1.0
        [300, 600, 'ultra-tall'],  // 0.5 — boundary: >0.5 needed for portrait
        [160, 600, 'ultra-tall'],  // 0.27
        [1080, 1920, 'portrait'],  // 0.5625
    ];
    for (const [w, h, expected] of cases) {
        it(`${w}x${h} → ${expected}`, () => {
            expect(classifyRatio(w, h)).toBe(expected);
        });
    }
});

// ══════════════════════════════════════════════════
// detectElementRole — name-based detection
// ══════════════════════════════════════════════════

describe('detectElementRole — name patterns', () => {
    const makeEl = (name: string, type: string, extra: any = {}) => ({
        name, type, constraints: { anchorX: 'left' as const, anchorY: 'top' as const, offsetX: 0, offsetY: 0, width: 100, height: 50, widthUnit: 'px' as const, heightUnit: 'px' as const, rotation: 0 },
        ...extra,
    });

    it('detects background by name', () => {
        expect(detectElementRole(makeEl('Background Layer', 'shape') as any, 300, 250)).toBe('background');
        expect(detectElementRole(makeEl('BG Fill', 'shape') as any, 300, 250)).toBe('background');
    });

    it('detects CTA by name', () => {
        expect(detectElementRole(makeEl('CTA Button', 'shape') as any, 300, 250)).toBe('cta');
        expect(detectElementRole(makeEl('Shop Now', 'text') as any, 300, 250)).toBe('cta');
        expect(detectElementRole(makeEl('Buy Button', 'shape') as any, 300, 250)).toBe('cta');
    });

    it('detects logo by name', () => {
        expect(detectElementRole(makeEl('Logo', 'image') as any, 300, 250)).toBe('logo');
        expect(detectElementRole(makeEl('Brand Mark', 'image') as any, 300, 250)).toBe('logo');
    });

    it('detects headline by name', () => {
        expect(detectElementRole(makeEl('Headline Text', 'text') as any, 300, 250)).toBe('headline');
        expect(detectElementRole(makeEl('Main Title', 'text') as any, 300, 250)).toBe('headline');
    });

    it('detects subtext by name', () => {
        expect(detectElementRole(makeEl('Subtitle', 'text') as any, 300, 250)).toBe('subtext');
        expect(detectElementRole(makeEl('Description', 'text') as any, 300, 250)).toBe('subtext');
    });

    it('button type defaults to cta', () => {
        expect(detectElementRole(makeEl('Random', 'button') as any, 300, 250)).toBe('cta');
    });

    it('large text → headline, small text → subtext', () => {
        expect(detectElementRole(makeEl('some text', 'text', { fontSize: 32 }) as any, 300, 250)).toBe('headline');
        expect(detectElementRole(makeEl('some text', 'text', { fontSize: 14 }) as any, 300, 250)).toBe('subtext');
    });
});

// ══════════════════════════════════════════════════
// LAYOUT_ZONES
// ══════════════════════════════════════════════════

describe('LAYOUT_ZONES', () => {
    const categories: SizeCategory[] = ['ultra-wide', 'wide', 'landscape', 'square', 'portrait', 'ultra-tall'];
    for (const cat of categories) {
        it(`${cat} has all 7 roles`, () => {
            const zones = LAYOUT_ZONES[cat];
            expect(zones.background).toBeDefined();
            expect(zones.headline).toBeDefined();
            expect(zones.subtext).toBeDefined();
            expect(zones.cta).toBeDefined();
            expect(zones.logo).toBeDefined();
            expect(zones.image).toBeDefined();
            expect(zones.decoration).toBeDefined();
        });

        it(`${cat} background covers full canvas`, () => {
            const bg = LAYOUT_ZONES[cat].background;
            expect(bg.x).toBe(0);
            expect(bg.y).toBe(0);
            expect(bg.w).toBe(1);
            expect(bg.h).toBe(1);
        });
    }
});

// ══════════════════════════════════════════════════
// classifyMasterGroup
// ══════════════════════════════════════════════════

describe('classifyMasterGroup', () => {
    it('300x250 (1.2) → landscape', () => expect(classifyMasterGroup(300, 250)).toBe('landscape'));
    it('1080x1080 (1.0) → landscape', () => expect(classifyMasterGroup(1080, 1080)).toBe('landscape'));
    it('300x400 (0.75) → square', () => expect(classifyMasterGroup(300, 400)).toBe('square'));
    it('160x600 (0.27) → portrait', () => expect(classifyMasterGroup(160, 600)).toBe('portrait'));
});

// ══════════════════════════════════════════════════
// groupSizesByMaster
// ══════════════════════════════════════════════════

describe('groupSizesByMaster', () => {
    it('groups sizes by master category', () => {
        const sizes = [
            { w: 300, h: 250, id: 's1' },
            { w: 160, h: 600, id: 's2' },
            { w: 1080, h: 1080, id: 's3' },
        ];
        const groups = groupSizesByMaster(sizes);
        expect(groups.landscape.length).toBe(2); // 300x250, 1080x1080
        expect(groups.portrait.length).toBe(1); // 160x600
    });

    it('returns empty arrays for unused groups', () => {
        const groups = groupSizesByMaster([{ w: 300, h: 250, id: 's1' }]);
        expect(groups.portrait).toEqual([]);
    });
});

// ══════════════════════════════════════════════════
// getMasterGroupDescriptions / getMasterGroupFontBoost
// ══════════════════════════════════════════════════

describe('getMasterGroupDescriptions', () => {
    it('returns all 3 groups', () => {
        const d = getMasterGroupDescriptions();
        expect(d.landscape).toContain('LANDSCAPE');
        expect(d.square).toContain('SQUARE');
        expect(d.portrait).toContain('PORTRAIT');
    });
});

describe('getMasterGroupFontBoost', () => {
    it('landscape = 0.85, square = 1.0, portrait = 1.15', () => {
        expect(getMasterGroupFontBoost('landscape')).toBe(0.85);
        expect(getMasterGroupFontBoost('square')).toBe(1.0);
        expect(getMasterGroupFontBoost('portrait')).toBe(1.15);
    });
});
