// ─────────────────────────────────────────────────────────────
// visionService.test.ts — Tests for Vision Service
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    DetectedElementSchema,
    VisionIssueSchema,
    DesignAnalysisSchema,
    ReferenceComparisonSchema,
} from '@/services/visionService';

describe('visionService — Zod schemas', () => {
    // ── DetectedElement ──

    it('validates a valid detected element', () => {
        const el = {
            name: 'Main Headline',
            role: 'headline',
            type: 'text',
            bounds: { xPct: 10, yPct: 5, wPct: 80, hPct: 15 },
            style: {
                primaryColor: '#ffffff',
                fontSize: 'xl',
                fontWeight: 'bold',
                textContent: 'SUMMER SALE',
            },
        };
        const result = DetectedElementSchema.safeParse(el);
        expect(result.success).toBe(true);
    });

    it('rejects element with bounds out of range', () => {
        const el = {
            name: 'test',
            role: 'headline',
            type: 'text',
            bounds: { xPct: -5, yPct: 0, wPct: 110, hPct: 50 },
        };
        const result = DetectedElementSchema.safeParse(el);
        expect(result.success).toBe(false);
    });

    it('validates element without optional style', () => {
        const el = {
            name: 'Background',
            role: 'background',
            type: 'shape',
            bounds: { xPct: 0, yPct: 0, wPct: 100, hPct: 100 },
        };
        const result = DetectedElementSchema.safeParse(el);
        expect(result.success).toBe(true);
    });

    it('rejects element with invalid role', () => {
        const el = {
            name: 'test',
            role: 'not_a_role',
            type: 'text',
            bounds: { xPct: 0, yPct: 0, wPct: 50, hPct: 50 },
        };
        const result = DetectedElementSchema.safeParse(el);
        expect(result.success).toBe(false);
    });

    it('validates all vision roles', () => {
        const roles = [
            'headline', 'subline', 'cta', 'logo', 'hero',
            'background', 'accent', 'detail', 'badge', 'tnc',
            'image', 'decoration', 'divider', 'unknown',
        ];
        for (const role of roles) {
            const el = {
                name: role, role, type: 'shape',
                bounds: { xPct: 0, yPct: 0, wPct: 50, hPct: 50 },
            };
            expect(DetectedElementSchema.safeParse(el).success).toBe(true);
        }
    });

    // ── VisionIssue ──

    it('validates a valid vision issue', () => {
        const issue = {
            type: 'contrast',
            severity: 'warning',
            element: 'Headline',
            description: 'Low contrast ratio',
            suggestion: 'Use darker background',
        };
        const result = VisionIssueSchema.safeParse(issue);
        expect(result.success).toBe(true);
    });

    it('validates issue without optional fields', () => {
        const issue = {
            type: 'spacing',
            severity: 'error',
            description: 'Elements too close to edge',
        };
        const result = VisionIssueSchema.safeParse(issue);
        expect(result.success).toBe(true);
    });

    it('validates suggestion severity', () => {
        const issue = {
            type: 'visual_balance',
            severity: 'suggestion',
            description: 'Consider centering the CTA',
        };
        expect(VisionIssueSchema.safeParse(issue).success).toBe(true);
    });

    // ── DesignAnalysis ──

    it('validates a complete design analysis', () => {
        const analysis = {
            qualityScore: 87,
            layoutType: 'centered',
            aspectCategory: 'landscape',
            colorPalette: {
                background: '#0a0e1a',
                primary: '#ff6b35',
                secondary: '#1a2e4a',
                accent: '#ffd700',
                textPrimary: '#ffffff',
            },
            typography: {
                headlineSize: 'xl',
                bodySize: 'sm',
                hasGoodHierarchy: true,
                estimatedFontCount: 2,
            },
            elements: [{
                name: 'Background',
                role: 'background',
                type: 'shape',
                bounds: { xPct: 0, yPct: 0, wPct: 100, hPct: 100 },
            }],
            issues: [],
            impression: 'professional',
            summary: 'Well-designed banner with clear hierarchy.',
        };
        const result = DesignAnalysisSchema.safeParse(analysis);
        expect(result.success).toBe(true);
    });

    it('rejects quality score out of range', () => {
        const analysis = {
            qualityScore: 150,
            layoutType: 'centered',
            aspectCategory: 'landscape',
            colorPalette: { background: '#000', primary: '#fff', textPrimary: '#fff' },
            typography: { headlineSize: 'xl', bodySize: 'sm', hasGoodHierarchy: true, estimatedFontCount: 1 },
            elements: [],
            issues: [],
            impression: 'professional',
            summary: 'test',
        };
        expect(DesignAnalysisSchema.safeParse(analysis).success).toBe(false);
    });

    it('validates analysis with optional color palette fields', () => {
        const analysis = {
            qualityScore: 70,
            layoutType: 'horizontal',
            aspectCategory: 'ultra_wide',
            colorPalette: {
                background: '#000000',
                primary: '#ffffff',
                textPrimary: '#ffffff',
                // secondary and accent omitted
            },
            typography: {
                headlineSize: 'lg',
                bodySize: 'md',
                hasGoodHierarchy: false,
                estimatedFontCount: 3,
            },
            elements: [],
            issues: [{
                type: 'hierarchy',
                severity: 'warning',
                description: 'No clear headline',
            }],
            impression: 'adequate',
            summary: 'Needs improvement.',
        };
        expect(DesignAnalysisSchema.safeParse(analysis).success).toBe(true);
    });

    // ── ReferenceComparison ──

    it('validates a reference comparison result', () => {
        const comparison = {
            similarityScore: 72,
            matches: [
                { aspect: 'Layout structure', score: 85 },
                { aspect: 'Color palette', score: 60 },
            ],
            differences: [{
                aspect: 'Typography',
                referenceValue: 'Bold serif headline',
                currentValue: 'Regular sans-serif',
                importance: 'major',
                suggestion: 'Switch to serif font with bold weight',
            }],
            referenceElements: [{
                name: 'Hero Headline',
                role: 'headline',
                type: 'text',
                bounds: { xPct: 5, yPct: 10, wPct: 60, hPct: 20 },
            }],
            feasibility: {
                nativeElements: [{
                    description: 'Dark gradient background',
                    tool: 'create_shape',
                    confidence: 95,
                }],
                requiresImageGen: [{
                    description: 'Product photograph',
                    suggestedPrompt: 'Luxury watch on dark background, studio lighting',
                    reason: 'Complex photograph cannot be created with shapes',
                }],
            },
        };
        const result = ReferenceComparisonSchema.safeParse(comparison);
        expect(result.success).toBe(true);
    });

    it('validates comparison with empty arrays', () => {
        const comparison = {
            similarityScore: 0,
            matches: [],
            differences: [],
            referenceElements: [],
            feasibility: {
                nativeElements: [],
                requiresImageGen: [],
            },
        };
        expect(ReferenceComparisonSchema.safeParse(comparison).success).toBe(true);
    });

    it('rejects comparison with invalid tool name', () => {
        const comparison = {
            similarityScore: 50,
            matches: [],
            differences: [],
            referenceElements: [],
            feasibility: {
                nativeElements: [{
                    description: 'test',
                    tool: 'invalid_tool',
                    confidence: 80,
                }],
                requiresImageGen: [],
            },
        };
        expect(ReferenceComparisonSchema.safeParse(comparison).success).toBe(false);
    });
});
