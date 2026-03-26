// ─────────────────────────────────────────────────
// creativeScore — Pre-publish quality scoring
// ─────────────────────────────────────────────────
// Extends designScoreEngine with platform-specific checks
// for Instagram, Facebook, and Google Ads readiness.
// ─────────────────────────────────────────────────

import type { BannerVariant } from '@/schema/design.types';
import type { EngineNode } from '@/hooks/canvasTypes';
import type { BrandKit } from '@/stores/brandKitStore';
import { scoreDesign, type DesignScore, type DesignIssue } from '@/engine/designScoreEngine';
import type { PublishPlatform } from '@/services/publish/publishTypes';

// ── Platform-specific rules ──

interface PlatformRule {
    id: string;
    message: string;
    check: (variant: BannerVariant, nodes: EngineNode[]) => boolean;
    severity: 'error' | 'warning';
}

const INSTAGRAM_RULES: PlatformRule[] = [
    {
        id: 'ig-aspect-ratio',
        message: 'Instagram Feed requires 1:1, 4:5, or 1.91:1 aspect ratio',
        severity: 'warning',
        check: (v) => {
            const ratio = v.preset.width / v.preset.height;
            return (
                Math.abs(ratio - 1) < 0.05 ||       // 1:1
                Math.abs(ratio - 0.8) < 0.05 ||     // 4:5
                Math.abs(ratio - 1.91) < 0.05        // 1.91:1
            );
        },
    },
    {
        id: 'ig-min-size',
        message: 'Instagram minimum image size is 320px',
        severity: 'error',
        check: (v) => v.preset.width >= 320 && v.preset.height >= 320,
    },
    {
        id: 'ig-text-coverage',
        message: 'Excessive text may reduce Instagram reach (keep text under 20% of image)',
        severity: 'warning',
        check: (v, nodes) => {
            const textNodes = nodes.filter(n => n.type === 'text');
            if (textNodes.length === 0) return true;
            const canvasArea = v.preset.width * v.preset.height;
            let textArea = 0;
            for (const n of textNodes) {
                textArea += (n.width || 100) * (n.height || 30);
            }
            return (textArea / canvasArea) < 0.25;
        },
    },
];

const FACEBOOK_RULES: PlatformRule[] = [
    {
        id: 'fb-min-size',
        message: 'Facebook minimum image size is 200x200px',
        severity: 'error',
        check: (v) => v.preset.width >= 200 && v.preset.height >= 200,
    },
    {
        id: 'fb-max-size',
        message: 'Facebook maximum image size is 30MB',
        severity: 'warning',
        check: () => true, // Can't check file size from variant alone
    },
    {
        id: 'fb-text-ratio',
        message: 'Facebook ads with less text perform better (20% rule)',
        severity: 'warning',
        check: (v, nodes) => {
            const textNodes = nodes.filter(n => n.type === 'text');
            const canvasArea = v.preset.width * v.preset.height;
            let textArea = 0;
            for (const n of textNodes) {
                textArea += (n.width || 100) * (n.height || 30);
            }
            return (textArea / canvasArea) < 0.2;
        },
    },
];

const GOOGLE_ADS_RULES: PlatformRule[] = [
    {
        id: 'gdn-accepted-size',
        message: 'This size may not be a standard Google Display Network format',
        severity: 'warning',
        check: (v) => {
            const GDN_SIZES = [
                [300, 250], [336, 280], [728, 90], [300, 600],
                [160, 600], [320, 50], [320, 100], [970, 90],
                [970, 250], [250, 250], [200, 200], [468, 60],
                [120, 600], [300, 50],
            ];
            return GDN_SIZES.some(([w, h]) =>
                v.preset.width === w && v.preset.height === h
            );
        },
    },
    {
        id: 'gdn-has-cta',
        message: 'Display ads should include a clear call-to-action',
        severity: 'warning',
        check: (_v, nodes) => {
            return nodes.some(n =>
                n.type === 'button' ||
                (n.type === 'text' && n.text &&
                    /shop|buy|learn|discover|get|start|try|sign/i.test(n.text))
            );
        },
    },
    {
        id: 'gdn-max-file-size',
        message: 'Google Display Network limit is 150KB for static ads',
        severity: 'info' as 'warning', // Info-level
        check: () => true,
    },
];

const PLATFORM_RULES: Record<PublishPlatform, PlatformRule[]> = {
    instagram: INSTAGRAM_RULES,
    facebook: FACEBOOK_RULES,
    google_ads: GOOGLE_ADS_RULES,
};

// ── Creative Score Types ──

export interface CreativeScore extends DesignScore {
    /** Platform-specific readiness (per target) */
    platformReadiness: PlatformReadiness[];
    /** Overall publish-readiness (true if design score >= 60 and no platform errors) */
    publishReady: boolean;
    /** Human-readable summary */
    summary: string;
}

export interface PlatformReadiness {
    platform: PublishPlatform;
    ready: boolean;
    score: number;
    issues: DesignIssue[];
}

// ── Main Function ──

/**
 * Calculate a comprehensive Creative Score for pre-publish validation.
 * Combines design quality (heuristics + brand compliance) with
 * platform-specific checks for each target channel.
 */
export function calculateCreativeScore(
    variant: BannerVariant | null,
    nodes: EngineNode[],
    brandKit: BrandKit | null,
    targetPlatforms: PublishPlatform[] = ['instagram', 'facebook', 'google_ads'],
): CreativeScore {
    // 1. Base design score
    const baseScore = scoreDesign(variant, nodes, brandKit);

    // 2. Platform-specific checks
    const platformReadiness: PlatformReadiness[] = [];

    for (const platform of targetPlatforms) {
        const rules = PLATFORM_RULES[platform] || [];
        const platformIssues: DesignIssue[] = [];

        if (variant) {
            for (const rule of rules) {
                const passed = rule.check(variant, nodes);
                if (!passed) {
                    platformIssues.push({
                        id: rule.id,
                        category: 'content',
                        severity: rule.severity,
                        message: rule.message,
                        autoFixable: false,
                    });
                }
            }
        }

        const errorCount = platformIssues.filter(i => i.severity === 'error').length;
        const warningCount = platformIssues.filter(i => i.severity === 'warning').length;
        const platformScore = Math.max(0, 100 - (errorCount * 20) - (warningCount * 8));

        platformReadiness.push({
            platform,
            ready: errorCount === 0 && platformScore >= 60,
            score: platformScore,
            issues: platformIssues,
        });
    }

    // 3. Combine
    const allPlatformIssues = platformReadiness.flatMap(p => p.issues);
    const combinedIssues = [...baseScore.issues, ...allPlatformIssues];

    const platformAvg = platformReadiness.length > 0
        ? platformReadiness.reduce((sum, p) => sum + p.score, 0) / platformReadiness.length
        : 100;

    const combinedScore = Math.round((baseScore.total * 0.6) + (platformAvg * 0.4));
    const publishReady = combinedScore >= 60 &&
        platformReadiness.every(p => p.issues.filter(i => i.severity === 'error').length === 0);

    // 4. Summary
    const summary = generateSummary(combinedScore, baseScore, platformReadiness, publishReady);

    return {
        ...baseScore,
        total: combinedScore,
        grade: getGrade(combinedScore),
        issues: combinedIssues,
        fixableCount: combinedIssues.filter(i => i.autoFixable).length,
        platformReadiness,
        publishReady,
        summary,
    };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
}

function generateSummary(
    score: number,
    base: DesignScore,
    platforms: PlatformReadiness[],
    ready: boolean,
): string {
    if (ready && score >= 90) {
        return 'Excellent! Your creative is optimized and ready to publish.';
    }
    if (ready && score >= 75) {
        return 'Good quality. Ready to publish with minor suggestions.';
    }
    if (ready) {
        return 'Acceptable quality. Consider addressing warnings before publishing.';
    }
    const blockers = platforms.filter(p => !p.ready).map(p => p.platform);
    if (blockers.length > 0) {
        return `Not ready: ${blockers.join(', ')} have blocking issues. Fix errors to publish.`;
    }
    if (base.total < 40) {
        return 'Design quality is low. Add more elements and improve layout before publishing.';
    }
    return 'Some issues detected. Review and fix before publishing.';
}
