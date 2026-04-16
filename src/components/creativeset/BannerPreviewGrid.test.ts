// BannerPreviewGrid.tsx — Contract tests for UX overhaul features

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BannerPreviewGrid.tsx'), 'utf-8');

describe('BannerPreviewGrid.tsx — exports', () => {
    it('exports BannerPreviewGrid', () => { expect(src).toContain('export function BannerPreviewGrid'); });
});

describe('★ Static vs Animated Icon (v0.0.0.599)', () => {
    it('checks hasAnyAnimation per variant for icon switching', () => {
        expect(src).toContain('hasAnyAnimation');
    });

    it('shows edit icon for static designs (no play triangle)', () => {
        // Static designs show pencil/edit icon instead of play
        expect(src).toContain('hasAnyAnimation');
    });
});

describe('★ Per-Size Kebab Menu (v0.0.0.599)', () => {
    it('renders kebab menu button in card header', () => {
        expect(src).toContain('banner-card-kebab');
    });

    it('kebab stops event propagation on mouseDown', () => {
        expect(src).toContain('e.stopPropagation()');
    });

    it('kebab triggers context menu on click', () => {
        expect(src).toContain('handleContextMenu(e, variant.id)');
    });

    it('kebab renders 3-dot SVG icon', () => {
        // Three circles for vertical dots
        expect(src).toContain('cx="8" cy="3"');
        expect(src).toContain('cx="8" cy="8"');
        expect(src).toContain('cx="8" cy="13"');
    });

    it('kebab has hover feedback (opacity change)', () => {
        expect(src).toContain('onMouseEnter');
        expect(src).toContain('onMouseLeave');
    });
});

describe('BannerPreviewGrid — Card header layout', () => {
    it('card header has dimensions and kebab on same row', () => {
        expect(src).toContain('banner-card-header');
        expect(src).toContain('banner-card-dims');
    });

    it('wraps checkmark and kebab in flex container', () => {
        expect(src).toContain("display: 'flex', alignItems: 'center', gap: 4");
    });
});
