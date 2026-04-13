// ─────────────────────────────────────────────────
// design.types — Schema structure validation tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type {
    BannerPreset, BannerVariant, CreativeSet, CreativeSetSummary,
    Folder, BrandConfig, Project, LocaleData, SizingMode,
} from './design.types';

describe('design.types — BannerPreset', () => {
    it('satisfies BannerPreset shape', () => {
        const preset: BannerPreset = {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        };
        expect(preset.width).toBe(300);
        expect(preset.category).toBe('display');
    });

    it('supports all categories', () => {
        const categories: BannerPreset['category'][] = ['display', 'social', 'video', 'custom'];
        expect(categories).toHaveLength(4);
    });
});

describe('design.types — BannerVariant', () => {
    it('satisfies BannerVariant shape with all fields', () => {
        const variant: BannerVariant = {
            id: 'v1',
            preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'display' },
            elements: [],
            backgroundColor: '#ffffff',
            overriddenElementIds: [],
            syncLocked: false,
        };
        expect(variant.backgroundColor).toBe('#ffffff');
        expect(variant.syncLocked).toBe(false);
    });

    it('supports optional fields', () => {
        const variant: BannerVariant = {
            id: 'v2',
            preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'display' },
            elements: [],
            backgroundColor: '#000',
            overriddenElementIds: ['el-1'],
            syncLocked: true,
            screenshotUrl: 'data:image/png;base64,...',
            fabricJSON: '{"objects":[]}',
            backgroundImage: 'https://example.com/bg.jpg',
        };
        expect(variant.screenshotUrl).toBeTruthy();
        expect(variant.fabricJSON).toBeTruthy();
        expect(variant.backgroundImage).toBeTruthy();
    });
});

describe('design.types — CreativeSet', () => {
    it('satisfies CreativeSet shape', () => {
        const cs: CreativeSet = {
            id: 'cs1',
            name: 'Test Campaign',
            masterVariantId: 'v1',
            variants: [],
            plugConnections: {},
            brand: { primaryColor: '#2DD4BF', secondaryColor: '#6366F1', fontFamily: 'Inter' },
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
        };
        expect(cs.plugConnections).toEqual({});
        expect(cs.brand.fontFamily).toBe('Inter');
    });

    it('plugConnections maps target→origin', () => {
        const cs: CreativeSet = {
            id: 'cs1', name: 'Test', masterVariantId: 'v1', variants: [],
            plugConnections: { 'v2': 'v1', 'v3': 'v1' },
            brand: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Inter' },
            createdAt: '', updatedAt: '',
        };
        expect(Object.keys(cs.plugConnections)).toHaveLength(2);
        expect(cs.plugConnections['v2']).toBe('v1');
    });

    it('supports optional fields', () => {
        const cs: CreativeSet = {
            id: 'cs1', name: 'X', masterVariantId: 'v1', variants: [],
            plugConnections: {},
            brand: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Inter' },
            createdAt: '', updatedAt: '',
            description: 'desc',
            folderId: 'f1',
            createdBy: 'user1',
            masterLabel: 'v1',
            cardPositions: { 'v1': { x: 10, y: 20 } },
            sizingMode: 'edge-pin',
        };
        expect(cs.sizingMode).toBe('edge-pin');
        expect(cs.cardPositions!['v1']).toEqual({ x: 10, y: 20 });
    });
});

describe('design.types — SizingMode', () => {
    it('accepts uniform and edge-pin', () => {
        const modes: SizingMode[] = ['uniform', 'edge-pin'];
        expect(modes).toContain('uniform');
        expect(modes).toContain('edge-pin');
    });
});

describe('design.types — LocaleData', () => {
    it('satisfies LocaleData shape', () => {
        const ld: LocaleData = {
            locales: { en: { headline: 'Hello' }, ko: { headline: '안녕' } },
            activeLocale: 'en',
            originalLocale: 'en',
        };
        expect(Object.keys(ld.locales)).toHaveLength(2);
        expect(ld.locales['ko']!['headline']).toBe('안녕');
    });
});

describe('design.types — CreativeSetSummary', () => {
    it('satisfies summary shape', () => {
        const s: CreativeSetSummary = {
            id: 's1', name: 'Test', variantCount: 3,
            createdAt: '', updatedAt: '', createdBy: 'user1',
        };
        expect(s.variantCount).toBe(3);
    });
});

describe('design.types — Folder', () => {
    it('satisfies folder shape', () => {
        const f: Folder = { id: 'f1', name: 'My Folder', createdAt: '', updatedAt: '' };
        expect(f.name).toBe('My Folder');
    });

    it('supports parentId', () => {
        const f: Folder = { id: 'f2', name: 'Sub', parentId: 'f1', createdAt: '', updatedAt: '' };
        expect(f.parentId).toBe('f1');
    });
});

describe('design.types — BrandConfig', () => {
    it('satisfies brand config shape', () => {
        const b: BrandConfig = { primaryColor: '#2DD4BF', secondaryColor: '#6366F1', fontFamily: 'Inter' };
        expect(b.primaryColor).toBe('#2DD4BF');
    });

    it('supports optional generatedPalette', () => {
        const b: BrandConfig = {
            primaryColor: '#2DD4BF', secondaryColor: '#6366F1', fontFamily: 'Inter',
            accentColor: '#c084fc', logoUrl: 'https://example.com/logo.svg',
            generatedPalette: {
                primary: '#2DD4BF', secondary: '#6366F1', accent: '#c084fc',
                background: '#0B0F1A', text: '#F1F5F9', surface: '#1e1e2e',
            },
        };
        expect(b.generatedPalette!.primary).toBe('#2DD4BF');
        expect(b.logoUrl).toBeTruthy();
    });
});

describe('design.types — Project', () => {
    it('satisfies project shape', () => {
        const p: Project = {
            id: 'p1', name: 'My Project', creativeSets: [],
            createdAt: '', updatedAt: '',
        };
        expect(p.creativeSets).toHaveLength(0);
    });
});
