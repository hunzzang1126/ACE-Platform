// ─────────────────────────────────────────────────
// Smart Context Builder — Structured AI Context
// ─────────────────────────────────────────────────
// Provides the AI with ONLY relevant, structured data
// instead of dumping raw state. Inspired by Cursor/Antigravity
// context management patterns.
//
// Context hierarchy:
// 1. Current variant info (size, aspect ratio, element count)
// 2. Master vs current diff (what changed)
// 3. Element inventory with roles
// 4. Brand guidelines (auto-detected from elements)
// 5. Recent user actions (conversational continuity)

import type { CreativeSet, BannerVariant } from '@/schema/design.types';
import type { DesignElement, TextElement, ShapeElement, ButtonElement } from '@/schema/elements.types';
import { getAspectCategory, type AspectCategory } from '@/schema/layoutRoles';

// ── Types ──

export interface SmartContext {
    /** Current page context */
    page: 'dashboard' | 'editor' | 'size-dashboard';

    /** Creative set summary (if one is open) */
    creativeSet?: {
        name: string;
        variantCount: number;
        masterSize: string;
        sizes: string[];
    };

    /** Current active variant info */
    activeVariant?: {
        size: string;
        width: number;
        height: number;
        aspectCategory: AspectCategory;
        isMaster: boolean;
        elementCount: number;
    };

    /** Element inventory — what's on the canvas */
    elements?: ElementSummary[];

    /** Auto-detected brand from current elements */
    brand?: BrandProfile;

    /** Recent user actions for conversational continuity */
    recentActions?: string[];
}

export interface ElementSummary {
    name: string;
    type: string;
    role?: string;
    /** Key properties vary by type */
    props: Record<string, string | number>;
}

export interface BrandProfile {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    textColor: string;
}

// ── Action History Ring Buffer ──

const ACTION_HISTORY_MAX = 10;
let actionHistory: string[] = [];

export function pushAction(action: string): void {
    actionHistory.push(action);
    if (actionHistory.length > ACTION_HISTORY_MAX) {
        actionHistory = actionHistory.slice(-ACTION_HISTORY_MAX);
    }
}

export function getActionHistory(): string[] {
    return [...actionHistory];
}

export function clearActionHistory(): void {
    actionHistory = [];
}

// ── Main Builder ──

/**
 * Build structured context for the AI.
 * This replaces raw canvas dumps with only relevant, distilled information.
 */
export function buildSmartContext(
    page: SmartContext['page'],
    creativeSet?: CreativeSet | null,
    activeVariantId?: string,
): SmartContext {
    const ctx: SmartContext = { page };

    if (!creativeSet) return ctx;

    // ── Creative Set Summary ──
    const masterVariant = creativeSet.variants.find(v => v.id === creativeSet.masterVariantId);
    ctx.creativeSet = {
        name: creativeSet.name,
        variantCount: creativeSet.variants.length,
        masterSize: masterVariant
            ? `${masterVariant.preset.width}×${masterVariant.preset.height}`
            : 'unknown',
        sizes: creativeSet.variants.map(v => `${v.preset.width}×${v.preset.height}`),
    };

    // ── Active Variant ──
    const active = activeVariantId
        ? creativeSet.variants.find(v => v.id === activeVariantId)
        : masterVariant;

    if (active) {
        const w = active.preset.width;
        const h = active.preset.height;
        ctx.activeVariant = {
            size: `${w}×${h}`,
            width: w,
            height: h,
            aspectCategory: getAspectCategory(w, h),
            isMaster: active.id === creativeSet.masterVariantId,
            elementCount: active.elements.length,
        };

        // ── Element Inventory ──
        ctx.elements = active.elements.map(el => summarizeElement(el));

        // ── Auto-detect Brand ──
        ctx.brand = detectBrand(active.elements);
    }

    // ── Recent Actions ──
    if (actionHistory.length > 0) {
        ctx.recentActions = getActionHistory();
    }

    return ctx;
}

/**
 * Convert SmartContext to a concise string for the AI system prompt.
 * This is what gets injected into the prompt — structured yet readable.
 */
export function contextToPromptSection(ctx: SmartContext): string {
    const lines: string[] = [];

    lines.push(`## Current Context`);
    lines.push(`Page: ${ctx.page}`);

    if (ctx.creativeSet) {
        lines.push(`\n### Creative Set: "${ctx.creativeSet.name}"`);
        lines.push(`- Variants: ${ctx.creativeSet.variantCount} sizes (${ctx.creativeSet.sizes.join(', ')})`);
        lines.push(`- Master: ${ctx.creativeSet.masterSize}`);
    }

    if (ctx.activeVariant) {
        lines.push(`\n### Active Canvas: ${ctx.activeVariant.size}`);
        lines.push(`- Aspect ratio: ${ctx.activeVariant.aspectCategory} (${ctx.activeVariant.width}w × ${ctx.activeVariant.height}h)`);
        lines.push(`- Master: ${ctx.activeVariant.isMaster ? 'YES' : 'NO (slave variant)'}`);
        lines.push(`- Elements: ${ctx.activeVariant.elementCount}`);
    }

    if (ctx.elements && ctx.elements.length > 0) {
        lines.push(`\n### Elements on Canvas`);
        for (const el of ctx.elements) {
            const roleTag = el.role ? ` [${el.role}]` : '';
            const propStr = Object.entries(el.props)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ');
            lines.push(`- **${el.name}**${roleTag} (${el.type}): ${propStr}`);
        }
    } else if (ctx.activeVariant) {
        lines.push(`\n### Canvas is EMPTY — ready for new design.`);
    }

    if (ctx.brand) {
        lines.push(`\n### Detected Brand Colors`);
        lines.push(`- Background: ${ctx.brand.backgroundColor}`);
        lines.push(`- Primary: ${ctx.brand.primaryColor}`);
        lines.push(`- Secondary: ${ctx.brand.secondaryColor}`);
        lines.push(`- Text: ${ctx.brand.textColor}`);
        lines.push(`- Font: ${ctx.brand.fontFamily}`);
        lines.push(`*(Use these colors for consistency when adding new elements)*`);
    }

    if (ctx.recentActions && ctx.recentActions.length > 0) {
        lines.push(`\n### Recent User Actions`);
        for (const action of ctx.recentActions.slice(-5)) {
            lines.push(`- ${action}`);
        }
    }

    return lines.join('\n');
}

// ── Helpers ──

function summarizeElement(el: DesignElement): ElementSummary {
    const base: ElementSummary = {
        name: el.name,
        type: el.type,
        role: el.role,
        props: {},
    };

    // Add type-specific key props
    switch (el.type) {
        case 'text': {
            const t = el as TextElement;
            base.props = {
                content: t.content.length > 40 ? t.content.substring(0, 40) + '…' : t.content,
                fontSize: t.fontSize,
                color: t.color,
                fontFamily: t.fontFamily,
                align: t.textAlign,
            };
            break;
        }
        case 'shape': {
            const s = el as ShapeElement;
            base.props = {
                shape: s.shapeType,
                fill: s.fill,
                w: el.constraints.size.width,
                h: el.constraints.size.height,
            };
            break;
        }
        case 'button': {
            const b = el as ButtonElement;
            base.props = {
                label: b.label,
                bgColor: b.backgroundColor,
                textColor: b.color,
            };
            break;
        }
        case 'image':
            base.props = { src: 'image' };
            break;
        case 'video':
            base.props = { src: 'video' };
            break;
    }

    return base;
}

function detectBrand(elements: DesignElement[]): BrandProfile | undefined {
    if (elements.length === 0) return undefined;

    // Find background color (largest shape or role=background)
    let bgColor = '#0a0e1a';
    const bgEl = elements.find(el => el.role === 'background' && el.type === 'shape');
    if (bgEl && bgEl.type === 'shape') {
        bgColor = (bgEl as ShapeElement).fill;
    }

    // Find primary accent color (accent shape or CTA bg)
    let primaryColor = '#c9a84c';
    const accentEl = elements.find(el => el.role === 'accent' && el.type === 'shape');
    if (accentEl && accentEl.type === 'shape') {
        primaryColor = (accentEl as ShapeElement).fill;
    }
    const ctaEl = elements.find(el => el.role === 'cta' && el.type === 'button');
    if (ctaEl && ctaEl.type === 'button') {
        primaryColor = (ctaEl as ButtonElement).backgroundColor;
    }

    // Find text color (from headline)
    let textColor = '#ffffff';
    const headlineEl = elements.find(el => el.role === 'headline' && el.type === 'text');
    if (headlineEl && headlineEl.type === 'text') {
        textColor = (headlineEl as TextElement).color;
    }

    // Find font family
    let fontFamily = 'Inter';
    const textEl = elements.find(el => el.type === 'text');
    if (textEl && textEl.type === 'text') {
        fontFamily = (textEl as TextElement).fontFamily;
    }

    // Find secondary (second most common shape color, excluding bg)
    const shapeFills = elements
        .filter(el => el.type === 'shape' && el.role !== 'background')
        .map(el => (el as ShapeElement).fill)
        .filter(f => f !== bgColor && f !== primaryColor);
    const secondaryColor = shapeFills[0] || primaryColor;

    return { primaryColor, secondaryColor, backgroundColor: bgColor, fontFamily, textColor };
}
