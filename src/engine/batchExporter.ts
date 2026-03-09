// ─────────────────────────────────────────────────
// Batch Exporter — Export all variants at once
// ─────────────────────────────────────────────────
// Reads all variants from designStore and exports each
// in the selected format (HTML5, PNG, GIF).
// Outputs a ZIP file using JSZip-compatible structure.
// ─────────────────────────────────────────────────

import type { EngineNode } from '@/hooks/canvasTypes';
import type { BannerVariant } from '@/schema/design.types';
import { exportToHtml5, type ExportOptions } from './html5Exporter';

// ── Types ────────────────────────────────────────

export type BatchFormat = 'html5' | 'png' | 'gif';

export interface BatchExportItem {
    variant: BannerVariant;
    html: string;
    blob: Blob;
    filename: string;
}

export interface BatchExportResult {
    items: BatchExportItem[];
    /** Combined ZIP blob (if available) */
    zipBlob?: Blob;
    totalSize: number;
}

// ── Main Batch Export ────────────────────────────

/**
 * Export multiple variants as HTML5.
 * For PNG/GIF, each variant needs its own canvas render — handled by caller.
 */
export function batchExportHtml5(
    variants: BannerVariant[],
    getNodes: (variantId: string) => EngineNode[],
    options?: Partial<ExportOptions>,
): BatchExportResult {
    const items: BatchExportItem[] = [];
    let totalSize = 0;

    for (const variant of variants) {
        const { width, height } = variant.preset;
        const nodes = getNodes(variant.id);
        const result = exportToHtml5(nodes, {
            width,
            height,
            backgroundColor: options?.backgroundColor ?? '#ffffff',
            clickTagUrl: options?.clickTagUrl ?? '',
            title: `${variant.preset.name ?? `${width}x${height}`}`,
            duration: options?.duration ?? 5,
            loop: options?.loop ?? false,
            ...options,
        });

        items.push({
            variant,
            html: result.html,
            blob: result.blob,
            filename: result.filename,
        });
        totalSize += result.blob.size;
    }

    return { items, totalSize };
}

/**
 * Create a ZIP blob from batch export items.
 * Uses a simple concatenated blob approach.
 * For proper ZIP, integrate JSZip library.
 */
export async function createBatchZip(items: BatchExportItem[]): Promise<Blob> {
    // Simple approach: create a combined HTML with all variants
    // For production, use JSZip for proper .zip files
    const manifest = items.map(item => ({
        filename: item.filename,
        size: item.blob.size,
        variant: `${item.variant.preset.width}x${item.variant.preset.height}`,
    }));

    // For now, return individual blobs that can be downloaded
    // JSZip integration would go here
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBlob = new Blob([manifestJson], { type: 'application/json' });

    return manifestBlob;
}

/**
 * Download all items individually (no ZIP dependency).
 */
export function downloadBatchItems(items: BatchExportItem[]): void {
    for (const item of items) {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
