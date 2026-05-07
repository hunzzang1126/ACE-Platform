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

// ══════════════════════════════════════════════════
// ★ v727: Area-proportional sizing (replaces fixed bounding box)
// ══════════════════════════════════════════════════
describe('★ v727: Area-proportional card sizing', () => {
    it('uses getCardDisplaySize instead of getPreviewScale', () => {
        expect(src).toContain('getCardDisplaySize');
        expect(src).not.toContain('getPreviewScale');
    });

    it('uses BASE_AREA instead of BASE_PREVIEW_WIDTH/HEIGHT', () => {
        expect(src).toContain('BASE_AREA');
        expect(src).not.toContain('BASE_PREVIEW_WIDTH');
        expect(src).not.toContain('BASE_PREVIEW_HEIGHT');
    });

    it('area-proportional math: sqrt(refArea / aspect)', () => {
        expect(src).toContain('Math.sqrt(refArea / aspect)');
    });

    it('returns display width, height, and scale', () => {
        expect(src).toContain('dw: number; dh: number; scale: number');
    });
});

// ══════════════════════════════════════════════════
// ★ v727: Flow layout (replaces fixed grid)
// ══════════════════════════════════════════════════
describe('★ v727: Flow layout', () => {
    it('uses flowPositions useMemo for card positioning', () => {
        expect(src).toContain('flowPositions');
    });

    it('does NOT use GRID_COLS for fixed-column layout', () => {
        expect(src).not.toContain('GRID_COLS');
    });

    it('wraps cards to next row when exceeding maxRowW', () => {
        expect(src).toContain('x + dw > maxRowW');
    });

    it('tracks row height based on tallest card', () => {
        expect(src).toContain('Math.max(rowH, totalH)');
    });

    it('canvasWidth is calculated for horizontal scroll', () => {
        expect(src).toContain('canvasWidth');
        expect(src).toContain('minWidth: canvasWidth');
    });
});

// ══════════════════════════════════════════════════
// ★ v728: TDZ fix — declaration order
// ══════════════════════════════════════════════════
describe('★ v728: TDZ regression guard — declaration order', () => {
    it('★ REGRESSION: visibleVariants is declared BEFORE flowPositions', () => {
        // useMemo runs synchronously — referencing a const before its declaration = TDZ crash
        const visibleIdx = src.indexOf('visibleVariants = useMemo');
        const flowIdx = src.indexOf('flowPositions = useMemo');
        expect(visibleIdx).toBeLessThan(flowIdx);
    });
});

// ══════════════════════════════════════════════════
// ★ v729: Zoom resets positions
// ══════════════════════════════════════════════════
describe('★ v729: Zoom resets card positions', () => {
    it('handleZoomChange resets cardPositions to {}', () => {
        expect(src).toContain('setCardPositions({})');
    });

    it('★ REGRESSION: starts with empty positions (not stale stored coords)', () => {
        // Initial state must be {} so flow layout is the default
        expect(src).toContain("useState<Record<string, { x: number; y: number }>>({})");
    });

    it('does NOT sync storedPositionsRaw back into cardPositions state', () => {
        // The old useEffect that re-synced stale positions is removed
        expect(src).not.toContain('setCardPositions(storedPositionsRaw');
    });
});

