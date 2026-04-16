// ─────────────────────────────────────────────────
// CanvasPreviewImage.test.ts — Preview sprite z-index contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CanvasPreviewImage.tsx'), 'utf-8');

describe('CanvasPreviewImage — sprite z-index ordering', () => {
    it('★ REGRESSION: SpriteData includes zIndex field', () => {
        expect(src).toContain('zIndex: number');
    });

    it('★ REGRESSION: stores element zIndex when building sprites', () => {
        expect(src).toContain('zIndex: el.zIndex ?? 0');
    });

    it('★ REGRESSION: sorts sprites by zIndex before rendering', () => {
        expect(src).toContain('.sort((a, b) => a.zIndex - b.zIndex)');
    });

    it('★ REGRESSION: applies CSS z-index to sprite overlays', () => {
        expect(src).toContain('zIndex: i + 1');
    });
});

describe('CanvasPreviewImage — animation rendering', () => {
    it('uses computeAnimStyle for animation transforms', () => {
        expect(src).toContain('computeAnimStyle');
    });

    it('uses constraintsToAbsolute for positioning', () => {
        expect(src).toContain('constraintsToAbsolute');
    });

    it('scales animation pixel values for preview size', () => {
        expect(src).toContain('scaleAnimStyle');
    });

    it('renders base image underneath sprite overlays', () => {
        expect(src).toContain('baseUrl || staticUrl');
    });

    it('uses GPU acceleration hints for smooth animation', () => {
        expect(src).toContain("willChange: 'transform, opacity'");
    });

    it('disables pointer events on sprites', () => {
        expect(src).toContain("pointerEvents: 'none'");
    });
});

describe('CanvasPreviewImage — asset resolution', () => {
    it('resolves idb:// URLs in elements', () => {
        expect(src).toContain("startsWith('idb://')");
    });

    it('resolves storage:// URLs in elements', () => {
        expect(src).toContain("startsWith('storage://')");
    });
});
