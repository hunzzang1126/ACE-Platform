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
// TEMPLATE 1: Bold Dark — Tech Product Launch (1080x1080)
// ═══════════════════════════════════════════════════
const t1Elements: DesignElement[] = [
    shapeEl('t1-bg', 'Background', 0, 0, 1080, 1080, {
        fill: '#0a0e1a', zIndex: 0, role: 'background',
        gradientStart: '#0a0e1a', gradientEnd: '#1a1040', gradientAngle: 135,
    }),
    shapeEl('t1-accent', 'Accent Bar', 0, 0, 8, 1080, {
        fill: '#8b5cf6', zIndex: 1, role: 'accent',
    }),
    textEl('t1-headline', 'Headline', 80, 280, 920, 300, {
        content: 'THE FUTURE\nIS HERE', fontSize: 110, fontWeight: 800,
        color: '#ffffff', zIndex: 2, role: 'headline',
    }),
    textEl('t1-body', 'Body', 80, 620, 700, 80, {
        content: 'Experience the next generation\nof creative tools.',
        fontSize: 36, fontWeight: 400, color: '#94a3b8', zIndex: 2, role: 'body',
    }),
];

// ═══════════════════════════════════════════════════
// TEMPLATE 2: Warm Gradient — Lifestyle / Fashion (1080x1080)
// ═══════════════════════════════════════════════════
const t2Elements: DesignElement[] = [
    shapeEl('t2-bg', 'Background', 0, 0, 1080, 1080, {
        fill: '#ff6b35', zIndex: 0, role: 'background',
        gradientStart: '#ff6b35', gradientEnd: '#f7931e', gradientAngle: 135,
    }),
    textEl('t2-headline', 'Headline', 80, 300, 920, 200, {
        content: 'SUMMER\nCOLLECTION', fontSize: 100, fontWeight: 800,
        color: '#ffffff', fontFamily: 'Inter', textAlign: 'center', zIndex: 2, role: 'headline',
    }),
    textEl('t2-body', 'Subline', 150, 550, 780, 60, {
        content: 'Up to 50% off · Limited time only', fontSize: 32, fontWeight: 500,
        color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 2, role: 'body',
    }),
];

// ═══════════════════════════════════════════════════
// TEMPLATE 3: Clean Minimal — SaaS / B2B (1080x1080)
// ═══════════════════════════════════════════════════
const t3Elements: DesignElement[] = [
    shapeEl('t3-bg', 'Background', 0, 0, 1080, 1080, {
        fill: '#ffffff', zIndex: 0, role: 'background',
    }),
    shapeEl('t3-top-bar', 'Top Accent', 0, 0, 1080, 8, {
        fill: '#2563eb', zIndex: 1, role: 'accent',
    }),
    textEl('t3-headline', 'Headline', 80, 280, 920, 200, {
        content: 'Simplify your\nworkflow', fontSize: 90, fontWeight: 700,
        color: '#1e293b', zIndex: 2, role: 'headline',
    }),
    textEl('t3-body', 'Body', 80, 530, 800, 100, {
        content: 'Automate repetitive tasks\nand focus on what matters.',
        fontSize: 32, fontWeight: 400, color: '#64748b', zIndex: 2, role: 'body',
    }),
    textEl('t3-badge', 'Badge', 80, 700, 400, 40, {
        content: 'No credit card required', fontSize: 22, fontWeight: 500,
        color: '#94a3b8', zIndex: 2,
    }),
];

// ═══════════════════════════════════════════════════
// TEMPLATE 4: Luxury Gold — Premium / Finance (1080x1080)
// ═══════════════════════════════════════════════════
const t4Elements: DesignElement[] = [
    shapeEl('t4-bg', 'Background', 0, 0, 1080, 1080, {
        fill: '#0c0c0c', zIndex: 0, role: 'background',
    }),
    shapeEl('t4-gold-line', 'Gold Line', 538, 80, 2, 920, {
        fill: '#c9a84c', zIndex: 1, opacity: 0.4, role: 'accent',
    }),
    textEl('t4-headline', 'Headline', 80, 300, 920, 250, {
        content: 'ELEVATE\nYOUR\nPORTFOLIO', fontSize: 80, fontWeight: 700,
        color: '#c9a84c', fontFamily: 'Inter', textAlign: 'center', zIndex: 2, role: 'headline',
    }),
    shapeEl('t4-divider', 'Divider', 440, 600, 200, 2, {
        fill: '#c9a84c', zIndex: 1,
    }),
    textEl('t4-body', 'Body', 160, 640, 760, 100, {
        content: 'Premium wealth management\nfor discerning investors.',
        fontSize: 30, fontWeight: 400, color: '#888888', textAlign: 'center', zIndex: 2, role: 'body',
    }),
];

// ═══════════════════════════════════════════════════
// TEMPLATE 5: Vibrant — Social Media / Event (1080x1080)
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
        content: 'MARCH 28, 2026', fontSize: 18, fontWeight: 600,
        color: '#c4b5fd', zIndex: 3,
    }),
    textEl('t5-headline', 'Headline', 80, 300, 920, 270, {
        content: 'DESIGN\nSUMMIT', fontSize: 110, fontWeight: 900,
        color: '#ffffff', textAlign: 'left', zIndex: 3, role: 'headline',
    }),
    textEl('t5-subline', 'Subline', 80, 620, 800, 60, {
        content: 'Where creativity meets technology', fontSize: 36, fontWeight: 400,
        color: '#a78bfa', zIndex: 3, role: 'body',
    }),
    shapeEl('t5-line', 'Accent Line', 80, 720, 100, 4, {
        fill: '#7c3aed', zIndex: 2, role: 'accent',
    }),
    textEl('t5-location', 'Location', 80, 760, 500, 40, {
        content: 'San Francisco · Moscone Center', fontSize: 24, fontWeight: 500,
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

/** Sizes to generate previews for each AI template — ALL 1080x1080 social */
const AI_TEMPLATE_SIZE_MAP: Record<string, { w: number; h: number; category: 'display' | 'social' }> = {
    'centered-stack': { w: 1080, h: 1080, category: 'social' },
    'left-aligned-card': { w: 1080, h: 1080, category: 'social' },
    'bold-headline': { w: 1080, h: 1080, category: 'social' },
    'split-horizontal': { w: 1080, h: 1080, category: 'social' },
    'diagonal-split': { w: 1080, h: 1080, category: 'social' },
    'top-down-cascade': { w: 1080, h: 1080, category: 'social' },
    'right-aligned': { w: 1080, h: 1080, category: 'social' },
    'minimal-clean': { w: 1080, h: 1080, category: 'social' },
    'full-bleed-hero': { w: 1080, h: 1080, category: 'social' },
    'badge-focus': { w: 1080, h: 1080, category: 'social' },
    'horizontal-strip': { w: 1080, h: 1080, category: 'social' },
    'tower': { w: 1080, h: 1080, category: 'social' },
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

// ★ 12 unique style guides — one per AI template
const AI_STYLE_GUIDES: Record<string, DesignStyleGuide> = {
    'centered-stack': {
        ...PREVIEW_GUIDE, id: 'sunset', name: 'Sunset',
        colors: { ...PREVIEW_GUIDE.colors, background: '#1a0800', surface: '#2d1600', foreground: '#fff5eb', accent: '#ff6b35', secondary: '#ffd700', gradientStart: '#1a0800', gradientEnd: '#3d1e00', gradientAngle: 135, border: '#4a2800', tertiary: '#ff9f1c', muted: '#8b6914', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#ff6b35' },
    },
    'left-aligned-card': {
        ...PREVIEW_GUIDE, id: 'ocean', name: 'Ocean',
        colors: { ...PREVIEW_GUIDE.colors, background: '#001a2e', surface: '#002d4f', foreground: '#e0f7ff', accent: '#00d4ff', secondary: '#0077b6', gradientStart: '#001a2e', gradientEnd: '#003050', gradientAngle: 180, border: '#004060', tertiary: '#48cae4', muted: '#4a6670', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#0077b6' },
    },
    'bold-headline': {
        ...PREVIEW_GUIDE, id: 'magenta', name: 'Magenta',
        colors: { ...PREVIEW_GUIDE.colors, background: '#1a0011', surface: '#2d001e', foreground: '#ffe0f0', accent: '#ff0055', secondary: '#ff66aa', gradientStart: '#1a0011', gradientEnd: '#330022', gradientAngle: 135, border: '#4a0030', tertiary: '#ff3377', muted: '#8b4466', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#ff0055' },
    },
    'split-horizontal': {
        ...PREVIEW_GUIDE, id: 'emerald', name: 'Emerald',
        colors: { ...PREVIEW_GUIDE.colors, background: '#001a0e', surface: '#002d18', foreground: '#e0fff0', accent: '#059669', secondary: '#34d399', gradientStart: '#001a0e', gradientEnd: '#003020', gradientAngle: 135, border: '#004020', tertiary: '#10b981', muted: '#4a7060', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#059669' },
    },
    'diagonal-split': {
        ...PREVIEW_GUIDE, id: 'hiphop', name: 'Street',
        colors: { ...PREVIEW_GUIDE.colors, background: '#0a0a0a', surface: '#1a1a2e', foreground: '#ffffff', accent: '#e94560', secondary: '#ff6b6b', gradientStart: '#0a0a0a', gradientEnd: '#1a1a2e', gradientAngle: 160, border: '#2d2d4e', tertiary: '#c23152', muted: '#666680', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#e94560' },
    },
    'top-down-cascade': {
        ...PREVIEW_GUIDE, id: 'royal', name: 'Royal',
        colors: { ...PREVIEW_GUIDE.colors, background: '#0d001a', surface: '#1a0033', foreground: '#f0e0ff', accent: '#7c3aed', secondary: '#c084fc', gradientStart: '#0d001a', gradientEnd: '#1a0040', gradientAngle: 135, border: '#2d0060', tertiary: '#a855f7', muted: '#6b4a8f', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#7c3aed' },
    },
    'right-aligned': {
        ...PREVIEW_GUIDE, id: 'coral', name: 'Coral',
        colors: { ...PREVIEW_GUIDE.colors, background: '#1a0808', surface: '#2d1414', foreground: '#fff0e8', accent: '#f43f5e', secondary: '#fbbf24', gradientStart: '#1a0808', gradientEnd: '#2d1010', gradientAngle: 135, border: '#4a2020', tertiary: '#fb7185', muted: '#8b6060', accentForeground: '#ffffff', error: '#ef4444', warning: '#fbbf24', info: '#f43f5e' },
    },
    'minimal-clean': {
        ...PREVIEW_GUIDE, id: 'arctic', name: 'Arctic',
        colors: { ...PREVIEW_GUIDE.colors, background: '#f8fafc', surface: '#f1f5f9', foreground: '#0f172a', accent: '#3b82f6', secondary: '#60a5fa', gradientStart: '#f8fafc', gradientEnd: '#e2e8f0', gradientAngle: 180, border: '#cbd5e1', tertiary: '#2563eb', muted: '#94a3b8', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
    'full-bleed-hero': {
        ...PREVIEW_GUIDE, id: 'cyber', name: 'Cyber',
        colors: { ...PREVIEW_GUIDE.colors, background: '#0a0a14', surface: '#0f0f23', foreground: '#e0ffe0', accent: '#00ff88', secondary: '#00cc6a', gradientStart: '#0a0a14', gradientEnd: '#0f1a0f', gradientAngle: 135, border: '#1a2d1a', tertiary: '#22c55e', muted: '#4a6640', accentForeground: '#000000', error: '#ef4444', warning: '#f59e0b', info: '#00ff88' },
    },
    'badge-focus': {
        ...PREVIEW_GUIDE, id: 'gold', name: 'Gold',
        colors: { ...PREVIEW_GUIDE.colors, background: '#0c0c0c', surface: '#1c1c1c', foreground: '#fff8e0', accent: '#d4af37', secondary: '#b8860b', gradientStart: '#0c0c0c', gradientEnd: '#1a1400', gradientAngle: 135, border: '#2d2400', tertiary: '#daa520', muted: '#8b7840', accentForeground: '#000000', error: '#ef4444', warning: '#d4af37', info: '#daa520' },
    },
    'horizontal-strip': {
        ...PREVIEW_GUIDE, id: 'electric', name: 'Electric',
        colors: { ...PREVIEW_GUIDE.colors, background: '#001033', surface: '#001a4f', foreground: '#e0f0ff', accent: '#60a5fa', secondary: '#1e40af', gradientStart: '#001033', gradientEnd: '#0a2050', gradientAngle: 135, border: '#1a3060', tertiary: '#3b82f6', muted: '#4a6090', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#60a5fa' },
    },
    'tower': {
        ...PREVIEW_GUIDE, id: 'pastel', name: 'Pastel',
        colors: { ...PREVIEW_GUIDE.colors, background: '#fce4ec', surface: '#f8bbd0', foreground: '#880e4f', accent: '#e91e63', secondary: '#f48fb1', gradientStart: '#fce4ec', gradientEnd: '#f8bbd0', gradientAngle: 180, border: '#f06292', tertiary: '#ec407a', muted: '#c48b9f', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#e91e63' },
    },
};

// ★ IDs of templates that should NOT have CTA buttons (mix of CTA/no-CTA)
const NO_CTA_TEMPLATES = new Set([
    'diagonal-split', 'top-down-cascade', 'minimal-clean',
    'full-bleed-hero', 'horizontal-strip', 'tower',
]);

function generateAiLayoutTemplates(): DesignTemplate[] {
    const result: DesignTemplate[] = [];

    for (const tmpl of DESIGN_TEMPLATES) {
        const sizeSpec = AI_TEMPLATE_SIZE_MAP[tmpl.id];
        if (!sizeSpec) continue;

        const { w, h, category } = sizeSpec;
        // ★ Use unique style guide per template for visual diversity
        const guide = AI_STYLE_GUIDES[tmpl.id] ?? PREVIEW_GUIDE;
        const renderElements = tmpl.build(w, h, guide, PREVIEW_CONTENT);

        // ★ Strip CTA from designated templates for variety
        const filteredElements = NO_CTA_TEMPLATES.has(tmpl.id)
            ? renderElements.filter(re => typeof re !== 'number' && !re.name?.includes('cta'))
            : renderElements;

        const designElements = filteredElements
            .filter((re): re is Exclude<typeof re, number> => typeof re !== 'number')
            .map((re, idx) => renderElementToDesignElement(re, idx, `ai-${tmpl.id}`));

        const bgEl = designElements.find(e => e.name?.toLowerCase().includes('background'));
        const bgColor = (bgEl as any)?.gradientStart || (bgEl as any)?.fill || guide.colors.background;

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
        'social', ['tech', 'product', 'dark', 'modern', 'launch'],
        1080, 1080, '#0a0e1a', t1Elements,
    ),
    makeTemplate(
        'builtin-warm-gradient', 'Warm Gradient', 'Lifestyle social post with warm orange tones',
        'social', ['fashion', 'lifestyle', 'sale', 'warm'],
        1080, 1080, '#ff6b35', t2Elements,
    ),
    makeTemplate(
        'builtin-clean-minimal', 'Clean Minimal', 'Clean white SaaS/B2B social post',
        'social', ['saas', 'b2b', 'clean', 'minimal', 'white', 'professional'],
        1080, 1080, '#ffffff', t3Elements,
    ),
    makeTemplate(
        'builtin-luxury-gold', 'Luxury Gold', 'Premium black and gold design',
        'social', ['luxury', 'finance', 'premium', 'gold', 'elegant'],
        1080, 1080, '#0c0c0c', t4Elements,
    ),
    makeTemplate(
        'builtin-vibrant-event', 'Vibrant Event', 'Bold social media event poster with purple glow',
        'social', ['event', 'social', 'conference', 'vibrant', 'purple', 'poster'],
        1080, 1080, '#1a0533', t5Elements,
    ),
    // ★ AI Layout Templates — unified from designTemplates.ts
    ...generateAiLayoutTemplates(),
];
