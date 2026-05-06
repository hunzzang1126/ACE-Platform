// ─────────────────────────────────────────────────
// ★ REGRESSION: CJK Text Overlap Guard (v715)
// ─────────────────────────────────────────────────
// Catches the bug where Korean/Japanese/Chinese headlines
// cause text overlap because:
// 1. CJK chars are wider than estimated (1.0em → 1.1em)
// 2. Fabric.js wraps CJK per-character, not per-word
// 3. CJK vertical padding was insufficient
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildDesignElements } from './layoutComposer';
import type { DesignContent, DesignPalette } from './layoutComposer';

const PALETTE: DesignPalette = {
    gradientStart: '#1a1a2e',
    gradientEnd: '#16213e',
    accent: '#e94560',
    foreground: '#FFFFFF',
    background: '#1a1a2e',
    typography: { primaryFont: 'Inter', secondaryFont: 'Inter' },
};

const VARIANTS = [
    'centered', 'left-hero', 'offset-right', 'top-heavy', 'bottom-stack',
    'split-left', 'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
] as const;

const AD_SIZES: [number, number, string][] = [
    [300, 250, 'Medium Rectangle'],
    [728, 90, 'Leaderboard'],
    [160, 600, 'Wide Skyscraper'],
    [1080, 1080, 'Social Square'],
    [1200, 628, 'Social Landscape'],
    [1080, 1920, 'Story'],
];

// ── CJK Content Fixtures ─────────────────────────

const KOREAN_CONTENT: DesignContent = {
    headline: '마요르카의 숨겨진 지중해 파라다이스',
    subheadline: '역사와 자연이 만나는 발레아레스 섬의 매력을 발견하세요',
    cta: '여행 예약하기',
    tag: '한정 특가',
};

const JAPANESE_CONTENT: DesignContent = {
    headline: '東京の隠れた美食スポット',
    subheadline: '知られざる名店を探しに行こう',
    cta: '今すぐ予約',
    tag: '期間限定',
};

const LONG_KOREAN_HEADLINE: DesignContent = {
    headline: '대한민국 최고의 여름 휴가 여행지 추천 베스트 열곳을 지금 확인하세요',
    subheadline: '가족과 함께 떠나는 특별한 여행',
    cta: '자세히 보기',
};

// ── Tests ─────────────────────────────────────────

describe('★ REGRESSION v715: CJK text overlap prevention', () => {
    describe('Korean content: no overlap across sizes and variants', () => {
        for (const [w, h, name] of AD_SIZES) {
            for (const variant of VARIANTS) {
                it(`no overlap in ${name} (${w}x${h}) — ${variant} [Korean]`, () => {
                    const { elements } = buildDesignElements(KOREAN_CONTENT, PALETTE, w, h, false, variant);
                    assertNoOverlap(elements, `${name}/${variant}`);
                });
            }
        }
    });

    describe('Japanese content: no overlap in key sizes', () => {
        for (const [w, h, name] of AD_SIZES.slice(0, 3)) {
            it(`no overlap in ${name} (${w}x${h}) [Japanese]`, () => {
                const { elements } = buildDesignElements(JAPANESE_CONTENT, PALETTE, w, h, false);
                assertNoOverlap(elements, `${name}/Japanese`);
            });
        }
    });

    describe('Long Korean headline: no overflow', () => {
        for (const [w, h, name] of AD_SIZES) {
            it(`fits within ${name} (${w}x${h})`, () => {
                const { elements } = buildDesignElements(LONG_KOREAN_HEADLINE, PALETTE, w, h, false);
                for (const el of elements) {
                    const n = el.name ?? '';
                    if (n.startsWith('deco_') || n === 'logo_area' || n === 'info_bar') continue;
                    expect(
                        (el.y ?? 0) + (el.h ?? 0),
                        `${el.name} overflows bottom (y=${el.y}, h=${el.h})`
                    ).toBeLessThanOrEqual(h + 2);
                }
            });
        }
    });

    describe('CJK height estimation accuracy', () => {
        it('Korean headline height accounts for multi-line wrapping', () => {
            const { elements } = buildDesignElements(KOREAN_CONTENT, PALETTE, 1080, 1080, false);
            const headline = elements.find(el => el.name === 'headline')!;
            // Korean text "마요르카의 숨겨진 지중해 파라다이스" (17 chars) at any reasonable
            // font size on 1080px canvas should wrap to 2+ lines.
            // Height must reflect this: h > fontSize * lineHeight * 1 (at least 2 lines)
            expect(headline.h).toBeGreaterThan(headline.font_size! * 1.5);
        });

        it('★ REGRESSION: Korean headline font is capped (not oversized)', () => {
            // The bug: CJK headlines got fontSize so large that they overflowed
            // the canvas and overlapped with subheadline.
            const { elements } = buildDesignElements(KOREAN_CONTENT, PALETTE, 1080, 1080, false);
            const headline = elements.find(el => el.name === 'headline')!;
            // CJK budget = 0.18 of canvas height → max font ≈ 1080*0.18/1.2 ≈ 162
            const maxExpected = Math.floor(1080 * 0.20 / 1.1); // generous ceiling
            expect(headline.font_size).toBeLessThanOrEqual(maxExpected);
        });

        it('CJK padding increases height proportionally to line count', () => {
            // Single-char Korean headline vs long Korean headline
            const short: DesignContent = { headline: '안녕' };
            const long: DesignContent = { headline: '대한민국 최고의 여름 휴가 여행지 추천 베스트' };
            const { elements: shortEls } = buildDesignElements(short, PALETTE, 300, 250, false);
            const { elements: longEls } = buildDesignElements(long, PALETTE, 300, 250, false);
            const shortH = shortEls.find(el => el.name === 'headline')!;
            const longH = longEls.find(el => el.name === 'headline')!;
            // Long text should have greater height
            expect(longH.h).toBeGreaterThan(shortH.h!);
        });
    });

    describe('CJK with background image: no overlap', () => {
        it('Korean content on bg image maintains spacing', () => {
            for (const [w, h, name] of AD_SIZES.slice(0, 3)) {
                const { elements } = buildDesignElements(KOREAN_CONTENT, PALETTE, w, h, true);
                assertNoOverlap(elements, `${name}/bgImage/Korean`);
            }
        });
    });
});

// ── Shared overlap assertion ─────────────────────

function assertNoOverlap(elements: any[], context: string): void {
    const contentEls = elements.filter(
        (el: any) => el.type === 'text' || el.name === 'cta_button'
    );

    for (let i = 0; i < contentEls.length; i++) {
        for (let j = i + 1; j < contentEls.length; j++) {
            const a = contentEls[i]!;
            const b = contentEls[j]!;
            // cta_label + cta_button intentionally overlap
            if ((a.name === 'cta_button' && b.name === 'cta_label') ||
                (a.name === 'cta_label' && b.name === 'cta_button')) continue;
            // cta_button_inner intentionally overlaps cta_button (outlined style)
            if (a.name === 'cta_button_inner' || b.name === 'cta_button_inner') continue;

            const aTop = a.y ?? 0, aBot = aTop + (a.h ?? 0);
            const bTop = b.y ?? 0, bBot = bTop + (b.h ?? 0);
            const vOverlap = aTop < bBot && bTop < aBot;

            if (vOverlap) {
                const aLeft = a.x ?? 0, aRight = aLeft + (a.w ?? 0);
                const bLeft = b.x ?? 0, bRight = bLeft + (b.w ?? 0);
                const hOverlap = aLeft < bRight && bLeft < aRight;
                expect(
                    hOverlap && vOverlap,
                    `[${context}] "${a.name}" overlaps "${b.name}" (a: y=${aTop} h=${a.h}, b: y=${bTop} h=${b.h})`
                ).toBe(false);
            }
        }
    }
}
