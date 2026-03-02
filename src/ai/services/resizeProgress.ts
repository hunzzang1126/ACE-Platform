// ─────────────────────────────────────────────────
// Resize Progress — Progress event emitter
// ─────────────────────────────────────────────────
// Lightweight progress reporting for the resize orchestrator.
// Inspired by OpenPencil's orchestrator-progress.ts pattern.

export type ResizePhase = 'planning' | 'resizing' | 'validating' | 'done' | 'error';

export interface VariantProgress {
    variantId: string;
    label: string;
    status: 'pending' | 'resizing' | 'validating' | 'done' | 'error';
    fixCount: number;
}

export interface ResizeProgress {
    phase: ResizePhase;
    variants: VariantProgress[];
    totalFixed: number;
    message: string;
}

export type ProgressCallback = (progress: ResizeProgress) => void;

/**
 * Build initial progress state from variant labels.
 */
export function createInitialProgress(
    variants: Array<{ id: string; label: string }>,
): ResizeProgress {
    return {
        phase: 'planning',
        variants: variants.map(v => ({
            variantId: v.id,
            label: v.label,
            status: 'pending',
            fixCount: 0,
        })),
        totalFixed: 0,
        message: 'Preparing resize plan...',
    };
}

/**
 * Update a single variant's status in the progress.
 */
export function updateVariantStatus(
    progress: ResizeProgress,
    variantId: string,
    status: VariantProgress['status'],
    fixCount?: number,
): ResizeProgress {
    const updated = { ...progress };
    updated.variants = progress.variants.map(v =>
        v.variantId === variantId
            ? { ...v, status, fixCount: fixCount ?? v.fixCount }
            : v,
    );
    updated.totalFixed = updated.variants.reduce((sum, v) => sum + v.fixCount, 0);
    return updated;
}

/**
 * Build a human-readable progress message.
 */
export function buildProgressMessage(progress: ResizeProgress): string {
    const done = progress.variants.filter(v => v.status === 'done').length;
    const total = progress.variants.length;

    switch (progress.phase) {
        case 'planning':
            return `Planning resize for ${total} sizes...`;
        case 'resizing':
            return `Resizing ${done}/${total} sizes...`;
        case 'validating':
            return `Validating designs...`;
        case 'done':
            return progress.totalFixed > 0
                ? `Done: Resized ${total} sizes, fixed ${progress.totalFixed} issues`
                : `Done: All ${total} sizes resized — no issues found`;
        case 'error':
            return `Error during resize`;
        default:
            return '';
    }
}
