// ─────────────────────────────────────────────────
// visionRoleClassifier.ts — AI Vision Element Role Tagging
// ─────────────────────────────────────────────────
// Takes a canvas screenshot + element list → Vision AI classifies
// each element's semantic role for Smart Sizing.
// ONE-TIME call: result stored in element.role, never re-called.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import type { DesignElement } from '@/schema/elements.types';
import type { LayoutRole } from '@/schema/layoutRoles';
import { constraintsToAbsolute } from '@/engine/elementConverters';

// ── Types ──

export type SizingHint = 'cover' | 'contain' | 'fixed' | 'proportional';

export interface RoleClassification {
    elementId: string;
    role: LayoutRole;
    confidence: number;
    sizingHint: SizingHint;
}

// ── Sizing hint defaults per role ──

const ROLE_SIZING_DEFAULTS: Record<LayoutRole, SizingHint> = {
    background: 'cover',
    hero: 'contain',        // ★ Product/hero images: maintain aspect ratio
    logo: 'fixed',          // Logos: fixed size, corner-pinned
    headline: 'proportional',
    subline: 'proportional',
    cta: 'proportional',
    tnc: 'fixed',
    accent: 'proportional',
    detail: 'proportional',
    badge: 'fixed',
};

// ── Vision prompt ──

const ROLE_SYSTEM_PROMPT = `You are a design layout analyst. Given a design screenshot and a numbered list of elements with their positions, classify EACH element's semantic role.

ROLES (pick one per element):
- background: Full-canvas background (solid, gradient, or photo filling the entire canvas)
- hero: Primary visual (product photo, hero image, key visual — NOT filling entire canvas)
- logo: Brand logo or wordmark
- headline: Main headline text (largest, most prominent)
- subline: Secondary/supporting text
- cta: Call-to-action button (shape + label combined)
- tnc: Terms & conditions or fine print
- accent: Decorative element (divider, bar, abstract shape, ornament)
- detail: Detail text (features, dates, prices)
- badge: Overlay badge or sticker ("NEW", "50% OFF", sale tag)

RULES:
1. An image covering >80% of canvas area = background, NOT hero
2. A small-to-medium image (product, person, object) = hero
3. Shapes near text that form a button = cta (not accent)
4. Thin horizontal/vertical bars = accent
5. Very small text at bottom = tnc
6. If unsure, default to accent for shapes, detail for text`;

const ROLE_TOOL = {
    name: 'classify_roles',
    description: 'Classify the semantic role of each design element',
    input_schema: {
        type: 'object' as const,
        required: ['classifications'],
        properties: {
            classifications: {
                type: 'array' as const,
                items: {
                    type: 'object' as const,
                    required: ['element_index', 'role', 'confidence'],
                    properties: {
                        element_index: { type: 'number' as const, description: 'Index of the element in the provided list (0-based)' },
                        role: { type: 'string' as const, enum: ['background', 'hero', 'logo', 'headline', 'subline', 'cta', 'tnc', 'accent', 'detail', 'badge'] },
                        confidence: { type: 'number' as const, description: 'Confidence 0-100' },
                    },
                },
            },
        },
    },
};

// ── Main classifier ──

export async function classifyElementRoles(
    screenshotDataUrl: string,
    elements: DesignElement[],
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<RoleClassification[]> {
    if (elements.length === 0) return [];

    // Build element list description for the prompt
    const elementList = elements.map((el, i) => {
        const abs = constraintsToAbsolute(el.constraints, canvasW, canvasH);
        const coverage = ((abs.w * abs.h) / (canvasW * canvasH) * 100).toFixed(1);
        return `[${i}] "${el.name}" type=${el.type} pos=(${abs.x},${abs.y}) size=${abs.w}x${abs.h} coverage=${coverage}%`;
    }).join('\n');

    // Strip data URL prefix
    const [header, pure] = screenshotDataUrl.includes(',')
        ? screenshotDataUrl.split(',') as [string, string]
        : ['data:image/png;base64', screenshotDataUrl];
    const mediaType = header.includes('jpeg') || header.includes('jpg') ? 'image/jpeg' : 'image/png';

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 2048,
        system: ROLE_SYSTEM_PROMPT,
        tools: [ROLE_TOOL],
        tool_choice: { type: 'tool', name: 'classify_roles' },
        messages: [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: pure } },
                { type: 'text', text: `Canvas: ${canvasW}x${canvasH}px. Classify each element:\n\n${elementList}` },
            ],
        }],
    };

    const data = await callAnthropicApi(body, signal ?? new AbortController().signal) as {
        content: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const toolUse = data.content.find(c => c.type === 'tool_use' && c.name === 'classify_roles');
    if (!toolUse?.input) {
        console.warn('[visionRoleClassifier] Vision API returned no classifications, using heuristic fallback');
        return heuristicFallback(elements, canvasW, canvasH);
    }

    const input = toolUse.input as { classifications: Array<{ element_index: number; role: string; confidence: number }> };

    return input.classifications.map(c => {
        const el = elements[c.element_index];
        if (!el) return null;
        const role = (VALID_ROLES.has(c.role) ? c.role : 'accent') as LayoutRole;
        return {
            elementId: el.id,
            role,
            confidence: c.confidence ?? 50,
            sizingHint: ROLE_SIZING_DEFAULTS[role],
        };
    }).filter(Boolean) as RoleClassification[];
}

const VALID_ROLES = new Set<string>([
    'background', 'hero', 'logo', 'headline', 'subline',
    'cta', 'tnc', 'accent', 'detail', 'badge',
]);

// ── Heuristic fallback (no API call) ──

export function heuristicFallback(
    elements: DesignElement[],
    canvasW: number,
    canvasH: number,
): RoleClassification[] {
    return elements.map(el => {
        const abs = constraintsToAbsolute(el.constraints, canvasW, canvasH);
        const coverage = (abs.w * abs.h) / (canvasW * canvasH);
        let role: LayoutRole = 'accent';

        const name = el.name.toLowerCase();

        // Name-based detection (fast path)
        if (/\b(bg|background)\b/.test(name)) role = 'background';
        else if (/\b(logo|brand)\b/.test(name)) role = 'logo';
        else if (/\b(cta|button|shop|buy|learn|sign.?up|start|get.?started)\b/.test(name)) role = 'cta';
        else if (/\b(head|title|headline)\b|main.*text/.test(name)) role = 'headline';
        else if (/\b(sub|desc|body|caption)\b/.test(name)) role = 'subline';
        else if (/\b(hero|photo|product)\b|banner.*img/.test(name)) role = 'hero';
        else if (/\b(badge|tag|sticker|label)\b/.test(name)) role = 'badge';
        else if (/\b(tnc|terms|legal|fine.?print|disclaimer)\b/.test(name)) role = 'tnc';
        // Type + coverage heuristic
        else if (el.type === 'shape' && coverage > 0.6) role = 'background';
        else if (el.type === 'image' && coverage > 0.6) role = 'background';
        else if (el.type === 'image') role = 'hero';
        else if (el.type === 'button') role = 'cta';
        else if (el.type === 'text') {
            const fontSize = (el as { fontSize?: number }).fontSize ?? 16;
            role = fontSize >= 24 ? 'headline' : fontSize >= 16 ? 'subline' : 'detail';
        }

        return {
            elementId: el.id,
            role,
            confidence: 60,
            sizingHint: ROLE_SIZING_DEFAULTS[role],
        };
    });
}

/**
 * Apply role classifications to elements in-place.
 * Returns the number of elements updated.
 */
export function applyRolesToElements(
    elements: DesignElement[],
    classifications: RoleClassification[],
): number {
    const roleMap = new Map(classifications.map(c => [c.elementId, c]));
    let updated = 0;
    for (const el of elements) {
        const cls = roleMap.get(el.id);
        if (cls) {
            el.role = cls.role;
            updated++;
        }
    }
    return updated;
}
