// ─────────────────────────────────────────────────
// designScoreEngine — Unified Design Quality Scoring
// ─────────────────────────────────────────────────
// Combines designHeuristics, layoutValidator, and brandCompliance
// into a single 0-100 score with categorized issues and auto-fix.
//
// This is the "Grammarly for Design" core engine.
// ─────────────────────────────────────────────────

import type { BannerVariant } from '@/schema/design.types';
import type { EngineNode } from '@/hooks/canvasTypes';
import type { BrandKit } from '@/stores/brandKitStore';
import { runDesignHeuristics } from '@/engine/designHeuristics';
import { checkBrandCompliance, autoFixViolations } from '@/engine/brandCompliance';

// ── Public Types ──

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCategory =
    | 'safe-zone'
    | 'contrast'
    | 'overflow'
    | 'hierarchy'
    | 'color'
    | 'typography'
    | 'content'
    | 'layout'
    | 'proportion';

export interface DesignIssue {
    id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    message: string;
    elementId?: string | number;
    elementName?: string;
    autoFixable: boolean;
}

export interface DesignScore {
    /** Overall score 0-100 */
    total: number;
    /** Grade letter */
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    /** All detected issues */
    issues: DesignIssue[];
    /** Number of auto-fixable issues */
    fixableCount: number;
    /** Suggestions (non-blocking tips) */
    suggestions: string[];
}

// ── Score Calculation ──

const ERROR_PENALTY = 15;
const WARNING_PENALTY = 5;

function computeGrade(score: number): DesignScore['grade'] {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
}

// ── Rule-to-Category Mapping ──

function mapHeuristicRule(rule: string): IssueCategory {
    switch (rule) {
        case 'safe-zone': return 'safe-zone';
        case 'cta-contrast':
        case 'cta-visibility': return 'contrast';
        case 'text-overflow': return 'overflow';
        default: return 'layout';
    }
}

// ── Main Scoring Function ──

/**
 * Score a design variant using all available quality engines.
 * Returns a unified 0-100 score with categorized issues.
 *
 * @param variant  The BannerVariant to check (for constraint-based checks)
 * @param nodes    EngineNode[] from canvas (for brand compliance checks)
 * @param brandKit Optional BrandKit (if not provided, brand checks are skipped)
 */
export function scoreDesign(
    variant: BannerVariant | null,
    nodes: EngineNode[],
    brandKit: BrandKit | null,
): DesignScore {
    const issues: DesignIssue[] = [];
    const suggestions: string[] = [];

    // ── 1. Design Heuristics (constraint-based checks) ──
    if (variant) {
        const heuristicFixes = runDesignHeuristics(variant);
        for (const fix of heuristicFixes) {
            issues.push({
                id: `heuristic-${fix.elementId}-${fix.rule}`,
                category: mapHeuristicRule(fix.rule),
                severity: fix.rule === 'cta-contrast' || fix.rule === 'cta-visibility'
                    ? 'error' : 'warning',
                message: fix.description,
                elementId: fix.elementId,
                elementName: fix.elementName,
                autoFixable: !!fix.patch,
            });
        }
    }

    // ── 2. Brand Compliance (canvas node checks) ──
    if (brandKit && nodes.length > 0) {
        const compliance = checkBrandCompliance(nodes, brandKit);
        for (const v of compliance.violations) {
            issues.push({
                id: `brand-${v.elementId}-${v.category}`,
                category: v.category as IssueCategory,
                severity: v.severity,
                message: v.message,
                elementId: v.elementId,
                autoFixable: v.autoFixable,
            });
        }
        suggestions.push(...compliance.suggestions);
    }

    // ── 3. Canvas-Level Quick Checks (no dependencies needed) ──
    if (nodes.length > 0) {
        // Check: any text elements?
        const hasText = nodes.some(n => n.type === 'text');
        if (!hasText) {
            suggestions.push('Consider adding a headline or CTA text to your design.');
        }

        // Check: too many elements?
        const nonBgNodes = nodes.filter(n => n.name !== 'background' && n.name !== 'Background');
        if (nonBgNodes.length > 12) {
            suggestions.push('Design has many elements. Simplify for better visual impact.');
        }

        // Check: very small text on canvas
        for (const n of nodes) {
            if (n.type === 'text' && n.fontSize && n.fontSize < 10) {
                issues.push({
                    id: `tiny-text-${n.id}`,
                    category: 'overflow',
                    severity: 'warning',
                    message: `"${n.name ?? 'Text'}" has very small font (${n.fontSize}px). May be unreadable.`,
                    elementId: n.id,
                    elementName: n.name,
                    autoFixable: false,
                });
            }
        }
    }

    // ── Compute Score ──
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const total = Math.max(0, Math.min(100,
        100 - (errorCount * ERROR_PENALTY) - (warningCount * WARNING_PENALTY),
    ));
    const fixableCount = issues.filter(i => i.autoFixable).length;

    return {
        total,
        grade: computeGrade(total),
        issues,
        fixableCount,
        suggestions,
    };
}

/**
 * Get auto-fix patches from brand compliance violations.
 * Returns patches that can be applied to canvas nodes.
 */
export function getAutoFixPatches(
    nodes: EngineNode[],
    brandKit: BrandKit | null,
): Array<{ elementId: number; patch: Partial<EngineNode> }> {
    if (!brandKit || nodes.length === 0) return [];
    const compliance = checkBrandCompliance(nodes, brandKit);
    return autoFixViolations(compliance.violations);
}
