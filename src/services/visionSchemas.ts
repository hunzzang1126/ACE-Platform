// ─────────────────────────────────────────────────
// visionSchemas — Zod schemas for Vision API
// ─────────────────────────────────────────────────

import { z } from 'zod';

// ── Semantic roles matching Glid's Smart Sizing role system ──

export const VISION_ROLES = [
    'headline', 'subline', 'cta', 'logo', 'hero',
    'background', 'accent', 'detail', 'badge', 'tnc',
    'image', 'decoration', 'divider', 'unknown',
] as const;

export const ELEMENT_TYPES = [
    'text', 'shape', 'image', 'button', 'icon', 'group', 'unknown',
] as const;

// ── Detected element ──

export const DetectedElementSchema = z.object({
    name: z.string(),
    role: z.enum(VISION_ROLES),
    type: z.enum(ELEMENT_TYPES),
    bounds: z.object({
        xPct: z.number().min(0).max(100),
        yPct: z.number().min(0).max(100),
        wPct: z.number().min(0).max(100),
        hPct: z.number().min(0).max(100),
    }),
    style: z.object({
        primaryColor: z.string().optional(),
        fontSize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']).optional(),
        fontWeight: z.enum(['bold', 'semibold', 'normal', 'light']).optional(),
        textContent: z.string().optional(),
    }).optional(),
});

export type DetectedElement = z.infer<typeof DetectedElementSchema>;

// ── Design quality issue ──

export const VisionIssueSchema = z.object({
    type: z.enum([
        'overlap', 'clipping', 'contrast', 'hierarchy', 'spacing',
        'alignment', 'text_overflow', 'visual_balance', 'readability',
        'brand_mismatch', 'empty_space', 'crowding',
    ]),
    severity: z.enum(['error', 'warning', 'suggestion']),
    element: z.string().optional(),
    description: z.string(),
    suggestion: z.string().optional(),
});

export type VisionIssue = z.infer<typeof VisionIssueSchema>;

// ── Full design analysis response ──

export const DesignAnalysisSchema = z.object({
    qualityScore: z.number().min(0).max(100),
    layoutType: z.enum(['horizontal', 'vertical', 'centered', 'grid', 'asymmetric', 'full_bleed', 'split', 'unknown']),
    aspectCategory: z.enum(['ultra_wide', 'landscape', 'square', 'portrait', 'unknown']),
    colorPalette: z.object({
        background: z.string(),
        primary: z.string(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        textPrimary: z.string(),
    }),
    typography: z.object({
        headlineSize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']),
        bodySize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']),
        hasGoodHierarchy: z.boolean(),
        estimatedFontCount: z.number(),
    }),
    elements: z.array(DetectedElementSchema),
    issues: z.array(VisionIssueSchema),
    impression: z.enum(['premium', 'professional', 'adequate', 'amateur', 'broken']),
    summary: z.string(),
});

export type DesignAnalysis = z.infer<typeof DesignAnalysisSchema>;

// ── Reference comparison response ──

export const ReferenceComparisonSchema = z.object({
    similarityScore: z.number().min(0).max(100),
    matches: z.array(z.object({ aspect: z.string(), score: z.number().min(0).max(100) })),
    differences: z.array(z.object({
        aspect: z.string(),
        referenceValue: z.string(),
        currentValue: z.string(),
        importance: z.enum(['critical', 'major', 'minor']),
        suggestion: z.string(),
    })),
    referenceElements: z.array(DetectedElementSchema),
    feasibility: z.object({
        nativeElements: z.array(z.object({
            description: z.string(),
            tool: z.enum(['create_shape', 'create_text', 'create_button', 'create_image', 'set_animation']),
            confidence: z.number().min(0).max(100),
        })),
        requiresImageGen: z.array(z.object({
            description: z.string(),
            suggestedPrompt: z.string(),
            reason: z.string(),
        })),
    }),
});

export type ReferenceComparison = z.infer<typeof ReferenceComparisonSchema>;

// ── JSON parsing helpers ──

export function extractJsonFromResponse(response: unknown): string | null {
    const data = response as { content?: Array<{ type: string; text?: string }> };
    const rawText = data.content?.find(c => c.type === 'text')?.text ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
}

export function safeZodParse<T>(schema: z.ZodType<T>, raw: string, label: string): T | null {
    try {
        const parsed = JSON.parse(raw);
        const result = schema.safeParse(parsed);
        if (result.success) return result.data;
        console.warn(`[Vision] ${label} Zod validation issues:`, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
        return parsed as T;
    } catch (err) {
        console.error(`[Vision] ${label} JSON parse failed:`, err);
        return null;
    }
}
