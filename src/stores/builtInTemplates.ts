// ─────────────────────────────────────────────────
// builtInTemplates — 5 curated + 12 AI layout templates
// ─────────────────────────────────────────────────
// Helpers → builtInTemplateHelpers.ts
// ─────────────────────────────────────────────────

import type { DesignTemplate } from './templateStore';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';
import { DESIGN_TEMPLATES, type GeneratedContent } from '@/services/designTemplates';
import type { DesignStyleGuide } from '@/services/designStyleGuides';
import type { RenderElement } from '@/services/autoDesignService';
import { textEl, shapeEl, makeTemplate } from './builtInTemplateHelpers';

// ═══════════════════════════════════════════════════
// CURATED TEMPLATES (5)
// ═══════════════════════════════════════════════════

const t1 = [
    shapeEl('t1-bg', 'Background', 0, 0, 1080, 1080, { fill: '#0a0e1a', zIndex: 0, role: 'background', gradientStart: '#0a0e1a', gradientEnd: '#1a1040', gradientAngle: 135 }),
    shapeEl('t1-accent', 'Accent Bar', 0, 0, 8, 1080, { fill: '#8b5cf6', zIndex: 1, role: 'accent' }),
    textEl('t1-headline', 'Headline', 80, 280, 920, 300, { content: 'THE FUTURE\nIS HERE', fontSize: 110, fontWeight: 800, color: '#ffffff', zIndex: 2, role: 'headline' }),
    textEl('t1-body', 'Body', 80, 620, 700, 80, { content: 'Experience the next generation\nof creative tools.', fontSize: 36, fontWeight: 400, color: '#94a3b8', zIndex: 2, role: 'body' }),
];
const t2 = [
    shapeEl('t2-bg', 'Background', 0, 0, 1080, 1080, { fill: '#ff6b35', zIndex: 0, role: 'background', gradientStart: '#ff6b35', gradientEnd: '#f7931e', gradientAngle: 135 }),
    textEl('t2-headline', 'Headline', 80, 300, 920, 200, { content: 'SUMMER\nCOLLECTION', fontSize: 100, fontWeight: 800, color: '#ffffff', fontFamily: 'Inter', textAlign: 'center', zIndex: 2, role: 'headline' }),
    textEl('t2-body', 'Subline', 150, 550, 780, 60, { content: 'Up to 50% off · Limited time only', fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.85)', textAlign: 'center', zIndex: 2, role: 'body' }),
];
const t3 = [
    shapeEl('t3-bg', 'Background', 0, 0, 1080, 1080, { fill: '#ffffff', zIndex: 0, role: 'background' }),
    shapeEl('t3-top-bar', 'Top Accent', 0, 0, 1080, 8, { fill: '#2563eb', zIndex: 1, role: 'accent' }),
    textEl('t3-headline', 'Headline', 80, 280, 920, 200, { content: 'Simplify your\nworkflow', fontSize: 90, fontWeight: 700, color: '#1e293b', zIndex: 2, role: 'headline' }),
    textEl('t3-body', 'Body', 80, 530, 800, 100, { content: 'Automate repetitive tasks\nand focus on what matters.', fontSize: 32, fontWeight: 400, color: '#64748b', zIndex: 2, role: 'body' }),
    textEl('t3-badge', 'Badge', 80, 700, 400, 40, { content: 'No credit card required', fontSize: 22, fontWeight: 500, color: '#94a3b8', zIndex: 2 }),
];
const t4 = [
    shapeEl('t4-bg', 'Background', 0, 0, 1080, 1080, { fill: '#0c0c0c', zIndex: 0, role: 'background' }),
    shapeEl('t4-gold-line', 'Gold Line', 538, 80, 2, 920, { fill: '#c9a84c', zIndex: 1, opacity: 0.4, role: 'accent' }),
    textEl('t4-headline', 'Headline', 80, 300, 920, 250, { content: 'ELEVATE\nYOUR\nPORTFOLIO', fontSize: 80, fontWeight: 700, color: '#c9a84c', fontFamily: 'Inter', textAlign: 'center', zIndex: 2, role: 'headline' }),
    shapeEl('t4-divider', 'Divider', 440, 600, 200, 2, { fill: '#c9a84c', zIndex: 1 }),
    textEl('t4-body', 'Body', 160, 640, 760, 100, { content: 'Premium wealth management\nfor discerning investors.', fontSize: 30, fontWeight: 400, color: '#888888', textAlign: 'center', zIndex: 2, role: 'body' }),
];
const t5 = [
    shapeEl('t5-bg', 'Background', 0, 0, 1080, 1080, { fill: '#1a0533', zIndex: 0, role: 'background', gradientStart: '#1a0533', gradientEnd: '#0f172a', gradientAngle: 180 }),
    shapeEl('t5-glow', 'Glow Circle', 340, 200, 400, 400, { fill: '#7c3aed', borderRadius: 999, zIndex: 1, opacity: 0.15 }),
    textEl('t5-date', 'Date', 80, 120, 400, 30, { content: 'MARCH 28, 2026', fontSize: 18, fontWeight: 600, color: '#c4b5fd', zIndex: 3 }),
    textEl('t5-headline', 'Headline', 80, 300, 920, 270, { content: 'DESIGN\nSUMMIT', fontSize: 110, fontWeight: 900, color: '#ffffff', textAlign: 'left', zIndex: 3, role: 'headline' }),
    textEl('t5-subline', 'Subline', 80, 620, 800, 60, { content: 'Where creativity meets technology', fontSize: 36, fontWeight: 400, color: '#a78bfa', zIndex: 3, role: 'body' }),
    shapeEl('t5-line', 'Accent Line', 80, 720, 100, 4, { fill: '#7c3aed', zIndex: 2, role: 'accent' }),
    textEl('t5-location', 'Location', 80, 760, 500, 40, { content: 'San Francisco · Moscone Center', fontSize: 24, fontWeight: 500, color: '#94a3b8', zIndex: 3 }),
];

// ═══════════════════════════════════════════════════
// AI LAYOUT BRIDGE — Generate from designTemplates.ts
// ═══════════════════════════════════════════════════

const BASE_GUIDE: DesignStyleGuide = {
    id: 'preview', name: 'Preview', description: '', keywords: [],
    colors: { background: '#0f172a', surface: '#1e293b', border: '#334155', foreground: '#f8fafc', secondary: '#94a3b8', tertiary: '#64748b', muted: '#475569', accent: '#8b5cf6', accentForeground: '#ffffff', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', gradientStart: '#0f172a', gradientEnd: '#1e1b4b', gradientAngle: 135 },
    typography: { primaryFont: 'Inter', secondaryFont: 'Inter', scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 }, weights: { bold: '800', semibold: '600', medium: '500', normal: '400' }, letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 } },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 }, radius: 6,
};
const PREVIEW_CONTENT: GeneratedContent = { headline: 'Your Headline Here', subheadline: 'Supporting text for your creative', cta: 'Get Started', tag: 'NEW' };
const NO_CTA = new Set(['diagonal-split', 'top-down-cascade', 'minimal-clean', 'full-bleed-hero', 'horizontal-strip', 'tower']);
const AI_GUIDES: Record<string, Partial<DesignStyleGuide>> = {
    'centered-stack': { id: 'sunset', name: 'Sunset', colors: { ...BASE_GUIDE.colors, background: '#1a0800', accent: '#ff6b35', secondary: '#ffd700', gradientStart: '#1a0800', gradientEnd: '#3d1e00' } },
    'left-aligned-card': { id: 'ocean', name: 'Ocean', colors: { ...BASE_GUIDE.colors, background: '#001a2e', accent: '#00d4ff', secondary: '#0077b6', gradientStart: '#001a2e', gradientEnd: '#003050' } },
    'bold-headline': { id: 'magenta', name: 'Magenta', colors: { ...BASE_GUIDE.colors, background: '#1a0011', accent: '#ff0055', secondary: '#ff66aa', gradientStart: '#1a0011', gradientEnd: '#330022' } },
    'split-horizontal': { id: 'emerald', name: 'Emerald', colors: { ...BASE_GUIDE.colors, background: '#001a0e', accent: '#059669', secondary: '#34d399', gradientStart: '#001a0e', gradientEnd: '#003020' } },
    'diagonal-split': { id: 'hiphop', name: 'Street', colors: { ...BASE_GUIDE.colors, background: '#0a0a0a', accent: '#e94560', secondary: '#ff6b6b', gradientStart: '#0a0a0a', gradientEnd: '#1a1a2e' } },
    'top-down-cascade': { id: 'royal', name: 'Royal', colors: { ...BASE_GUIDE.colors, background: '#0d001a', accent: '#7c3aed', secondary: '#c084fc', gradientStart: '#0d001a', gradientEnd: '#1a0040' } },
    'right-aligned': { id: 'coral', name: 'Coral', colors: { ...BASE_GUIDE.colors, background: '#1a0808', accent: '#f43f5e', secondary: '#fbbf24', gradientStart: '#1a0808', gradientEnd: '#2d1010' } },
    'minimal-clean': { id: 'arctic', name: 'Arctic', colors: { ...BASE_GUIDE.colors, background: '#f8fafc', foreground: '#0f172a', accent: '#3b82f6', gradientStart: '#f8fafc', gradientEnd: '#e2e8f0' } },
    'full-bleed-hero': { id: 'cyber', name: 'Cyber', colors: { ...BASE_GUIDE.colors, background: '#0a0a14', accent: '#00ff88', secondary: '#00cc6a', gradientStart: '#0a0a14', gradientEnd: '#0f1a0f' } },
    'badge-focus': { id: 'gold', name: 'Gold', colors: { ...BASE_GUIDE.colors, background: '#0c0c0c', accent: '#d4af37', secondary: '#b8860b', gradientStart: '#0c0c0c', gradientEnd: '#1a1400' } },
    'horizontal-strip': { id: 'electric', name: 'Electric', colors: { ...BASE_GUIDE.colors, background: '#001033', accent: '#60a5fa', secondary: '#1e40af', gradientStart: '#001033', gradientEnd: '#0a2050' } },
    'tower': { id: 'pastel', name: 'Pastel', colors: { ...BASE_GUIDE.colors, background: '#fce4ec', foreground: '#880e4f', accent: '#e91e63', gradientStart: '#fce4ec', gradientEnd: '#f8bbd0' } },
};

function renderToDesignElement(re: RenderElement, idx: number, tid: string): DesignElement {
    const id = `${tid}-el-${idx}`, name = re.name || `element_${idx}`;
    const c = createDefaultConstraints(); c.horizontal.offset = Math.round(re.x); c.vertical.offset = Math.round(re.y); c.size.width = Math.round(re.w); c.size.height = Math.round(re.h);
    if (re.type === 'text') return { id, name, type: 'text', constraints: c, opacity: 1, visible: true, locked: false, zIndex: idx, content: re.content || '', fontFamily: 'Inter', fontSize: re.font_size || 16, fontWeight: parseInt(re.font_weight || '400', 10) || 400, fontStyle: 'normal', color: re.color_hex || '#ffffff', textAlign: (re.text_align as any) || 'left', lineHeight: re.line_height || 1.2, letterSpacing: re.letter_spacing || 0, autoShrink: true };
    const fill = (re.r != null && re.g != null && re.b != null) ? `#${Math.round(re.r * 255).toString(16).padStart(2, '0')}${Math.round(re.g * 255).toString(16).padStart(2, '0')}${Math.round(re.b * 255).toString(16).padStart(2, '0')}` : re.gradient_start_hex || '#808080';
    return { id, name, type: 'shape', shapeType: 'rectangle', constraints: c, opacity: re.a ?? 1, visible: true, locked: false, zIndex: idx, fill, borderRadius: re.radius ?? 0, gradientStart: re.gradient_start_hex, gradientEnd: re.gradient_end_hex, gradientAngle: re.gradient_angle, role: name.includes('background') ? 'background' as any : undefined };
}

function generateAiLayoutTemplates(): DesignTemplate[] {
    const result: DesignTemplate[] = [];
    for (const tmpl of DESIGN_TEMPLATES) {
        const guide: DesignStyleGuide = { ...BASE_GUIDE, ...AI_GUIDES[tmpl.id], colors: { ...BASE_GUIDE.colors, ...(AI_GUIDES[tmpl.id]?.colors ?? {}) } } as DesignStyleGuide;
        const els = tmpl.build(1080, 1080, guide, PREVIEW_CONTENT);
        const filtered = NO_CTA.has(tmpl.id) ? els.filter(re => typeof re !== 'number' && !re.name?.includes('cta')) : els;
        const designEls = filtered.filter((re): re is Exclude<typeof re, number> => typeof re !== 'number').map((re, i) => renderToDesignElement(re, i, `ai-${tmpl.id}`));
        const bgEl = designEls.find(e => e.name?.toLowerCase().includes('background'));
        const bgColor = (bgEl as any)?.gradientStart || (bgEl as any)?.fill || guide.colors.background;
        result.push(makeTemplate(`ai-${tmpl.id}`, tmpl.name, tmpl.description, 'social', ['ai-layout', 'adaptive', ...tmpl.aspectRatios], 1080, 1080, bgColor, designEls));
    }
    return result;
}

// ── Final Export ──

export const BUILT_IN_TEMPLATES: DesignTemplate[] = [
    makeTemplate('builtin-bold-dark', 'Bold Dark', 'High-contrast tech launch', 'social', ['tech', 'product', 'dark'], 1080, 1080, '#0a0e1a', t1),
    makeTemplate('builtin-warm-gradient', 'Warm Gradient', 'Lifestyle social post', 'social', ['fashion', 'lifestyle', 'sale'], 1080, 1080, '#ff6b35', t2),
    makeTemplate('builtin-clean-minimal', 'Clean Minimal', 'Clean SaaS/B2B post', 'social', ['saas', 'b2b', 'clean', 'minimal'], 1080, 1080, '#ffffff', t3),
    makeTemplate('builtin-luxury-gold', 'Luxury Gold', 'Premium black and gold', 'social', ['luxury', 'finance', 'premium'], 1080, 1080, '#0c0c0c', t4),
    makeTemplate('builtin-vibrant-event', 'Vibrant Event', 'Bold event poster', 'social', ['event', 'social', 'conference'], 1080, 1080, '#1a0533', t5),
    ...generateAiLayoutTemplates(),
];
