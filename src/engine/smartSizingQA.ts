// ─────────────────────────────────────────────────
// Smart Sizing QA Rules — Client-Side Layout Validation
// ─────────────────────────────────────────────────
// Pre-flight checks BEFORE sending to Vision API.
// Validates that smart sizing produced correct layouts
// without overlaps, clipping, or misplaced elements.

import type { DesignElement } from '@/schema/elements.types';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { getAspectCategory } from '@/schema/layoutRoles';
import type { LayoutRole, AspectCategory } from '@/schema/layoutRoles';

// ── QA Issue Types ──

export type QASeverity = 'error' | 'warning' | 'info';

export interface QAIssue {
    severity: QASeverity;
    rule: string;
    message: string;
    elementId?: string;
    elementName?: string;
    variantId: string;
    variantName: string;
}

// ── Main QA Runner ──

/**
 * Run all smart sizing QA rules on a set of variants.
 * Returns a list of issues found.
 */
export function runSmartSizingQA(variants: BannerVariant[]): QAIssue[] {
    const issues: QAIssue[] = [];

    for (const variant of variants) {
        const w = variant.preset.width;
        const h = variant.preset.height;
        const category = getAspectCategory(w, h);
        const vName = variant.preset.name || `${w}×${h}`;

        // Resolve all element positions
        const resolved = variant.elements.map(el => ({
            el,
            bounds: resolveConstraints(el.constraints, w, h),
        }));

        // Rule 1: Elements out of bounds
        for (const { el, bounds } of resolved) {
            if (!el.visible) continue;
            if (bounds.x + bounds.width < 0 || bounds.y + bounds.height < 0 ||
                bounds.x > w || bounds.y > h) {
                issues.push({
                    severity: 'error',
                    rule: 'out-of-bounds',
                    message: `"${el.name}" is completely outside the canvas (${Math.round(bounds.x)},${Math.round(bounds.y)})`,
                    elementId: el.id, elementName: el.name,
                    variantId: variant.id, variantName: vName,
                });
            } else if (bounds.x < 0 || bounds.y < 0 ||
                bounds.x + bounds.width > w || bounds.y + bounds.height > h) {
                issues.push({
                    severity: 'warning',
                    rule: 'partially-clipped',
                    message: `"${el.name}" extends beyond canvas edges`,
                    elementId: el.id, elementName: el.name,
                    variantId: variant.id, variantName: vName,
                });
            }
        }

        // Rule 2: Text element overlaps (excluding backgrounds & accents)
        const contentElements = resolved.filter(({ el }) =>
            el.visible && el.role !== 'background' && el.role !== 'accent'
        );
        for (let i = 0; i < contentElements.length; i++) {
            for (let j = i + 1; j < contentElements.length; j++) {
                const a = contentElements[i]!;
                const b = contentElements[j]!;
                if (rectsOverlap(a.bounds, b.bounds)) {
                    issues.push({
                        severity: 'error',
                        rule: 'overlap',
                        message: `"${a.el.name}" overlaps with "${b.el.name}"`,
                        elementId: a.el.id, elementName: a.el.name,
                        variantId: variant.id, variantName: vName,
                    });
                }
            }
        }

        // Rule 3: TnC font size too large
        for (const { el } of resolved) {
            if (el.role === 'tnc' && el.type === 'text') {
                const textEl = el as { fontSize?: number };
                if (textEl.fontSize && textEl.fontSize > 11) {
                    issues.push({
                        severity: 'warning',
                        rule: 'tnc-too-large',
                        message: `TnC text "${el.name}" has fontSize ${textEl.fontSize}px (should be ≤10px)`,
                        elementId: el.id, elementName: el.name,
                        variantId: variant.id, variantName: vName,
                    });
                }
            }
        }

        // Rule 4: Headline too wide (>95% of canvas) — likely truncated
        for (const { el, bounds } of resolved) {
            if (el.role === 'headline' && bounds.width > w * 0.95) {
                issues.push({
                    severity: 'warning',
                    rule: 'headline-too-wide',
                    message: `Headline "${el.name}" uses ${Math.round(bounds.width / w * 100)}% of canvas width — may truncate`,
                    elementId: el.id, elementName: el.name,
                    variantId: variant.id, variantName: vName,
                });
            }
        }

        // Rule 5: Layout pattern mismatch
        checkLayoutPattern(variant, category, resolved, issues);

        // Rule 6: Missing critical roles
        const roles = new Set(variant.elements.filter(el => el.role).map(el => el.role));
        if (!roles.has('background')) {
            issues.push({
                severity: 'info',
                rule: 'missing-background',
                message: 'No element with role="background" — design may lack a base layer',
                variantId: variant.id, variantName: vName,
            });
        }
        if (!roles.has('cta')) {
            issues.push({
                severity: 'warning',
                rule: 'missing-cta',
                message: 'No CTA button — banner may lack a call to action',
                variantId: variant.id, variantName: vName,
            });
        }
    }

    return issues;
}

// ── Layout Pattern Validation ──

function checkLayoutPattern(
    variant: BannerVariant,
    category: AspectCategory,
    resolved: Array<{ el: DesignElement; bounds: { x: number; y: number; width: number; height: number } }>,
    issues: QAIssue[],
): void {
    const w = variant.preset.width;
    const vName = variant.preset.name || `${variant.preset.width}×${variant.preset.height}`;

    const headline = resolved.find(r => r.el.role === 'headline');
    const cta = resolved.find(r => r.el.role === 'cta');
    const logo = resolved.find(r => r.el.role === 'logo');

    if (category === 'ultra-wide') {
        // Ultra-wide: CTA should be on the right side
        if (cta && cta.bounds.x + cta.bounds.width / 2 < w * 0.5) {
            issues.push({
                severity: 'warning',
                rule: 'layout-ultrawide-cta',
                message: `Ultra-wide (${vName}): CTA should be on the RIGHT side, but it's on the left`,
                elementId: cta.el.id, elementName: cta.el.name,
                variantId: variant.id, variantName: vName,
            });
        }
        // Ultra-wide: Logo should be on the left side
        if (logo && logo.bounds.x + logo.bounds.width / 2 > w * 0.5) {
            issues.push({
                severity: 'warning',
                rule: 'layout-ultrawide-logo',
                message: `Ultra-wide (${vName}): Logo should be on the LEFT side, but it's on the right`,
                elementId: logo.el.id, elementName: logo.el.name,
                variantId: variant.id, variantName: vName,
            });
        }
    }

    if (category === 'portrait') {
        // Portrait: elements should be stacked vertically (headline above CTA)
        if (headline && cta && headline.bounds.y > cta.bounds.y) {
            issues.push({
                severity: 'error',
                rule: 'layout-portrait-order',
                message: `Portrait (${vName}): Headline is BELOW CTA — should be above`,
                elementId: headline.el.id, elementName: headline.el.name,
                variantId: variant.id, variantName: vName,
            });
        }
    }
}

// ── Helpers ──

function rectsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
): boolean {
    // Allow small margin of overlap (4px) — subpixel rendering tolerance
    const margin = 4;
    return !(
        a.x + a.width <= b.x + margin ||
        b.x + b.width <= a.x + margin ||
        a.y + a.height <= b.y + margin ||
        b.y + b.height <= a.y + margin
    );
}
