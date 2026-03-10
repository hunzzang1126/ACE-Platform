// ─────────────────────────────────────────────────
// adNetworkValidator — Pre-export compliance checks
// ─────────────────────────────────────────────────
// Validates ad creative against Google Ads, Meta, IAB specs
// before export. Returns pass/fail + violations.
// ─────────────────────────────────────────────────

export type AdNetwork = 'google_ads' | 'meta' | 'iab' | 'dv360';

export interface NetworkSpec {
    maxFileSizeKB: number;
    maxAnimDurationS: number;
    maxLoopCount: number;
    acceptedSizes: Array<{ w: number; h: number }>;
    requireClickTag: boolean;
    requireBackupImage: boolean;
    maxInitialLoadKB: number;
}

export interface ValidationResult {
    network: AdNetwork;
    passed: boolean;
    score: number; // 0-100
    violations: ValidationViolation[];
    warnings: ValidationWarning[];
}

export interface ValidationViolation {
    code: string;
    message: string;
    severity: 'error' | 'warning';
    fix?: string;
}

export type ValidationWarning = ValidationViolation;

// ── Network Specifications ──

const SPECS: Record<AdNetwork, NetworkSpec> = {
    google_ads: {
        maxFileSizeKB: 150,
        maxAnimDurationS: 30,
        maxLoopCount: 3,
        acceptedSizes: [
            { w: 300, h: 250 }, { w: 728, h: 90 }, { w: 160, h: 600 },
            { w: 320, h: 50 }, { w: 300, h: 600 }, { w: 970, h: 250 },
            { w: 336, h: 280 }, { w: 970, h: 90 }, { w: 468, h: 60 },
            { w: 250, h: 250 }, { w: 200, h: 200 }, { w: 120, h: 600 },
            { w: 320, h: 100 }, { w: 320, h: 480 },
        ],
        requireClickTag: true,
        requireBackupImage: true,
        maxInitialLoadKB: 150,
    },
    meta: {
        maxFileSizeKB: 30720, // 30MB for video, 150KB for static
        maxAnimDurationS: 15,
        maxLoopCount: -1, // unlimited
        acceptedSizes: [
            { w: 1200, h: 628 }, { w: 1080, h: 1080 }, { w: 1080, h: 1920 },
            { w: 600, h: 600 }, { w: 1200, h: 1200 },
        ],
        requireClickTag: false,
        requireBackupImage: false,
        maxInitialLoadKB: 1024,
    },
    iab: {
        maxFileSizeKB: 200,
        maxAnimDurationS: 30,
        maxLoopCount: 3,
        acceptedSizes: [
            { w: 300, h: 250 }, { w: 728, h: 90 }, { w: 160, h: 600 },
            { w: 300, h: 600 }, { w: 970, h: 250 }, { w: 320, h: 50 },
            { w: 970, h: 90 }, { w: 468, h: 60 },
        ],
        requireClickTag: true,
        requireBackupImage: true,
        maxInitialLoadKB: 200,
    },
    dv360: {
        maxFileSizeKB: 200,
        maxAnimDurationS: 30,
        maxLoopCount: 3,
        acceptedSizes: [
            { w: 300, h: 250 }, { w: 728, h: 90 }, { w: 160, h: 600 },
            { w: 300, h: 600 }, { w: 970, h: 250 }, { w: 320, h: 50 },
            { w: 320, h: 480 }, { w: 336, h: 280 },
        ],
        requireClickTag: true,
        requireBackupImage: true,
        maxInitialLoadKB: 200,
    },
};

// ── Validation ──

export interface ValidateInput {
    width: number;
    height: number;
    fileSizeBytes: number;
    animDurationS: number;
    loopCount: number;
    hasClickTag: boolean;
    hasBackupImage: boolean;
    htmlContent?: string;
}

export function validateForNetwork(network: AdNetwork, input: ValidateInput): ValidationResult {
    const spec = SPECS[network];
    const violations: ValidationViolation[] = [];
    const warnings: ValidationWarning[] = [];

    // File size check
    const fileSizeKB = input.fileSizeBytes / 1024;
    if (fileSizeKB > spec.maxFileSizeKB) {
        violations.push({
            code: 'FILE_SIZE',
            message: `File size ${fileSizeKB.toFixed(1)}KB exceeds ${spec.maxFileSizeKB}KB limit`,
            severity: 'error',
            fix: `Reduce image quality, remove unused assets, or simplify animations`,
        });
    } else if (fileSizeKB > spec.maxFileSizeKB * 0.8) {
        warnings.push({
            code: 'FILE_SIZE_WARN',
            message: `File size ${fileSizeKB.toFixed(1)}KB is approaching ${spec.maxFileSizeKB}KB limit`,
            severity: 'warning',
        });
    }

    // Dimensions check
    const sizeValid = spec.acceptedSizes.some(s => s.w === input.width && s.h === input.height);
    if (!sizeValid) {
        violations.push({
            code: 'DIMENSIONS',
            message: `${input.width}x${input.height} is not an accepted size for ${network}`,
            severity: 'error',
            fix: `Use one of: ${spec.acceptedSizes.slice(0, 5).map(s => `${s.w}x${s.h}`).join(', ')}...`,
        });
    }

    // Animation duration
    if (input.animDurationS > spec.maxAnimDurationS) {
        violations.push({
            code: 'ANIM_DURATION',
            message: `Animation duration ${input.animDurationS}s exceeds ${spec.maxAnimDurationS}s limit`,
            severity: 'error',
            fix: `Shorten animation to ${spec.maxAnimDurationS}s or less`,
        });
    }

    // Loop count
    if (spec.maxLoopCount > 0 && input.loopCount > spec.maxLoopCount) {
        violations.push({
            code: 'LOOP_COUNT',
            message: `Loop count ${input.loopCount} exceeds ${spec.maxLoopCount} max`,
            severity: 'error',
            fix: `Set loop count to ${spec.maxLoopCount} or less`,
        });
    }

    // ClickTag
    if (spec.requireClickTag && !input.hasClickTag) {
        violations.push({
            code: 'CLICK_TAG',
            message: `${network} requires a clickTag in the HTML`,
            severity: 'error',
            fix: 'Add a clickTag URL to the export settings',
        });
    }

    // Backup image
    if (spec.requireBackupImage && !input.hasBackupImage) {
        warnings.push({
            code: 'BACKUP_IMAGE',
            message: `${network} recommends a static backup image`,
            severity: 'warning',
            fix: 'Export a PNG fallback alongside the HTML5 creative',
        });
    }

    // HTML content checks
    if (input.htmlContent) {
        if (!input.htmlContent.includes('ad.size')) {
            warnings.push({
                code: 'AD_SIZE_META',
                message: 'Missing ad.size meta tag',
                severity: 'warning',
                fix: 'Add <meta name="ad.size" content="width=X,height=Y">',
            });
        }
    }

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warnCount = warnings.length;
    const score = Math.max(0, 100 - (errorCount * 25) - (warnCount * 5));

    return {
        network,
        passed: errorCount === 0,
        score,
        violations,
        warnings,
    };
}

/**
 * Validate against all major networks at once.
 */
export function validateAllNetworks(input: ValidateInput): ValidationResult[] {
    return (['google_ads', 'meta', 'iab', 'dv360'] as AdNetwork[]).map(n => validateForNetwork(n, input));
}

/**
 * Get the spec for a specific network.
 */
export function getNetworkSpec(network: AdNetwork): NetworkSpec {
    return SPECS[network];
}
