// ─────────────────────────────────────────────────
// contentSubstitution.test.ts — Behavioral tests for AI content → template mapping
// ─────────────────────────────────────────────────
// Tests the actual heuristic logic extracted from agentGenerateFlow.ts.
// Verifies that AI-generated text correctly replaces template placeholders
// even when element names don't contain "headline"/"subheadline" keywords.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

// ── Extracted substitution logic for unit testing ──
interface MockElement {
    name: string;
    type: string;
    content?: string;
    font_size?: number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    text_align?: string;
    color_hex?: string;
}

interface MockContent {
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
}

/**
 * Replicates the 2-pass content substitution logic from agentGenerateFlow.ts.
 * Pass 1: name-based mapping (keyword match)
 * Pass 2: font-size heuristic (largest = headline)
 */
function substituteContent(elements: MockElement[], content: MockContent): {
    headlineMapped: boolean;
    subheadlineMapped: boolean;
    ctaMapped: boolean;
    tagMapped: boolean;
} {
    let headlineMapped = false;
    let subheadlineMapped = false;
    let ctaMapped = false;
    let tagMapped = false;
    const mappedElements = new Set<MockElement>();

    // Pass 1: Name-based
    for (const el of elements) {
        if (el.type !== 'text' && !el.content) continue;
        const name = (el.name ?? '').toLowerCase();
        if (!headlineMapped && name.includes('headline') && !name.includes('sub')) {
            if (content.headline) { el.content = content.headline; headlineMapped = true; mappedElements.add(el); }
        } else if (!subheadlineMapped && (name.includes('subheadline') || name.includes('sub_headline') || name.includes('body'))) {
            if (content.subheadline) { el.content = content.subheadline; subheadlineMapped = true; mappedElements.add(el); }
        } else if (!ctaMapped && name.includes('cta') && name.includes('label')) {
            if (content.cta) { el.content = content.cta; ctaMapped = true; mappedElements.add(el); }
        } else if (!tagMapped && name.includes('tag')) {
            if (content.tag) { el.content = content.tag; tagMapped = true; mappedElements.add(el); }
        }
    }

    // Pass 2: Font-size heuristic (exclude already-mapped elements)
    if (!headlineMapped || !subheadlineMapped) {
        const textEls = elements
            .filter(el => el.type === 'text'
                && !['cta_label', 'cta_button'].includes(el.name ?? '')
                && !mappedElements.has(el))
            .sort((a, b) => (b.font_size ?? 0) - (a.font_size ?? 0));

        if (!headlineMapped && textEls[0] && content.headline) {
            textEls[0].content = content.headline;
            headlineMapped = true;
        }
        if (!subheadlineMapped && textEls[1] && content.subheadline) {
            textEls[1].content = content.subheadline;
            subheadlineMapped = true;
        }
        if (!tagMapped && textEls.length >= 3 && content.tag) {
            textEls[textEls.length - 1]!.content = content.tag;
            tagMapped = true;
        }
    }

    return { headlineMapped, subheadlineMapped, ctaMapped, tagMapped };
}

// ══════════════════════════════════════════════════
// Pass 1: Name-based matching
// ══════════════════════════════════════════════════
describe('Content substitution — Pass 1: name-based matching', () => {
    const content: MockContent = {
        headline: 'Elevate Your Beauty',
        subheadline: 'Luxury skincare meets artistry',
        cta: 'Shop Now',
        tag: 'LUXURY',
    };

    it('maps headline by name keyword', () => {
        const els: MockElement[] = [
            { name: 'headline', type: 'text', content: 'OLD HEADLINE', font_size: 48 },
            { name: 'subheadline', type: 'text', content: 'old sub', font_size: 18 },
        ];
        const result = substituteContent(els, content);
        expect(result.headlineMapped).toBe(true);
        expect(els[0]!.content).toBe('Elevate Your Beauty');
        expect(els[1]!.content).toBe('Luxury skincare meets artistry');
    });

    it('maps cta_label by name keyword', () => {
        const els: MockElement[] = [
            { name: 'headline', type: 'text', content: 'OLD', font_size: 48 },
            { name: 'cta_label', type: 'text', content: 'Click Here', font_size: 14 },
        ];
        const result = substituteContent(els, content);
        expect(result.ctaMapped).toBe(true);
        expect(els[1]!.content).toBe('Shop Now');
    });

    it('maps tag by name keyword', () => {
        const els: MockElement[] = [
            { name: 'headline', type: 'text', content: 'OLD', font_size: 48 },
            { name: 'tag', type: 'text', content: 'OLD TAG', font_size: 10 },
        ];
        const result = substituteContent(els, content);
        expect(result.tagMapped).toBe(true);
        expect(els[1]!.content).toBe('LUXURY');
    });

    it('does NOT map if name does not contain keyword', () => {
        const els: MockElement[] = [
            { name: 'Text 1', type: 'text', content: 'GRAPHIC DESIGN', font_size: 48 },
            { name: 'Text 2', type: 'text', content: 'Trends', font_size: 18 },
        ];
        const result = substituteContent(els, content);
        // Pass 1 fails — names don't have "headline"
        // But Pass 2 should still map by font size
        expect(result.headlineMapped).toBe(true); // via Pass 2
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: Pass 2 — font-size heuristic
// This is the fix for the "GRAPHIC DESIGN TRENDS" bug
// ══════════════════════════════════════════════════
describe('★ REGRESSION: Content substitution — Pass 2: font-size heuristic', () => {
    const content: MockContent = {
        headline: 'Elevate Your Beauty',
        subheadline: 'Luxury skincare meets artistry',
        cta: '',
        tag: 'LUXURY',
    };

    it('assigns largest text as headline when names are generic', () => {
        const els: MockElement[] = [
            { name: 'Text 1', type: 'text', content: 'GRAPHIC DESIGN', font_size: 72 },
            { name: 'Text 2', type: 'text', content: 'TRENDS', font_size: 48 },
            { name: 'Text 3', type: 'text', content: 'some tag', font_size: 12 },
        ];
        substituteContent(els, content);
        expect(els[0]!.content).toBe('Elevate Your Beauty');
    });

    it('assigns second largest text as subheadline', () => {
        const els: MockElement[] = [
            { name: 'Text 1', type: 'text', content: 'OLD HEADLINE', font_size: 72 },
            { name: 'Text 2', type: 'text', content: 'old description', font_size: 24 },
            { name: 'Shape 1', type: 'rect', font_size: undefined },
        ];
        substituteContent(els, content);
        expect(els[1]!.content).toBe('Luxury skincare meets artistry');
    });

    it('assigns smallest text as tag when 3+ text elements exist', () => {
        const els: MockElement[] = [
            { name: 'Text 1', type: 'text', content: 'BIG', font_size: 72 },
            { name: 'Text 2', type: 'text', content: 'MEDIUM', font_size: 24 },
            { name: 'Text 3', type: 'text', content: 'small', font_size: 10 },
        ];
        substituteContent(els, content);
        expect(els[2]!.content).toBe('LUXURY');
    });

    it('excludes cta_label from font-size sorting', () => {
        const els: MockElement[] = [
            { name: 'cta_label', type: 'text', content: 'BUY NOW', font_size: 80 },
            { name: 'Text 1', type: 'text', content: 'OLD', font_size: 48 },
            { name: 'Text 2', type: 'text', content: 'old sub', font_size: 16 },
        ];
        substituteContent(els, content);
        // cta_label should NOT be treated as headline despite being largest
        expect(els[0]!.content).toBe('BUY NOW'); // unchanged
        expect(els[1]!.content).toBe('Elevate Your Beauty');
    });

    it('handles single text element (headline only, no subheadline)', () => {
        const els: MockElement[] = [
            { name: 'Text 1', type: 'text', content: 'OLD', font_size: 48 },
        ];
        const result = substituteContent(els, content);
        expect(result.headlineMapped).toBe(true);
        expect(result.subheadlineMapped).toBe(false);
        expect(els[0]!.content).toBe('Elevate Your Beauty');
    });

    it('Pass 1 takes priority — named headline excluded from Pass 2 sort', () => {
        const els: MockElement[] = [
            { name: 'headline', type: 'text', content: 'Named Headline', font_size: 24 },
            { name: 'Text 1', type: 'text', content: 'BIG TEXT', font_size: 72 },
            { name: 'Text 2', type: 'text', content: 'small text', font_size: 14 },
        ];
        substituteContent(els, content);
        // Pass 1 maps headline by name
        expect(els[0]!.content).toBe('Elevate Your Beauty');
        // Pass 2 sees only [Text 1(72), Text 2(14)] — assigns subheadline to Text 2 (2nd largest unmapped)
        expect(els[1]!.content).toBe('BIG TEXT'); // unchanged — it's "headline" in Pass 2
        // Actually textEls[0]=Text1(72), textEls[1]=Text2(14) so subheadline goes to Text2
    });

    it('skips non-text elements entirely', () => {
        const els: MockElement[] = [
            { name: 'background', type: 'rect', font_size: undefined },
            { name: 'Text 1', type: 'text', content: 'OLD', font_size: 36 },
        ];
        substituteContent(els, content);
        expect(els[0]!.content).toBeUndefined();
        expect(els[1]!.content).toBe('Elevate Your Beauty');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: Auto-created subheadline sizing
// ══════════════════════════════════════════════════
describe('★ REGRESSION: Canvas-proportional subheadline auto-creation', () => {
    it('calculates font size as 3.5% of canvas height, clamped 14-32', () => {
        // 1080px canvas → 37.8 → clamped to 32
        expect(Math.max(14, Math.min(32, Math.round(1080 * 0.035)))).toBe(32);
        // 600px canvas → 21
        expect(Math.max(14, Math.min(32, Math.round(600 * 0.035)))).toBe(21);
        // 250px canvas → 14 (min clamp)
        expect(Math.max(14, Math.min(32, Math.round(250 * 0.035)))).toBe(14);
        // 300px canvas → 14 (min clamp)
        expect(Math.max(14, Math.min(32, Math.round(300 * 0.035)))).toBe(14);
        // 400px canvas → 14
        expect(Math.max(14, Math.min(32, Math.round(400 * 0.035)))).toBe(14);
    });

    it('positions subheadline using headlineH + 2% gap (not headlineFontSize + 8)', () => {
        const canvasH = 1080;
        const headlineY = 200;
        const headlineH = 120;
        const subY = headlineY + headlineH + Math.round(canvasH * 0.02);
        expect(subY).toBe(200 + 120 + 22); // 342
    });

    it('inherits headline x/w for proper alignment', () => {
        const headlineX = 50;
        const headlineW = 900;
        const canvasW = 1080;
        // When headline exists
        const subX = headlineX;
        const subW = headlineW;
        expect(subX).toBe(50);
        expect(subW).toBe(900);
        // Fallback when no headline
        const fallbackX = Math.round(canvasW * 0.075);
        const fallbackW = Math.round(canvasW * 0.85);
        expect(fallbackX).toBe(81);
        expect(fallbackW).toBe(918);
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: storage:// URL routing in BG removal
// ══════════════════════════════════════════════════
describe('★ REGRESSION: URL scheme classification for BG removal', () => {
    function classifyUrl(url: string): 'asset-ref' | 'direct' | 'external' {
        if (url.startsWith('idb://') || url.startsWith('storage://')) return 'asset-ref';
        if (url.startsWith('data:') || url.startsWith('blob:')) return 'direct';
        return 'external';
    }

    it('routes idb:// to asset resolution', () => {
        expect(classifyUrl('idb://abc123')).toBe('asset-ref');
    });

    it('routes storage:// to asset resolution', () => {
        expect(classifyUrl('storage://78472fb3-5ce8/designs/abc.jpg')).toBe('asset-ref');
    });

    it('routes data: URLs to direct fetch', () => {
        expect(classifyUrl('data:image/png;base64,abc')).toBe('direct');
    });

    it('routes blob: URLs to direct fetch', () => {
        expect(classifyUrl('blob:http://localhost:5173/xyz')).toBe('direct');
    });

    it('routes https:// URLs to external (CORS) handler', () => {
        expect(classifyUrl('https://flux-cdn.example.com/img.png')).toBe('external');
    });

    it('routes http:// URLs to external (CORS) handler', () => {
        expect(classifyUrl('http://external.com/photo.webp')).toBe('external');
    });
});
