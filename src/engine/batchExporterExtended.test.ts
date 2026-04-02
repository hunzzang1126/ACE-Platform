// ─────────────────────────────────────────────────
// batchExporter.test.ts — Multi-variant export
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { batchExportHtml5, createBatchZip } from './batchExporter';
import type { BannerVariant } from '@/schema/design.types';

const makeVariant = (id: string, w: number, h: number): BannerVariant => ({
    id, preset: { id: `p-${w}x${h}`, name: `${w}x${h}`, width: w, height: h, category: 'display' },
    elements: [], backgroundColor: '#fff', overriddenElementIds: [], syncLocked: false,
});

describe('batchExportHtml5', () => {
    it('should export multiple variants', () => {
        const variants = [makeVariant('v1', 300, 250), makeVariant('v2', 728, 90)];
        const result = batchExportHtml5(variants, () => []);
        expect(result.items).toHaveLength(2);
        expect(result.totalSize).toBeGreaterThan(0);
    });

    it('should generate HTML blobs for each variant', () => {
        const result = batchExportHtml5([makeVariant('v1', 300, 250)], () => []);
        expect(result.items[0].html).toContain('<!DOCTYPE html>');
        expect(result.items[0].blob.size).toBeGreaterThan(0);
    });

    it('should use custom options', () => {
        const result = batchExportHtml5([makeVariant('v1', 300, 250)], () => [], { backgroundColor: '#000', clickTagUrl: 'https://example.com' });
        expect(result.items[0].html).toContain('#000');
    });

    it('should return correct filenames', () => {
        const result = batchExportHtml5([makeVariant('v1', 300, 250)], () => []);
        expect(result.items[0].filename).toContain('300x250');
    });
});

describe('createBatchZip', () => {
    it('should create a manifest blob', async () => {
        const items = batchExportHtml5([makeVariant('v1', 300, 250)], () => []).items;
        const zip = await createBatchZip(items);
        expect(zip.size).toBeGreaterThan(0);
        expect(zip.type).toBe('application/json');
    });
});
