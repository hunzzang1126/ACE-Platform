// ─────────────────────────────────────────────────
// Design Quality Heuristics — Post-gen auto-correction
// ─────────────────────────────────────────────────
// Additional design quality checks beyond basic QA (out-of-bounds, overlap).
// These catch aesthetic issues that make designs look unprofessional.
// Called by Smart Check after QA fixes.

import type { BannerVariant } from '@/schema/design.types';
import type {
    DesignElement,
    TextElement,
    ButtonElement,
    ShapeElement,
} from '@/schema/elements.types';
import { resolveConstraints } from '@/schema/constraints.types';
import type { FixResult } from '@/engine/smartSizingFixer';

// ── Color Utility ──

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match || !match[1] || !match[2] || !match[3]) return null;
    return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
    };
}

function relativeLuminance(r: number, g: number, b: number): number {
    const mapped = [r / 255, g / 255, b / 255].map(c =>
        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * mapped[0]! + 0.7152 * mapped[1]! + 0.0722 * mapped[2]!;
}

function contrastRatio(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return 21; // assume good contrast on parse failure
    const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// ── Safe Zone Padding (IAB standard: 8px minimum) ──

const SAFE_ZONE_PX = 8;

// ── Public API ──

/**
 * Run design quality heuristics on a single variant.
 * Returns fixes (patches) for issues found.
 */
export function runDesignHeuristics(variant: BannerVariant): FixResult[] {
    const fixes: FixResult[] = [];
    const w = variant.preset.width;
    const h = variant.preset.height;

    // Find background color for contrast checks
    const bgColor = findBackgroundColor(variant.elements);

    for (const el of variant.elements) {
        // Safe Zone check
        fixes.push(...checkSafeZone(el, w, h, variant.id));

        // CTA contrast check
        if (el.role === 'cta' && el.type === 'button') {
            fixes.push(...checkCTAContrast(el as ButtonElement, bgColor, variant.id));
        }

        // Text overflow / font size check
        if (el.type === 'text') {
            fixes.push(...checkTextOverflow(el as TextElement, w, h, variant.id));
        }
    }

    return fixes;
}

// ── Check: Safe Zone ──

function checkSafeZone(
    el: DesignElement,
    canvasW: number,
    canvasH: number,
    variantId: string,
): FixResult[] {
    // Skip background elements — they should bleed to edges
    if (el.role === 'background') return [];

    const bounds = resolveConstraints(el.constraints, canvasW, canvasH);
    const fixes: FixResult[] = [];

    let newX = bounds.x;
    let newY = bounds.y;
    let changed = false;

    // Too close to left edge
    if (bounds.x < SAFE_ZONE_PX) {
        newX = SAFE_ZONE_PX;
        changed = true;
    }
    // Too close to top edge
    if (bounds.y < SAFE_ZONE_PX) {
        newY = SAFE_ZONE_PX;
        changed = true;
    }
    // Too close to right edge
    if (bounds.x + bounds.width > canvasW - SAFE_ZONE_PX) {
        newX = canvasW - SAFE_ZONE_PX - bounds.width;
        changed = true;
    }
    // Too close to bottom edge
    if (bounds.y + bounds.height > canvasH - SAFE_ZONE_PX) {
        newY = canvasH - SAFE_ZONE_PX - bounds.height;
        changed = true;
    }

    if (changed) {
        fixes.push({
            variantId,
            elementId: el.id,
            elementName: el.name,
            rule: 'safe-zone',
            description: `"${el.name}" too close to canvas edge (min ${SAFE_ZONE_PX}px)`,
            patch: {
                constraints: {
                    ...el.constraints,
                    horizontal: { anchor: 'left', offset: Math.max(newX, SAFE_ZONE_PX) },
                    vertical: { anchor: 'top', offset: Math.max(newY, SAFE_ZONE_PX) },
                },
            } as Partial<DesignElement>,
        });
    }

    return fixes;
}

// ── Check: CTA Contrast ──

function checkCTAContrast(
    btn: ButtonElement,
    bgColor: string,
    variantId: string,
): FixResult[] {
    const fixes: FixResult[] = [];

    // Check button text vs button background contrast (WCAG AA: 4.5:1)
    const textContrast = contrastRatio(btn.color, btn.backgroundColor);
    if (textContrast < 4.5) {
        // Make text white or dark depending on button background luminance
        const btnRgb = hexToRgb(btn.backgroundColor);
        const isDarkBg = btnRgb
            ? relativeLuminance(btnRgb.r, btnRgb.g, btnRgb.b) < 0.5
            : true;
        fixes.push({
            variantId,
            elementId: btn.id,
            elementName: btn.name,
            rule: 'cta-contrast',
            description: `CTA text contrast too low (${textContrast.toFixed(1)}:1, need 4.5:1)`,
            patch: { color: isDarkBg ? '#FFFFFF' : '#0F172A' },
        });
    }

    // Check button vs page background contrast (should be visible: min 3:1)
    const btnBgContrast = contrastRatio(btn.backgroundColor, bgColor);
    if (btnBgContrast < 3) {
        fixes.push({
            variantId,
            elementId: btn.id,
            elementName: btn.name,
            rule: 'cta-visibility',
            description: `CTA button not visible against background (${btnBgContrast.toFixed(1)}:1, need 3:1)`,
            patch: { backgroundColor: '#3B82F6' }, // fallback to high-contrast blue
        });
    }

    return fixes;
}

// ── Check: Text Overflow ──

function checkTextOverflow(
    text: TextElement,
    canvasW: number,
    canvasH: number,
    variantId: string,
): FixResult[] {
    const fixes: FixResult[] = [];
    const bounds = resolveConstraints(text.constraints, canvasW, canvasH);

    // Estimate text width (rough: avg 0.6 × fontSize per char)
    const estimatedWidth = text.content.length * text.fontSize * 0.6;

    if (estimatedWidth > bounds.width * 1.2) {
        // Text overflows its container — shrink font
        const scaleFactor = bounds.width / estimatedWidth;
        const newFontSize = Math.max(
            Math.round(text.fontSize * scaleFactor * 0.9), // 10% margin
            8, // absolute minimum
        );

        if (newFontSize < text.fontSize) {
            fixes.push({
                variantId,
                elementId: text.id,
                elementName: text.name,
                rule: 'text-overflow',
                description: `Text overflows container — fontSize ${text.fontSize}→${newFontSize}px`,
                patch: { fontSize: newFontSize },
            });
        }
    }

    return fixes;
}

// ── Helper: Find Background Color ──

function findBackgroundColor(elements: DesignElement[]): string {
    // Try role=background first
    const bgEl = elements.find(el => el.role === 'background' && el.type === 'shape');
    if (bgEl) return (bgEl as ShapeElement).fill;

    // Fall back to largest shape
    const shapes = elements
        .filter(el => el.type === 'shape')
        .sort((a, b) => {
            const aSize = a.constraints.size.width * a.constraints.size.height;
            const bSize = b.constraints.size.width * b.constraints.size.height;
            return bSize - aSize;
        });
    if (shapes.length > 0) return (shapes[0] as ShapeElement).fill;

    // Default dark background
    return '#0F172A';
}
