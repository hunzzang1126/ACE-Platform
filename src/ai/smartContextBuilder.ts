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
import { loadUserPrefs, prefsToPromptSection } from '@/stores/userPrefs';
import { buildDesignSystemPrompt } from '@/ai/prompts/bannerDesignPrompt';
import { paletteToPromptSection, type BrandPalette } from '@/engine/brandPalette';
import { loadMemory, memoryToPromptSection, type AiMemory } from '@/services/aiMemoryService';
import { initActionTracker } from '@/ai/actionTracker';

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

    /** Generated brand palette (from BrandConfig) */
    generatedPalette?: BrandPalette;

    /** Recent user actions for conversational continuity */
    recentActions?: string[];

    /** Currently selected element (from user's last click/selection) */
    currentSelection?: {
        name: string;
        id: number;
        type: string;
        /** Seconds since selection */
        age: number;
    };
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

// ── Cached AI Memory (loaded async, used sync in prompt building) ──
let cachedMemory: AiMemory | null = null;

/** Load memory async and cache it. Call once at session start or after auth. */
export async function refreshMemoryCache(): Promise<void> {
    try {
        cachedMemory = await loadMemory();
    } catch { /* ok — will use empty */ }
}

/** Get the cached memory (non-blocking). */
export function getCachedMemory(): AiMemory | null {
    return cachedMemory;
}

// Kick off initial load
refreshMemoryCache();
initActionTracker();

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

// ── Last Touched Elements (for pronoun resolution: "it", "that", "the last one") ──

const LAST_TOUCHED_MAX = 5;
let lastTouched: { name: string; id: number; action: string; timestamp: number }[] = [];

export function pushLastTouched(name: string, id: number, action: string): void {
    // Deduplicate: if same element+action exists, update timestamp
    lastTouched = lastTouched.filter(t => !(t.id === id && t.action === action));
    lastTouched.push({ name, id, action, timestamp: Date.now() });
    if (lastTouched.length > LAST_TOUCHED_MAX) {
        lastTouched = lastTouched.slice(-LAST_TOUCHED_MAX);
    }
}

export function getLastTouched() {
    return [...lastTouched];
}

export function clearLastTouched(): void {
    lastTouched = [];
}

// ── AI Change Log (tracks what AI modified for undo/follow-up) ──

export interface AiChangeRecord {
    tool: string;
    elementName: string;
    summary: string; // e.g. "fontSize 24→32"
    timestamp: number;
}

const AI_CHANGE_LOG_MAX = 15;
let aiChangeLog: AiChangeRecord[] = [];

export function pushAiChange(record: AiChangeRecord): void {
    aiChangeLog.push(record);
    if (aiChangeLog.length > AI_CHANGE_LOG_MAX) {
        aiChangeLog = aiChangeLog.slice(-AI_CHANGE_LOG_MAX);
    }
}

export function getAiChangeLog(): AiChangeRecord[] {
    return [...aiChangeLog];
}

export function clearAiChangeLog(): void {
    aiChangeLog = [];
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

    // ── Generated Palette (from BrandConfig) ──
    if (creativeSet.brand?.generatedPalette) {
        ctx.generatedPalette = creativeSet.brand.generatedPalette;
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

    // ── Currently Selected Element ──
    if (ctx.currentSelection) {
        const sel = ctx.currentSelection;
        lines.push(`\n### Currently Selected Element`);
        lines.push(`"${sel.name}" (id=${sel.id}, ${sel.type}) — selected ${sel.age}s ago`);
        lines.push(`*(When user says "this", "the selected one" → they mean this element)*`);
    }

    // ── Last Touched Elements (pronoun resolution) ──
    const touched = getLastTouched();
    if (touched.length > 0) {
        lines.push(`\n### Recently Modified Elements`);
        lines.push(`*(When the user says "it", "that", "the last one", they mean the most recent item below)*`);
        for (const t of touched) {
            lines.push(`- "${t.name}" (id=${t.id}): ${t.action}`);
        }
    }

    // ── AI Change Log (what AI did recently) ──
    const changes = getAiChangeLog();
    if (changes.length > 0) {
        lines.push(`\n### AI Change Log (your recent changes)`);
        lines.push(`*(Use this to support "undo that", "keep going", "do the same to X")*`);
        for (const c of changes.slice(-8)) {
            lines.push(`- ${c.tool}: ${c.elementName} — ${c.summary}`);
        }
    }

    // ── User Preferences ──
    const prefs = loadUserPrefs();
    if (prefs.stats.totalDesigns > 0) {
        lines.push('');
        lines.push(prefsToPromptSection(prefs));
    }

    // ── AI Persistent Memory ──
    if (cachedMemory) {
        const memSection = memoryToPromptSection(cachedMemory);
        if (memSection) {
            lines.push(memSection);
        }
    }

    // ── Design System Guidelines ──
    if (ctx.activeVariant) {
        // Use generated palette if available, otherwise detected brand
        const brandColors = ctx.brand
            ? { primary: ctx.brand.primaryColor, secondary: ctx.brand.secondaryColor }
            : undefined;
        lines.push('');
        lines.push(buildDesignSystemPrompt(
            ctx.activeVariant.width,
            ctx.activeVariant.height,
            ctx.activeVariant.aspectCategory,
            brandColors,
        ));

        // Inject full generated palette if available
        if (ctx.generatedPalette) {
            lines.push('');
            lines.push(paletteToPromptSection(ctx.generatedPalette));
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
