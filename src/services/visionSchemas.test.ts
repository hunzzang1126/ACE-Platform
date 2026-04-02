// ─────────────────────────────────────────────────
// visionSchemas.test.ts — Zod schema validation tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    DetectedElementSchema, VisionIssueSchema, DesignAnalysisSchema,
    ReferenceComparisonSchema, extractJsonFromResponse, safeZodParse,
    VISION_ROLES, ELEMENT_TYPES,
} from './visionSchemas';

describe('visionSchemas', () => {
    describe('constants', () => {
        it('should have expected vision roles', () => {
            expect(VISION_ROLES).toContain('headline');
            expect(VISION_ROLES).toContain('background');
            expect(VISION_ROLES).toContain('cta');
            expect(VISION_ROLES.length).toBeGreaterThanOrEqual(10);
        });

        it('should have expected element types', () => {
            expect(ELEMENT_TYPES).toContain('text');
            expect(ELEMENT_TYPES).toContain('shape');
            expect(ELEMENT_TYPES).toContain('image');
        });
    });

    describe('DetectedElementSchema', () => {
        it('should validate correct element', () => {
            const el = { name: 'Title', role: 'headline', type: 'text', bounds: { xPct: 10, yPct: 5, wPct: 80, hPct: 20 } };
            expect(DetectedElementSchema.safeParse(el).success).toBe(true);
        });

        it('should reject invalid role', () => {
            const el = { name: 'X', role: 'INVALID', type: 'text', bounds: { xPct: 0, yPct: 0, wPct: 50, hPct: 50 } };
            expect(DetectedElementSchema.safeParse(el).success).toBe(false);
        });

        it('should reject out-of-range bounds', () => {
            const el = { name: 'X', role: 'headline', type: 'text', bounds: { xPct: -10, yPct: 0, wPct: 200, hPct: 50 } };
            expect(DetectedElementSchema.safeParse(el).success).toBe(false);
        });

        it('should accept optional style', () => {
            const el = {
                name: 'Title', role: 'headline', type: 'text',
                bounds: { xPct: 10, yPct: 5, wPct: 80, hPct: 20 },
                style: { primaryColor: '#ff0000', fontSize: 'lg', fontWeight: 'bold', textContent: 'Hello' },
            };
            expect(DetectedElementSchema.safeParse(el).success).toBe(true);
        });
    });

    describe('VisionIssueSchema', () => {
        it('should validate correct issue', () => {
            const issue = { type: 'overlap', severity: 'warning', element: 'title', description: 'Overlaps CTA' };
            expect(VisionIssueSchema.safeParse(issue).success).toBe(true);
        });

        it('should reject invalid severity', () => {
            const issue = { type: 'overlap', severity: 'critical', description: 'test' };
            expect(VisionIssueSchema.safeParse(issue).success).toBe(false);
        });
    });

    describe('DesignAnalysisSchema', () => {
        const valid = {
            qualityScore: 85,
            layoutType: 'centered',
            aspectCategory: 'landscape',
            colorPalette: { background: '#000', primary: '#fff', textPrimary: '#ccc' },
            typography: { headlineSize: 'lg', bodySize: 'sm', hasGoodHierarchy: true, estimatedFontCount: 2 },
            elements: [],
            issues: [],
            impression: 'premium',
            summary: 'Good design',
        };

        it('should validate correct analysis', () => {
            expect(DesignAnalysisSchema.safeParse(valid).success).toBe(true);
        });

        it('should reject score > 100', () => {
            expect(DesignAnalysisSchema.safeParse({ ...valid, qualityScore: 150 }).success).toBe(false);
        });

        it('should reject score < 0', () => {
            expect(DesignAnalysisSchema.safeParse({ ...valid, qualityScore: -5 }).success).toBe(false);
        });
    });

    describe('extractJsonFromResponse', () => {
        it('should extract JSON from API response', () => {
            const resp = { content: [{ type: 'text', text: 'Here is the result: {"score": 85}' }] };
            expect(extractJsonFromResponse(resp)).toBe('{"score": 85}');
        });

        it('should return null for non-JSON', () => {
            const resp = { content: [{ type: 'text', text: 'No JSON here' }] };
            expect(extractJsonFromResponse(resp)).toBeNull();
        });

        it('should return null for empty response', () => {
            expect(extractJsonFromResponse({})).toBeNull();
        });
    });

    describe('safeZodParse', () => {
        const schema = VisionIssueSchema;

        it('should parse valid JSON with schema', () => {
            const raw = '{"type":"overlap","severity":"warning","description":"test"}';
            const result = safeZodParse(schema, raw, 'test');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('overlap');
        });

        it('should return parsed object even with validation issues', () => {
            const raw = '{"type":"unknown_type","severity":"warning","description":"test"}';
            const result = safeZodParse(schema, raw, 'test');
            // Returns parsed as fallback even if validation fails
            expect(result).not.toBeNull();
        });

        it('should return null for invalid JSON', () => {
            const result = safeZodParse(schema, 'not json{{{', 'test');
            expect(result).toBeNull();
        });
    });
});
