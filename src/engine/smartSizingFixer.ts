// ─────────────────────────────────────────────────
// Smart Sizing Fixer — Auto-fix engine for layout issues
// ─────────────────────────────────────────────────
// Takes QA issues and automatically applies fixes to element constraints.
// Inspired by OpenPencil's applyValidationFixes() pattern.

import type { DesignElement } from '@/schema/elements.types';
import type { BannerVariant } from '@/schema/design.types';
import type { QAIssue } from '@/engine/smartSizingQA';
import { resolveConstraints } from '@/schema/constraints.types';
import { getAspectCategory } from '@/schema/layoutRoles';
import { computeSmartConstraints } from '@/engine/smartLayout';

export interface FixResult {
    variantId: string;
    elementId: string;
    elementName: string;
    rule: string;
    description: string;
    patch: Partial<DesignElement>;
}

/**
 * Given a list of QA issues, produce concrete element patches.
 * Each fix targets a specific element in a specific variant.
 */
export function generateFixes(
    issues: QAIssue[],
    variants: BannerVariant[],
): FixResult[] {
    const fixes: FixResult[] = [];

    for (const issue of issues) {
        const variant = variants.find(v => v.id === issue.variantId);
        if (!variant || !issue.elementId) continue;

        const el = variant.elements.find(e => e.id === issue.elementId);
        if (!el) continue;

        const w = variant.preset.width;
        const h = variant.preset.height;
        const bounds = resolveConstraints(el.constraints, w, h);

        switch (issue.rule) {
            case 'out-of-bounds':
            case 'partially-clipped':
                fixes.push(...fixOutOfBounds(el, bounds, w, h, variant.id));
                break;
            case 'overlap':
                // Overlaps are handled by repositioning — defer to layout fix
                fixes.push(...fixOverlap(el, bounds, w, h, variant));
                break;
            case 'tnc-too-large':
                fixes.push({
                    variantId: variant.id,
                    elementId: el.id,
                    elementName: el.name,
                    rule: issue.rule,
                    description: `Reduced TnC font size to 8px`,
                    patch: { fontSize: 8 } as Partial<DesignElement>,
                });
                break;
            case 'headline-too-wide':
                fixes.push({
                    variantId: variant.id,
                    elementId: el.id,
                    elementName: el.name,
                    rule: issue.rule,
                    description: `Reduced headline width to 90% of canvas`,
                    patch: {
                        constraints: {
                            ...el.constraints,
                            size: { ...el.constraints.size, widthMode: 'relative' as const, width: 0.9 },
                        },
                    } as Partial<DesignElement>,
                });
                break;
            case 'layout-ultrawide-cta':
                fixes.push({
                    variantId: variant.id,
                    elementId: el.id,
                    elementName: el.name,
                    rule: issue.rule,
                    description: `Moved CTA to right side for ultra-wide layout`,
                    patch: {
                        constraints: {
                            ...el.constraints,
                            horizontal: { anchor: 'right' as const, offset: 20 },
                        },
                    } as Partial<DesignElement>,
                });
                break;
            case 'layout-ultrawide-logo':
                fixes.push({
                    variantId: variant.id,
                    elementId: el.id,
                    elementName: el.name,
                    rule: issue.rule,
                    description: `Moved logo to left side for ultra-wide layout`,
                    patch: {
                        constraints: {
                            ...el.constraints,
                            horizontal: { anchor: 'left' as const, offset: 10 },
                        },
                    } as Partial<DesignElement>,
                });
                break;
            case 'layout-portrait-order':
                // Move headline above CTA
                fixes.push({
                    variantId: variant.id,
                    elementId: el.id,
                    elementName: el.name,
                    rule: issue.rule,
                    description: `Moved headline above CTA for portrait layout`,
                    patch: {
                        constraints: {
                            ...el.constraints,
                            vertical: { anchor: 'top' as const, offset: Math.round(h * 0.25) },
                        },
                    } as Partial<DesignElement>,
                });
                break;
        }
    }

    return fixes;
}

// ── Fix: Out of bounds / clipped elements ──

function fixOutOfBounds(
    el: DesignElement,
    bounds: { x: number; y: number; width: number; height: number },
    canvasW: number,
    canvasH: number,
    variantId: string,
): FixResult[] {
    // If element has a role, use smart layout engine for optimal placement
    if (el.role) {
        const smartConstraints = computeSmartConstraints({
            role: el.role,
            canvasW,
            canvasH,
            elWidth: bounds.width,
            elHeight: bounds.height,
            fontSize: el.type === 'text' ? el.fontSize : undefined,
        });
        return [{
            variantId,
            elementId: el.id,
            elementName: el.name,
            rule: 'out-of-bounds',
            description: `Repositioned "${el.name}" using smart layout rules`,
            patch: { constraints: smartConstraints } as Partial<DesignElement>,
        }];
    }

    // Fallback: simple edge clamping for elements without roles
    const fixes: FixResult[] = [];
    const newConstraints = { ...el.constraints };
    let changed = false;

    if (bounds.x < 0) {
        newConstraints.horizontal = { anchor: 'left' as const, offset: 4 };
        changed = true;
    } else if (bounds.x + bounds.width > canvasW) {
        newConstraints.horizontal = { anchor: 'right' as const, offset: 4 };
        changed = true;
    }
    if (bounds.y < 0) {
        newConstraints.vertical = { anchor: 'top' as const, offset: 4 };
        changed = true;
    } else if (bounds.y + bounds.height > canvasH) {
        newConstraints.vertical = { anchor: 'bottom' as const, offset: 4 };
        changed = true;
    }
    if (bounds.width > canvasW) {
        newConstraints.size = { ...newConstraints.size, widthMode: 'relative' as const, width: 0.95 };
        changed = true;
    }
    if (bounds.height > canvasH) {
        newConstraints.size = { ...newConstraints.size, heightMode: 'relative' as const, height: 0.95 };
        changed = true;
    }

    if (changed) {
        fixes.push({
            variantId,
            elementId: el.id,
            elementName: el.name,
            rule: 'out-of-bounds',
            description: `Repositioned "${el.name}" inside canvas bounds`,
            patch: { constraints: newConstraints } as Partial<DesignElement>,
        });
    }
    return fixes;
}

// ── Fix: Overlapping content elements ──

function fixOverlap(
    el: DesignElement,
    bounds: { x: number; y: number; width: number; height: number },
    canvasW: number,
    canvasH: number,
    variant: BannerVariant,
): FixResult[] {
    const category = getAspectCategory(canvasW, canvasH);

    // For overlapping elements, reduce their size slightly and add spacing
    if (bounds.height > canvasH * 0.4) {
        return [{
            variantId: variant.id,
            elementId: el.id,
            elementName: el.name,
            rule: 'overlap',
            description: `Reduced height of "${el.name}" to prevent overlap`,
            patch: {
                constraints: {
                    ...el.constraints,
                    size: {
                        ...el.constraints.size,
                        heightMode: 'relative' as const,
                        height: category === 'portrait' ? 0.15 : 0.35,
                    },
                },
            } as Partial<DesignElement>,
        }];
    }

    // For text overlaps, try reducing font size
    if (el.type === 'text' && el.fontSize && el.fontSize > 12) {
        return [{
            variantId: variant.id,
            elementId: el.id,
            elementName: el.name,
            rule: 'overlap',
            description: `Reduced font size of "${el.name}" to prevent overlap`,
            patch: {
                fontSize: Math.max(10, Math.round(el.fontSize * 0.8)),
            } as Partial<DesignElement>,
        }];
    }

    return [];
}
