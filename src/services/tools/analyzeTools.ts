// ─────────────────────────────────────────────────
// analyzeTools.ts — Design Token Analysis
// ─────────────────────────────────────────────────
// AI analyzes colors, typography, spacing, and brand
// compliance of the current design.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext } from './toolTypes';
import type { CreativeSet, DesignElement } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';

// ── Helpers ──

function getElements(ctx: ToolContext): DesignElement[] {
    const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
    if (!cs || !ctx.activeVariantId) return [];
    const v = cs.variants.find(v => v.id === ctx.activeVariantId);
    return v?.elements ?? [];
}

function hexToRgb(hex: string): [number, number, number] | null {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return null;
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function luminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return 0;
    const l1 = luminance(...rgb1);
    const l2 = luminance(...rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// ── Tools ──

export const analyzeColors: AceTool = {
    name: 'analyze_colors',
    category: 'analyze',
    description: 'Analyze all colors used in the design: frequency, contrast ratios, and WCAG compliance.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const elements = getElements(ctx);
        const colorMap = new Map<string, { count: number; elements: string[] }>();

        for (const el of elements) {
            const colors: string[] = [];
            if (el.type === 'shape') colors.push(el.fill);
            if (el.type === 'text') colors.push(el.color);
            if (el.type === 'button') { colors.push(el.backgroundColor); colors.push(el.color); }

            for (const c of colors) {
                if (!c) continue;
                const entry = colorMap.get(c) ?? { count: 0, elements: [] };
                entry.count++;
                entry.elements.push(el.name);
                colorMap.set(c, entry);
            }
        }

        const palette = [...colorMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([hex, info]) => ({ hex, count: info.count, elements: info.elements }));

        // Compute contrast matrix for top colors
        const topColors = palette.slice(0, 6).map(p => p.hex);
        const contrastMatrix: { color1: string; color2: string; ratio: number; wcagAA: boolean }[] = [];
        for (let i = 0; i < topColors.length; i++) {
            for (let j = i + 1; j < topColors.length; j++) {
                const ratio = contrastRatio(topColors[i], topColors[j]);
                contrastMatrix.push({
                    color1: topColors[i], color2: topColors[j],
                    ratio: Math.round(ratio * 100) / 100,
                    wcagAA: ratio >= 4.5,
                });
            }
        }

        return {
            success: true,
            message: `Found ${palette.length} unique colors`,
            data: { palette, contrastMatrix, totalElements: elements.length },
        };
    },
};

export const analyzeTypography: AceTool = {
    name: 'analyze_typography',
    category: 'analyze',
    description: 'Analyze typography consistency: fonts, sizes, weights, and hierarchy.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const elements = getElements(ctx);
        const textEls = elements.filter(e => e.type === 'text') as Array<{ name: string; fontFamily: string; fontSize: number; fontWeight: number; role?: string }>;

        const fontFamilies = new Map<string, number>();
        const fontSizes: { name: string; size: number; weight: number; role: string }[] = [];

        for (const el of textEls) {
            fontFamilies.set(el.fontFamily, (fontFamilies.get(el.fontFamily) ?? 0) + 1);
            fontSizes.push({ name: el.name, size: el.fontSize, weight: el.fontWeight, role: el.role ?? 'unknown' });
        }

        // Check hierarchy (sizes should be distinct for different roles)
        fontSizes.sort((a, b) => b.size - a.size);
        const uniqueSizes = new Set(fontSizes.map(f => f.size));
        const hierarchyScore = uniqueSizes.size >= Math.min(textEls.length, 3) ? 'good' : 'poor';

        return {
            success: true,
            message: `${textEls.length} text elements, ${fontFamilies.size} font families`,
            data: {
                fonts: Object.fromEntries(fontFamilies),
                hierarchy: fontSizes,
                hierarchyScore,
                isConsistent: fontFamilies.size <= 2,
            },
        };
    },
};

export const analyzeSpacing: AceTool = {
    name: 'analyze_spacing',
    category: 'analyze',
    description: 'Analyze spacing between elements: gaps, alignment, safe zone violations.',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        const elements = getElements(ctx);
        const pad = Math.max(10, Math.round(Math.min(ctx.canvasW, ctx.canvasH) * 0.05));

        const bounds = elements.map(el => {
            const b = resolveConstraints(el.constraints, ctx.canvasW, ctx.canvasH);
            return { name: el.name, ...b };
        });

        // Check safe zone violations
        const violations = bounds.filter(b =>
            b.x < pad || b.y < pad ||
            b.x + b.width > ctx.canvasW - pad ||
            b.y + b.height > ctx.canvasH - pad,
        ).map(b => b.name);

        // Check overlaps
        const overlaps: { el1: string; el2: string }[] = [];
        for (let i = 0; i < bounds.length; i++) {
            for (let j = i + 1; j < bounds.length; j++) {
                const a = bounds[i], b = bounds[j];
                if (a.x < b.x + b.width && a.x + a.width > b.x &&
                    a.y < b.y + b.height && a.y + a.height > b.y) {
                    overlaps.push({ el1: a.name, el2: b.name });
                }
            }
        }

        return {
            success: true,
            message: `${violations.length} safe zone violations, ${overlaps.length} overlaps`,
            data: { safePadding: pad, safeZoneViolations: violations, overlaps, elementCount: elements.length },
        };
    },
};

export const analyzeBrandCompliance: AceTool = {
    name: 'analyze_brand_compliance',
    category: 'analyze',
    description: 'Check if the current design complies with the active brand kit (colors, fonts, required assets).',
    inputSchema: { type: 'object', properties: {} },
    execute: (_, ctx) => {
        if (!ctx.brandKit) return { success: false, message: 'No active brand kit' };

        const elements = getElements(ctx);
        const kit = ctx.brandKit;
        const issues: { element: string; issue: string; severity: 'error' | 'warning' }[] = [];

        const allowedColors = [
            kit.palette.primary, kit.palette.secondary, kit.palette.accent,
            kit.palette.background, kit.palette.text,
            ...kit.palette.gradients.flatMap(g => [g.start, g.end]),
        ].map(c => c.toLowerCase());

        const allowedFonts = [
            kit.typography.heading.family,
            kit.typography.body.family,
            kit.typography.cta.family,
        ].map(f => f.toLowerCase());

        for (const el of elements) {
            // Check colors
            if (el.type === 'shape' && el.fill && !allowedColors.includes(el.fill.toLowerCase())) {
                issues.push({ element: el.name, issue: `Color ${el.fill} not in brand palette`, severity: 'warning' });
            }
            if (el.type === 'text' && !allowedColors.includes(el.color.toLowerCase())) {
                issues.push({ element: el.name, issue: `Text color ${el.color} not in brand palette`, severity: 'warning' });
            }
            // Check fonts
            if (el.type === 'text' && !allowedFonts.includes(el.fontFamily.toLowerCase())) {
                issues.push({ element: el.name, issue: `Font "${el.fontFamily}" not in brand typography`, severity: 'warning' });
            }
        }

        // Check forbidden colors
        for (const forbidden of kit.guidelines.forbiddenColors) {
            for (const el of elements) {
                if (el.type === 'shape' && el.fill?.toLowerCase() === forbidden.toLowerCase()) {
                    issues.push({ element: el.name, issue: `Uses forbidden color ${forbidden}`, severity: 'error' });
                }
            }
        }

        // Check required logo presence
        const hasLogo = elements.some(e => e.role === 'logo' || e.name.toLowerCase().includes('logo'));
        const requiresLogo = kit.assets.some(a => a.role === 'primary_logo' && !a.deletedAt);
        if (requiresLogo && !hasLogo) {
            issues.push({ element: '-', issue: 'Primary logo is in brand kit but not placed on canvas', severity: 'error' });
        }

        const score = Math.max(0, 100 - issues.filter(i => i.severity === 'error').length * 20 - issues.filter(i => i.severity === 'warning').length * 5);

        return {
            success: true,
            message: `Brand compliance: ${score}/100, ${issues.length} issues`,
            data: { score, issues, brandName: kit.guidelines.name },
        };
    },
};

export const analyzeTools: AceTool[] = [analyzeColors, analyzeTypography, analyzeSpacing, analyzeBrandCompliance];
