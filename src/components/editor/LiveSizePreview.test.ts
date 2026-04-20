// ─────────────────────────────────────────────────
// LiveSizePreview.test.ts — Multi-size minimap tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LiveSizePreview.tsx'), 'utf-8');
const stylesSrc = readFileSync(resolve(__dirname, './liveSizePreviewStyles.ts'), 'utf-8');

describe('LiveSizePreview — architecture', () => {
    it('is a memo component for performance', () => {
        expect(src).toContain('memo(function LiveSizePreview');
    });

    it('subscribes to designStore for creativeSet', () => {
        expect(src).toContain('useDesignStore');
        expect(src).toContain('s.creativeSet');
    });

    it('filters out the current variant being edited', () => {
        expect(src).toContain('v.id !== currentVariantId');
    });

    it('reuses CanvasPreviewImage for rendering', () => {
        expect(src).toContain('CanvasPreviewImage');
        expect(src).toContain("from '@/components/creativeset/CanvasPreviewImage'");
    });

    it('resolves idb:// and storage:// image URLs', () => {
        expect(src).toContain('resolveAsset');
        expect(src).toContain("el.src.startsWith('idb://')");
        expect(src).toContain("el.src.startsWith('storage://')");
    });

    it('limits display to max 8 variants for performance', () => {
        expect(src).toContain('.slice(0, 8)');
    });

    it('shows overflow count when more than 8 variants', () => {
        expect(src).toContain('otherVariants.length > 8');
    });

    it('supports collapse/expand toggle', () => {
        expect(src).toContain('collapsed');
        expect(src).toContain('toggleCollapse');
    });

    it('returns null when no other variants exist', () => {
        expect(src).toContain('if (otherVariants.length === 0) return null');
    });
});

describe('LiveSizePreview — styles', () => {
    it('uses glassmorphism background', () => {
        expect(stylesSrc).toContain('backdropFilter');
        expect(stylesSrc).toContain('blur');
    });

    it('has smooth collapse transition', () => {
        expect(stylesSrc).toContain('transition');
    });

    it('has proper overflow scrolling for card list', () => {
        expect(stylesSrc).toContain("overflowY: 'auto'");
    });

    it('uses consistent dark theme colors', () => {
        expect(stylesSrc).toContain('rgba(15, 18, 30');
    });
});

describe('LiveSizePreview — MiniCard', () => {
    it('renders size label for each variant', () => {
        expect(src).toContain('{w} x {h}');
    });

    it('uses fitScale to fit into card width', () => {
        expect(src).toContain('fitScale');
    });

    it('MiniCard is also memoized', () => {
        expect(src).toContain('memo(function MiniCard');
    });
});

describe('LiveSizePreview — ★ REGRESSION guards', () => {
    it('★ REGRESSION: never modifies designStore (read-only)', () => {
        // LiveSizePreview should only READ from designStore, never write
        expect(src).not.toContain('designStore.setState');
        expect(src).not.toContain('.setCreativeSet');
    });

    it('★ REGRESSION: does not import from engine/ (no canvas manipulation)', () => {
        expect(src).not.toContain("from '@/engine/");
    });
});
