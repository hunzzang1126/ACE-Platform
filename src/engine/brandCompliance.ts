// ─────────────────────────────────────────────────
// brandCompliance — Design compliance checker
// ─────────────────────────────────────────────────
// Validates a design against brand guidelines.
// Returns a score, violations, and visual indicators.
// ─────────────────────────────────────────────────

import type { BrandKit } from '@/stores/brandKitStore';
import type { EngineNode } from '@/hooks/canvasTypes';

// ── Types ──

export interface ComplianceResult {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    violations: ComplianceViolation[];
    suggestions: string[];
}

export interface ComplianceViolation {
    elementId: number;
    category: 'color' | 'typography' | 'logo' | 'content' | 'layout';
    message: string;
    severity: 'error' | 'warning' | 'info';
    autoFixable: boolean;
    fix?: () => Partial<EngineNode>;
}

// ── Color parsing helpers ──

function hexToRgb(hex: string): [number, number, number] | null {
    const h = hex.replace('#', '');
    if (h.length !== 6) return null;
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
    return Math.sqrt(
        (c1[0] - c2[0]) ** 2 +
        (c1[1] - c2[1]) ** 2 +
        (c1[2] - c2[2]) ** 2
    );
}

function isColorClose(hex1: string, hex2: string, threshold = 60): boolean {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    if (!c1 || !c2) return false;
    return colorDistance(c1, c2) < threshold;
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Main checker ──

export function checkBrandCompliance(
    nodes: EngineNode[],
    brandKit: BrandKit,
): ComplianceResult {
    const violations: ComplianceViolation[] = [];
    const suggestions: string[] = [];

    const palette = brandKit.palette;
    const guidelines = brandKit.guidelines;
    const typo = brandKit.typography;

    // Brand colors as hex array
    const brandColors = [
        palette.primary,
        palette.secondary,
        palette.accent,
        palette.background,
        palette.text,
    ];

    // ── Color compliance ──
    for (const node of nodes) {
        if (node.type === 'rect' || node.type === 'rounded_rect' || node.type === 'ellipse') {
            const nodeColor = rgbToHex(
                node.fill_r * 255,
                node.fill_g * 255,
                node.fill_b * 255
            );

            // Check against forbidden colors
            const isForbidden = guidelines.forbiddenColors.some(fc => isColorClose(nodeColor, fc, 30));
            if (isForbidden) {
                violations.push({
                    elementId: node.id,
                    category: 'color',
                    message: `Element "${node.name}" uses a forbidden color (${nodeColor})`,
                    severity: 'error',
                    autoFixable: true,
                    fix: () => {
                        const primary = hexToRgb(palette.primary);
                        if (!primary) return {};
                        return { fill_r: primary[0] / 255, fill_g: primary[1] / 255, fill_b: primary[2] / 255 };
                    },
                });
            }

            // Check if color is in brand palette
            const onBrand = brandColors.some(bc => isColorClose(nodeColor, bc, 80));
            if (!onBrand) {
                violations.push({
                    elementId: node.id,
                    category: 'color',
                    message: `Element "${node.name}" uses off-brand color (${nodeColor})`,
                    severity: 'warning',
                    autoFixable: false,
                });
            }
        }
    }

    // ── Typography compliance ──
    for (const node of nodes) {
        if (node.type === 'text') {
            const textNode = node as EngineNode & { font_family?: string; font_size?: number };
            const fontFamily = textNode.font_family ?? '';

            const brandFonts = [typo.heading.family, typo.body.family, typo.cta.family];
            const isOnBrandFont = brandFonts.some(bf =>
                fontFamily.toLowerCase().includes(bf.toLowerCase())
            );

            if (fontFamily && !isOnBrandFont) {
                violations.push({
                    elementId: node.id,
                    category: 'typography',
                    message: `Text "${node.name}" uses non-brand font "${fontFamily}"`,
                    severity: 'warning',
                    autoFixable: true,
                    fix: () => ({ font_family: typo.body.family } as any),
                });
            }
        }
    }

    // ── Content compliance ──
    for (const node of nodes) {
        if (node.type === 'text') {
            const textNode = node as EngineNode & { text_content?: string };
            const text = textNode.text_content ?? '';

            for (const forbidden of guidelines.forbiddenWords) {
                if (text.toLowerCase().includes(forbidden.toLowerCase())) {
                    violations.push({
                        elementId: node.id,
                        category: 'content',
                        message: `Text contains forbidden word: "${forbidden}"`,
                        severity: 'error',
                        autoFixable: false,
                    });
                }
            }
        }
    }

    // ── Logo placement ──
    const logoNodes = nodes.filter(n =>
        n.name?.toLowerCase().includes('logo') || n.type === 'image'
    );
    if (logoNodes.length === 0 && brandKit.assets.some(a => a.category === 'logo')) {
        suggestions.push('Consider adding your brand logo to the design');
    }

    // ── General suggestions ──
    if (nodes.length > 10) {
        suggestions.push('Design has many elements. Simplify for better banner performance.');
    }

    const textNodes = nodes.filter(n => n.type === 'text');
    if (textNodes.length === 0) {
        suggestions.push('No text elements found. Consider adding a headline or CTA.');
    }

    // ── Score calculation ──
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warnCount = violations.filter(v => v.severity === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 20) - (warnCount * 5));

    let grade: ComplianceResult['grade'];
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    return { score, grade, violations, suggestions };
}

/**
 * Auto-fix all fixable violations.
 * Returns list of patches to apply.
 */
export function autoFixViolations(
    violations: ComplianceViolation[],
): Array<{ elementId: number; patch: Partial<EngineNode> }> {
    const patches: Array<{ elementId: number; patch: Partial<EngineNode> }> = [];
    for (const v of violations) {
        if (v.autoFixable && v.fix) {
            patches.push({ elementId: v.elementId, patch: v.fix() });
        }
    }
    return patches;
}
