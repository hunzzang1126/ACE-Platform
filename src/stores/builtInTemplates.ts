// ─────────────────────────────────────────────────
// builtInTemplates — 5 curated starter templates
// ─────────────────────────────────────────────────
// Pre-loaded into templateStore on first launch.
// Each template represents a distinct visual style.
// ─────────────────────────────────────────────────

import type { DesignTemplate } from './templateStore';
import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';
import { DESIGN_TEMPLATES, type GeneratedContent } from '@/services/designTemplates';
import type { DesignStyleGuide } from '@/services/designStyleGuides';
import type { RenderElement } from '@/services/autoDesignService';

// ── Helpers ──

function el(id: string, name: string, x: number, y: number, w: number, h: number): ReturnType<typeof createDefaultConstraints> {
    const c = createDefaultConstraints();
    c.horizontal.offset = x;
    c.vertical.offset = y;
    c.size.width = w;
    c.size.height = h;
    return c;
}

function textEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    content: string; fontSize: number; fontWeight: number; color: string;
    textAlign?: 'left' | 'center' | 'right'; fontFamily?: string; zIndex?: number;
    role?: string;
}): DesignElement {
    return {
        id, name, type: 'text',
        constraints: el(id, name, x, y, w, h),
        opacity: 1, visible: true, locked: false, zIndex: opts.zIndex ?? 1,
        content: opts.content, fontFamily: opts.fontFamily ?? 'Inter',
        fontSize: opts.fontSize, fontWeight: opts.fontWeight, fontStyle: 'normal',
        color: opts.color, textAlign: opts.textAlign ?? 'left',
        lineHeight: 1.2, letterSpacing: 0, autoShrink: true,
        role: opts.role as any,
    };
}

function shapeEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    fill: string; borderRadius?: number; zIndex?: number; opacity?: number;
    gradientStart?: string; gradientEnd?: string; gradientAngle?: number;
    role?: string;
}): DesignElement {
    return {
        id, name, type: 'shape', shapeType: 'rectangle',
        constraints: el(id, name, x, y, w, h),
        opacity: opts.opacity ?? 1, visible: true, locked: false, zIndex: opts.zIndex ?? 0,
        fill: opts.fill, borderRadius: opts.borderRadius ?? 0,
        gradientStart: opts.gradientStart, gradientEnd: opts.gradientEnd,
        gradientAngle: opts.gradientAngle,
        role: opts.role as any,
    };
}

function btnEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    label: string; fontSize: number; color: string; backgroundColor: string;
    borderRadius?: number; zIndex?: number; role?: string;
}): DesignElement {
    return {
        id, name, type: 'button',
        constraints: el(id, name, x, y, w, h),
        opacity: 1, visible: true, locked: false, zIndex: opts.zIndex ?? 3,
        label: opts.label, fontFamily: 'Inter',
        fontSize: opts.fontSize, fontWeight: 700, color: opts.color,
        backgroundColor: opts.backgroundColor, borderRadius: opts.borderRadius ?? 8,
        role: opts.role as any,
    };
}

function makeVariant(id: string, w: number, h: number, bg: string, elements: DesignElement[]): BannerVariant {
    return {
        id,
        preset: { id: `p-${id}`, name: `${w}x${h}`, width: w, height: h, category: 'display' },
        elements,
        backgroundColor: bg,
        overriddenElementIds: [],
        syncLocked: false,
    };
}

// ═══════════════════════════════════════════════════
// TEMPLATE 1: Bold Dark — Tech Product Launch
// ═══════════════════════════════════════════════════
const t1Elements: DesignElement[] = [
    shapeEl('t1-bg', 'Background', 0, 0, 300, 250, {
        fill: '#0a0e1a', zIndex: 0, role: 'background',
        gradientStart: '#0a0e1a', gradientEnd: '#1a1040', gradientAngle: 135,
    }),
    shapeEl('t1-accent', 'Accent Bar', 0, 0, 4, 250, {
        fill: '#8b5cf6', zIndex: 1, role: 'accent',
    }),
    textEl('t1-headline', 'Headline', 20, 18, 260, 80, {
        content: 'THE FUTURE\nIS HERE', fontSize: 38, fontWeight: 800,
        color: '#ffffff', zIndex: 2, role: 'headline',
    }),
    textEl('t1-body', 'Body', 20, 110, 240, 40, {
        content: 'Experience the next generation\nof creative tools.',
        fontSize: 13, fontWeight: 400, color: '#94a3b8', zIndex: 2, role: 'body',
    }),

];

// ═══════════════════════════════════════════════════
// TEMPLATE 2: Warm Gradient — Lifestyle / Fashion
// ═══════════════════════════════════════════════════
const t2Elements: DesignElement[] = [
    shapeEl('t2-bg', 'Background', 0, 0, 728, 90, {
        fill: '#ff6b35', zIndex: 0, role: 'background',
        gradientStart: '#ff6b35', gradientEnd: '#f7931e', gradientAngle: 90,
    }),
    textEl('t2-headline', 'Headline', 30, 12, 450, 36, {
        content: 'SUMMER COLLECTION', fontSize: 32, fontWeight: 800,
        color: '#ffffff', fontFamily: 'Inter', zIndex: 2, role: 'headline',
    }),
    textEl('t2-body', 'Subline', 30, 52, 400, 22, {
        content: 'Up to 50% off · Limited time only', fontSize: 14, fontWeight: 500,
        color: 'rgba(255,255,255,0.85)', zIndex: 2, role: 'body',
    }),

];

// ═══════════════════════════════════════════════════
// TEMPLATE 3: Clean Minimal — SaaS / B2B
// ═══════════════════════════════════════════════════
const t3Elements: DesignElement[] = [
    shapeEl('t3-bg', 'Background', 0, 0, 300, 250, {
        fill: '#ffffff', zIndex: 0, role: 'background',
    }),
    shapeEl('t3-top-bar', 'Top Accent', 0, 0, 300, 4, {
        fill: '#2563eb', zIndex: 1, role: 'accent',
    }),
    textEl('t3-headline', 'Headline', 24, 20, 252, 55, {
        content: 'Simplify your\nworkflow', fontSize: 28, fontWeight: 700,
        color: '#1e293b', zIndex: 2, role: 'headline',
    }),
    textEl('t3-body', 'Body', 24, 95, 252, 40, {
        content: 'Automate repetitive tasks\nand focus on what matters.',
        fontSize: 12, fontWeight: 400, color: '#64748b', zIndex: 2, role: 'body',
    }),

    textEl('t3-badge', 'Badge', 165, 163, 110, 20, {
        content: 'No credit card required', fontSize: 10, fontWeight: 500,
        color: '#94a3b8', zIndex: 2,
    }),
];

// ═══════════════════════════════════════════════════
// TEMPLATE 4: Luxury Gold — Premium / Finance
// ═══════════════════════════════════════════════════
const t4Elements: DesignElement[] = [
    shapeEl('t4-bg', 'Background', 0, 0, 160, 600, {
        fill: '#0c0c0c', zIndex: 0, role: 'background',
    }),
    shapeEl('t4-gold-line', 'Gold Line', 79, 30, 1, 540, {
        fill: '#c9a84c', zIndex: 1, opacity: 0.4, role: 'accent',
    }),
    textEl('t4-headline', 'Headline', 10, 150, 140, 150, {
        content: 'ELEVATE\nYOUR\nPORTFOLIO', fontSize: 32, fontWeight: 700,
        color: '#c9a84c', fontFamily: 'Inter', textAlign: 'center', zIndex: 2, role: 'headline',
    }),
    shapeEl('t4-divider', 'Divider', 55, 320, 50, 1, {
        fill: '#c9a84c', zIndex: 1,
    }),
    textEl('t4-body', 'Body', 15, 340, 130, 70, {
        content: 'Premium wealth\nmanagement for investors.', 
        fontSize: 13, fontWeight: 400, color: '#888888', textAlign: 'center', zIndex: 2, role: 'body',
    }),

];

// ═══════════════════════════════════════════════════
// TEMPLATE 5: Vibrant — Social Media / Event
// ═══════════════════════════════════════════════════
const t5Elements: DesignElement[] = [
    shapeEl('t5-bg', 'Background', 0, 0, 1080, 1080, {
        fill: '#1a0533', zIndex: 0, role: 'background',
        gradientStart: '#1a0533', gradientEnd: '#0f172a', gradientAngle: 180,
    }),
    shapeEl('t5-glow', 'Glow Circle', 340, 200, 400, 400, {
        fill: '#7c3aed', borderRadius: 999, zIndex: 1, opacity: 0.15,
    }),
    textEl('t5-date', 'Date', 80, 120, 400, 30, {
        content: 'MARCH 28, 2026', fontSize: 14, fontWeight: 600,
        color: '#c4b5fd', zIndex: 3,
    }),
    textEl('t5-headline', 'Headline', 80, 300, 920, 270, {
        content: 'DESIGN\nSUMMIT', fontSize: 110, fontWeight: 900,
        color: '#ffffff', textAlign: 'left', zIndex: 3, role: 'headline',
    }),
    textEl('t5-subline', 'Subline', 80, 600, 800, 50, {
        content: 'Where creativity meets technology', fontSize: 36, fontWeight: 400,
        color: '#a78bfa', zIndex: 3, role: 'body',
    }),
    shapeEl('t5-line', 'Accent Line', 80, 680, 80, 3, {
        fill: '#7c3aed', zIndex: 2, role: 'accent',
    }),
    textEl('t5-location', 'Location', 80, 710, 500, 30, {
        content: 'San Francisco · Moscone Center', fontSize: 20, fontWeight: 500,
        color: '#94a3b8', zIndex: 3,
    }),

];

// ── Build Template Objects ──

function makeTemplate(
    id: string, name: string, desc: string, category: 'display' | 'social',
    tags: string[], w: number, h: number, bg: string, elements: DesignElement[],
): DesignTemplate {
    const variant = makeVariant(`v-${id}`, w, h, bg, elements);
    return {
        id,
        name,
        description: desc,
        category,
        tags,
        thumbnailSrc: '', // Generated at render time
        width: w,
        height: h,
        variantSnapshot: JSON.stringify(variant),
        usageCount: 0,
        isBuiltIn: true,
        isFavorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };
}

// ══════════════════════════════════════════════════════
// AI Layout Template Bridge — converts designTemplates.ts
// build() output → DesignElement[] for sidebar preview
// ★ MUST be defined BEFORE BUILT_IN_TEMPLATES to avoid 
//   "cannot access before initialization" errors.
// ══════════════════════════════════════════════════════
const PREVIEW_GUIDE: DesignStyleGuide = {
    id: 'preview', name: 'Preview', description: '', keywords: [],
    colors: {
        background: '#0f172a', surface: '#1e293b', border: '#334155',
        foreground: '#f8fafc', secondary: '#94a3b8', tertiary: '#64748b',
        muted: '#475569', accent: '#8b5cf6', accentForeground: '#ffffff',
        error: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
        gradientStart: '#0f172a', gradientEnd: '#1e1b4b', gradientAngle: 135,
    },
    typography: {
        primaryFont: 'Inter', secondaryFont: 'Inter',
        scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
        weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
        letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
    radius: 6,
};

const PREVIEW_CONTENT: GeneratedContent = {
    headline: 'Your Headline Here',
    subheadline: 'Supporting text for your creative',
    cta: 'Get Started',
    tag: 'NEW',
};

/** Sizes to generate previews for each AI template */
const AI_TEMPLATE_SIZE_MAP: Record<string, { w: number; h: number; category: 'display' | 'social' }> = {
    'centered-stack': { w: 300, h: 250, category: 'display' },
    'left-aligned-card': { w: 300, h: 250, category: 'display' },
    'bold-headline': { w: 300, h: 250, category: 'display' },
    'split-horizontal': { w: 728, h: 90, category: 'display' },
    'diagonal-split': { w: 300, h: 250, category: 'display' },
    'top-down-cascade': { w: 300, h: 250, category: 'display' },
    'right-aligned': { w: 300, h: 250, category: 'display' },
    'minimal-clean': { w: 300, h: 250, category: 'display' },
    'full-bleed-hero': { w: 1080, h: 1080, category: 'social' },
    'badge-focus': { w: 300, h: 250, category: 'display' },
    'horizontal-strip': { w: 728, h: 90, category: 'display' },
    'tower': { w: 160, h: 600, category: 'display' },
};

function renderElementToDesignElement(
    re: RenderElement,
    idx: number,
    templateId: string,
): DesignElement {
    const id = `${templateId}-el-${idx}`;
    const name = re.name || `element_${idx}`;
    const constraints = createDefaultConstraints();
    constraints.horizontal.offset = Math.round(re.x);
    constraints.vertical.offset = Math.round(re.y);
    constraints.size.width = Math.round(re.w);
    constraints.size.height = Math.round(re.h);

    if (re.type === 'text') {
        return {
            id, name, type: 'text',
            constraints,
            opacity: 1, visible: true, locked: false, zIndex: idx,
            content: re.content || '', fontFamily: 'Inter',
            fontSize: re.font_size || 16,
            fontWeight: parseInt(re.font_weight || '400', 10) || 400,
            fontStyle: 'normal',
            color: re.color_hex || '#ffffff',
            textAlign: (re.text_align as 'left' | 'center' | 'right') || 'left',
            lineHeight: re.line_height || 1.2,
            letterSpacing: re.letter_spacing || 0,
            autoShrink: true,
        };
    }

    if (re.type === 'rounded_rect' && re.radius) {
        const fill = (re.r != null && re.g != null && re.b != null)
            ? `#${Math.round(re.r * 255).toString(16).padStart(2, '0')}${Math.round(re.g * 255).toString(16).padStart(2, '0')}${Math.round(re.b * 255).toString(16).padStart(2, '0')}`
            : '#808080';
        return {
            id, name, type: 'shape', shapeType: 'rectangle',
            constraints,
            opacity: re.a ?? 1, visible: true, locked: false, zIndex: idx,
            fill,
            borderRadius: re.radius,
        };
    }

    const gradientStart = re.gradient_start_hex;
    const gradientEnd = re.gradient_end_hex;
    const fill = (re.r != null && re.g != null && re.b != null)
        ? `#${Math.round(re.r * 255).toString(16).padStart(2, '0')}${Math.round(re.g * 255).toString(16).padStart(2, '0')}${Math.round(re.b * 255).toString(16).padStart(2, '0')}`
        : gradientStart || '#808080';

    return {
        id, name, type: 'shape', shapeType: 'rectangle',
        constraints,
        opacity: re.a ?? 1, visible: true, locked: false, zIndex: idx,
        fill,
        borderRadius: re.radius ?? 0,
        gradientStart, gradientEnd,
        gradientAngle: re.gradient_angle,
        role: name.includes('background') ? 'background' as any : undefined,
    };
}

function generateAiLayoutTemplates(): DesignTemplate[] {
    const result: DesignTemplate[] = [];

    for (const tmpl of DESIGN_TEMPLATES) {
        const sizeSpec = AI_TEMPLATE_SIZE_MAP[tmpl.id];
        if (!sizeSpec) continue;

        const { w, h, category } = sizeSpec;
        const renderElements = tmpl.build(w, h, PREVIEW_GUIDE, PREVIEW_CONTENT);

        const designElements = renderElements
            .filter((re): re is Exclude<typeof re, number> => typeof re !== 'number')
            .map((re, idx) => renderElementToDesignElement(re, idx, `ai-${tmpl.id}`));

        const bgEl = designElements.find(e => e.name?.toLowerCase().includes('background'));
        const bgColor = (bgEl as any)?.gradientStart || (bgEl as any)?.fill || '#0f172a';

        result.push(makeTemplate(
            `ai-${tmpl.id}`,
            tmpl.name,
            tmpl.description,
            category,
            ['ai-layout', 'adaptive', ...tmpl.aspectRatios],
            w, h, bgColor, designElements,
        ));
    }

    return result;
}

// ── Final Template Array ──

export const BUILT_IN_TEMPLATES: DesignTemplate[] = [
    makeTemplate(
        'builtin-bold-dark', 'Bold Dark', 'High-contrast tech product launch with purple accent',
        'display', ['tech', 'product', 'dark', 'modern', 'launch'],
        300, 250, '#0a0e1a', t1Elements,
    ),
    makeTemplate(
        'builtin-warm-gradient', 'Warm Gradient', 'Lifestyle leaderboard with warm orange tones',
        'display', ['fashion', 'lifestyle', 'sale', 'warm', 'leaderboard'],
        728, 90, '#ff6b35', t2Elements,
    ),
    makeTemplate(
        'builtin-clean-minimal', 'Clean Minimal', 'Clean white SaaS/B2B medium rectangle',
        'display', ['saas', 'b2b', 'clean', 'minimal', 'white', 'professional'],
        300, 250, '#ffffff', t3Elements,
    ),
    makeTemplate(
        'builtin-luxury-gold', 'Luxury Gold', 'Premium skyscraper with black and gold palette',
        'display', ['luxury', 'finance', 'premium', 'gold', 'elegant', 'skyscraper'],
        160, 600, '#0c0c0c', t4Elements,
    ),
    makeTemplate(
        'builtin-vibrant-event', 'Vibrant Event', 'Bold social media event poster with purple glow',
        'social', ['event', 'social', 'conference', 'vibrant', 'purple', 'poster'],
        1080, 1080, '#1a0533', t5Elements,
    ),
    // ★ AI Layout Templates — unified from designTemplates.ts
    ...generateAiLayoutTemplates(),
];
