// ─────────────────────────────────────────────────
// ★ OVERLAP STRESS TEST — Exhaustive overlap detection
// ─────────────────────────────────────────────────
// Tests ALL 10 variants × ALL 10 ad sizes × 5 content combos = 500 scenarios.
// This catches the "random overlap" bug that only manifests with specific
// variant + size + content length combinations.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildDesignElements } from './layoutComposer';
import type { DesignContent, DesignPalette } from './layoutComposer';
import type { LayoutVariant } from './layoutRules';

const PALETTE: DesignPalette = {
    gradientStart: '#1a1a2e', gradientEnd: '#16213e', accent: '#e94560',
    foreground: '#FFFFFF', background: '#1a1a2e',
    typography: { primaryFont: 'Inter', secondaryFont: 'DM Sans' },
};

const ALL_VARIANTS: LayoutVariant[] = [
    'centered', 'left-hero', 'offset-right', 'top-heavy', 'bottom-stack',
    'split-left', 'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
];

const ALL_SIZES: [number, number, string][] = [
    [300, 250, 'Medium Rectangle'], [728, 90, 'Leaderboard'],
    [160, 600, 'Wide Skyscraper'], [300, 600, 'Half Page'],
    [336, 280, 'Large Rectangle'], [970, 250, 'Billboard'],
    [250, 250, 'Square'], [1080, 1080, 'Social Square'],
    [1200, 628, 'Social Landscape'], [1080, 1920, 'Story'],
];

const CONTENT_COMBOS: { name: string; content: DesignContent }[] = [
    { name: 'full-english', content: { headline: 'Premium Summer Collection Now Available', subheadline: 'Up to 50% off everything in store', cta: 'Shop Now', tag: 'Limited Time' } },
    { name: 'short', content: { headline: 'Sale', subheadline: 'Today only', cta: 'Buy' } },
    { name: 'long-headline', content: { headline: 'The Most Incredible Premium Luxury Fashion Collection You Have Ever Seen This Season', subheadline: 'Discover the elegance', cta: 'Explore Now', tag: 'Exclusive' } },
    { name: 'korean', content: { headline: 'Galaxy의 새로운 차원을 경험하세요', subheadline: '최첨단 기술과 혁신적인 디자인의 만남', cta: '지금 사전예약', tag: '신제품' } },
    { name: 'headline-only', content: { headline: 'Bold Statement Design' } },
];

function checkOverlap(
    elements: any[], w: number, h: number,
    variant: string, contentName: string, sizeName: string,
): void {
    const textEls = elements.filter(el =>
        el.type === 'text' || el.name === 'cta_button'
    );

    for (let i = 0; i < textEls.length; i++) {
        for (let j = i + 1; j < textEls.length; j++) {
            const a = textEls[i]!, b = textEls[j]!;
            // cta_label + cta_button intentionally overlap (label is inside button)
            if ((a.name === 'cta_button' && b.name === 'cta_label') ||
                (a.name === 'cta_label' && b.name === 'cta_button')) continue;

            const aTop = a.y ?? 0, aBot = aTop + (a.h ?? 0);
            const bTop = b.y ?? 0, bBot = bTop + (b.h ?? 0);
            const vOverlap = aTop < bBot && bTop < aBot;

            if (vOverlap) {
                const aLeft = a.x ?? 0, aRight = aLeft + (a.w ?? 0);
                const bLeft = b.x ?? 0, bRight = bLeft + (b.w ?? 0);
                const hOverlap = aLeft < bRight && bLeft < aRight;

                expect(
                    hOverlap && vOverlap,
                    `OVERLAP in ${sizeName} ${w}x${h} [${variant}] "${contentName}": ` +
                    `"${a.name}" (y=${aTop}, h=${a.h}) overlaps "${b.name}" (y=${bTop}, h=${b.h})`
                ).toBe(false);
            }
        }
    }
}

// ── Exhaustive: ALL variants × ALL sizes × ALL content combos ──
describe('★ OVERLAP STRESS TEST: Zero overlap guarantee', () => {
    for (const variant of ALL_VARIANTS) {
        describe(`variant: ${variant}`, () => {
            for (const [w, h, sizeName] of ALL_SIZES) {
                for (const { name: contentName, content } of CONTENT_COMBOS) {
                    it(`${sizeName} (${w}x${h}) — ${contentName}`, () => {
                        const { elements } = buildDesignElements(content, PALETTE, w, h, false, variant);
                        checkOverlap(elements, w, h, variant, contentName, sizeName);
                    });
                }
            }
        });
    }
});

// ── Photo background variants (overlay adds complexity) ──
describe('★ OVERLAP STRESS TEST: Photo background (all variants)', () => {
    const content: DesignContent = {
        headline: 'Premium Lifestyle Redefined Today',
        subheadline: 'Experience luxury like never before in history',
        cta: 'Shop Now', tag: 'Sale',
    };
    for (const variant of ALL_VARIANTS) {
        for (const [w, h, sizeName] of ALL_SIZES) {
            it(`${sizeName} (${w}x${h}) — ${variant} with bg image`, () => {
                const { elements } = buildDesignElements(content, PALETTE, w, h, true, variant);
                checkOverlap(elements, w, h, variant, 'photo-bg', sizeName);
            });
        }
    }
});
