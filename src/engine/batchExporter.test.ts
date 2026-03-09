// ─────────────────────────────────────────────────
// batchExporter.test — Batch export tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { batchExportHtml5 } from './batchExporter';
import type { BannerVariant } from '@/schema/design.types';
import type { EngineNode } from '@/hooks/canvasTypes';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

// Reset anim presets before each test
beforeEach(() => {
    useAnimPresetStore.setState({ presets: {} });
});

function makeVariant(id: string, w: number, h: number): BannerVariant {
    return {
        id,
        preset: { id: `p-${id}`, name: `${w}x${h}`, width: w, height: h, category: 'display' },
        elements: [],
        backgroundColor: '#ffffff',
        overriddenElementIds: [],
        syncLocked: false,
    };
}

function makeNode(id: number): EngineNode {
    return {
        id,
        type: 'rect',
        x: 10, y: 20,
        w: 100, h: 50,
        opacity: 1,
        z_index: 0,
        fill_r: 0.5, fill_g: 0.3, fill_b: 0.8,
        fill_a: 1,
        border_radius: 0,
        name: `Rect ${id}`,
    };
}

describe('batchExportHtml5', () => {
    it('exports multiple variants', () => {
        const variants = [
            makeVariant('v1', 300, 250),
            makeVariant('v2', 728, 90),
        ];

        const result = batchExportHtml5(
            variants,
            () => [makeNode(1)],
        );

        expect(result.items.length).toBe(2);
        expect(result.items[0]!.filename).toContain('300x250');
        expect(result.items[1]!.filename).toContain('728x90');
    });

    it('calculates total size', () => {
        const variants = [makeVariant('v1', 300, 250)];
        const result = batchExportHtml5(variants, () => []);
        expect(result.totalSize).toBeGreaterThan(0);
    });

    it('uses variant-specific nodes', () => {
        const variants = [
            makeVariant('v1', 300, 250),
            makeVariant('v2', 728, 90),
        ];

        const nodeMap: Record<string, EngineNode[]> = {
            v1: [makeNode(1), makeNode(2)],
            v2: [makeNode(3)],
        };

        const result = batchExportHtml5(
            variants,
            (variantId) => nodeMap[variantId] ?? [],
        );

        expect(result.items[0]!.html).toContain('ace-el-1');
        expect(result.items[0]!.html).toContain('ace-el-2');
        expect(result.items[1]!.html).toContain('ace-el-3');
    });

    it('applies custom options', () => {
        const variants = [makeVariant('v1', 300, 250)];
        const result = batchExportHtml5(
            variants,
            () => [],
            { clickTagUrl: 'https://custom.com' },
        );

        expect(result.items[0]!.html).toContain('https://custom.com');
    });

    it('handles empty variant list', () => {
        const result = batchExportHtml5([], () => []);
        expect(result.items.length).toBe(0);
        expect(result.totalSize).toBe(0);
    });

    it('each item has valid HTML blob', () => {
        const variants = [makeVariant('v1', 300, 250)];
        const result = batchExportHtml5(variants, () => []);
        expect(result.items[0]!.blob).toBeInstanceOf(Blob);
        expect(result.items[0]!.blob.type).toBe('text/html');
    });
});
