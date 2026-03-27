// ─────────────────────────────────────────────────
// autoDesignPrompts — Prompt builders for Auto-Design
// ─────────────────────────────────────────────────

import { classifyRatio, LAYOUT_ZONES, classifyMasterGroup, getMasterGroupDescriptions } from '@/engine/smartSizing';
import { selectStyleGuide, buildStylePromptForAI } from '@/services/designStyleGuides';
import { buildGoldenExamplePrompt } from '@/services/goldenExamples';
import type { CanvasElementInfo } from './autoDesignTypes';

export function buildFromScratchPrompt(canvasW: number, canvasH: number, userPrompt: string): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];
    const masterGroup = classifyMasterGroup(canvasW, canvasH);
    const masterGroupDesc = getMasterGroupDescriptions()[masterGroup];
    const guide = selectStyleGuide(userPrompt);
    const stylePrompt = buildStylePromptForAI(guide, canvasW, canvasH);

    const layoutHints: Record<string, string> = {
        'ultra-wide': 'Horizontal strip. Content flows LEFT to RIGHT. Text left 55%, CTA right edge. Single headline line.',
        'wide': 'Wide landscape. Two zones: content left/center, CTA right. Keep text compact.',
        'landscape': 'Standard rectangle. Headline upper-center, supporting text mid, CTA bottom-center.',
        'square': 'Social format. CENTER everything. Bold headline dominates. CTA bottom third.',
        'portrait': 'Vertical flow. TOP-DOWN reading: headline upper, supporting mid, CTA bottom quarter.',
        'ultra-tall': 'Skyscraper. Strict vertical stack. All center-aligned. Generous spacing between zones.',
    };

    const safe = guide.spacing.safe;
    const contentStart = { x: Math.round(zones.headline.x * canvasW), y: Math.round(zones.headline.y * canvasH) };
    const contentW = Math.round(zones.headline.w * canvasW);
    const ctaZone = { x: Math.round(zones.cta.x * canvasW), y: Math.round(zones.cta.y * canvasH), w: Math.round(zones.cta.w * canvasW), h: Math.round(zones.cta.h * canvasH) };
    const minDim = Math.min(canvasW, canvasH);
    const fonts = {
        hero: Math.max(18, Math.round(minDim * guide.typography.scale.hero)),
        headline: Math.max(16, Math.round(minDim * guide.typography.scale.headline)),
        title: Math.max(14, Math.round(minDim * guide.typography.scale.title)),
        body: Math.max(11, Math.round(minDim * guide.typography.scale.body)),
        caption: Math.max(9, Math.round(minDim * guide.typography.scale.caption)),
    };

    return `You are a world-class creative director at a premium design agency.
You produce ${canvasW}x${canvasH}px creatives that rival Apple, Airbnb, and Nike quality.

Canvas: ${canvasW}x${canvasH}px (${ratio} format)
${layoutHints[ratio] ?? 'Balanced layout.'}
${masterGroupDesc}

${stylePrompt}
${buildGoldenExamplePrompt(guide.id, canvasW, canvasH)}
═══════════════════════════════════════════════════
DESIGN PRINCIPLES (Pencil-grade quality)
═══════════════════════════════════════════════════

DOMINANT REGION RULE:
  One area of the design must visually dominate. The headline is your focal point.
  All other elements are subordinate. Avoid equal-weight layouts.

SPATIAL LOGIC:
  Use ONE dominant axis (horizontal for wide, vertical for tall).
  Prefer two structural zones before three. Let whitespace create separation.
  Structure over ornament — every element must serve a purpose.

VISUAL HIERARCHY:
  Size + weight + color establish importance: Headline > Subheadline > Body > CTA label.
  Never use the same font size for two different hierarchy levels.

CONSTRAINT OVER DECORATION:
  If an element does not support understanding, decision-making, or action, remove it.
  But DO add elements that create depth and visual richness (accent bars, subtle shapes).

═══════════════════════════════════════════════════
LAYERED COMPOSITION — Generate 8-15 elements in this order:
═══════════════════════════════════════════════════

LAYER 1: STRUCTURE (2-3 elements)
  [background]  Full canvas rect with gradient. Use style guide gradient colors.
                x=0, y=0, w=${canvasW}, h=${canvasH}, name="background"
  [accent_zone] A secondary rect creating depth. Examples:
                - Darker/lighter rectangle covering 30-50% of canvas
                - Subtle gradient overlay on one side
                - Semi-transparent panel behind text area (a=0.3-0.5)
                name="accent_zone"

LAYER 2: CONTENT (3-4 elements)
  [headline]    The dominant text. MUST be the largest, boldest element.
                Font: ${fonts.hero}px, weight="${guide.typography.weights.bold}", "${guide.typography.primaryFont}"
                Color: ${guide.colors.foreground}
                Position: around x=${contentStart.x}, y=${contentStart.y}, w=${contentW}
                Letter spacing: ${guide.typography.letterSpacing.tight}px
                name="headline"
  [subheadline] Supporting text BELOW headline with clear gap (min ${Math.round(fonts.hero * 0.4)}px).
                Font: ${fonts.body}px, weight="${guide.typography.weights.normal}", "${guide.typography.secondaryFont}"
                Color: ${guide.colors.secondary}
                name="subheadline"
  [body_text]   Optional extra detail (1 short line). Only if canvas has room.
                Font: ${fonts.caption}px, color: ${guide.colors.tertiary}
                name="body_text" (skip if canvas < 200px in any dimension)

LAYER 3: ACTION (2-3 elements)
  [cta_button]  Rounded rect button. MUST contrast strongly with background.
                Background: ${guide.colors.accent}, radius=${guide.radius}
                Position: around x=${ctaZone.x}, y=${ctaZone.y}, w=${ctaZone.w}, h=${ctaZone.h}
                name="cta_button"
  [cta_label]   Text centered on cta_button. ALL CAPS.
                Font: ${fonts.title}px, weight="${guide.typography.weights.semibold}"
                Color: ${guide.colors.accentForeground}
                Vertically centered inside button
                name="cta_label"

LAYER 4: POLISH (2-4 elements — these create "premium" feel)
  [accent_line] Thin accent bar (2-4px height or width) in accent color.
                Place near headline or between content zones as a visual separator.
                name="accent_line"
  [tag_badge]   Small label like "NEW", "LIMITED", "2024" — uppercase, tiny font.
                Rect with text overlay. Font: ${fonts.caption}px, weight="700"
                Background: ${guide.colors.accent}, text: ${guide.colors.accentForeground}
                Position: above headline or top corner.
                name="tag_badge", tag text name="tag_text"
  [decorative]  ONE subtle geometric shape: small circle, thin line, or corner accent.
                Low opacity (a=0.05-0.15). Creates depth without clutter.
                name="decorative_shape" (skip if canvas is very small)

═══════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE:
═══════════════════════════════════════════════════

1. NO TEXT OVERLAP — Every text bounding box must have min ${Math.max(8, Math.round(fonts.body * 0.5))}px gap from all other text
2. ALL elements within canvas bounds: x >= 0, y >= 0, x+w <= ${canvasW}, y+h <= ${canvasH}
3. Minimum ${safe}px from canvas edges for all text elements
4. CTA text MUST be centered on CTA button (same x, same w, y vertically centered)
5. Use ONLY colors from the style guide palette above — do NOT invent colors
6. Element names must be unique and descriptive
7. Elements ordered by z-index: background first, decorative last
8. CTA button gets a subtle shadow: shadow_offset_x=2, shadow_offset_y=4, shadow_blur=10, shadow_opacity=0.25

User prompt: "${userPrompt}"
Write SHORT, impactful ad copy. No lorem ipsum. Real creative content.
Write all copy in the user's preferred language. If their prompt is in a specific language, use THAT language.

Return ONLY the render_banner tool call. No explanation.`;
}

export function buildAssetContextPrompt(
    canvasW: number, canvasH: number, elements: CanvasElementInfo[],
    userPrompt: string, hasImages = false,
): string {
    const elementList = elements.map(e => `  - "${e.name}" (${e.type}, at ${e.x},${e.y}, size ${e.w}x${e.h})`).join('\n');
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];

    const hlX = Math.round(zones.headline.x * canvasW), hlY = Math.round(zones.headline.y * canvasH), hlW = Math.round(zones.headline.w * canvasW);
    const ctaX = Math.round(zones.cta.x * canvasW), ctaY = Math.round(zones.cta.y * canvasH), ctaW = Math.round(zones.cta.w * canvasW), ctaH = Math.round(zones.cta.h * canvasH);
    const pad = Math.max(10, Math.round(Math.min(canvasW, canvasH) * 0.05));
    const hlFontSize = Math.max(18, Math.round(canvasH * 0.1));
    const subFontSize = Math.max(12, Math.round(canvasH * 0.055));
    const ctaFontSize = Math.max(12, Math.round(canvasH * 0.06));

    const isLandscape = canvasW > canvasH * 1.2;
    let imgX: number, imgY: number, imgW: number, imgH: number;
    if (isLandscape) { imgW = Math.round(canvasW * 0.45); imgH = canvasH; imgX = canvasW - imgW; imgY = 0; }
    else { imgW = canvasW; imgH = Math.round(canvasH * 0.5); imgX = 0; imgY = 0; }

    const textAreaY = isLandscape ? Math.round(canvasH * 0.15) : Math.round(canvasH * 0.52);
    const textAreaX = pad;
    const textAreaW = isLandscape ? Math.round(canvasW * 0.5) : canvasW - 2 * pad;
    const subY = textAreaY + hlFontSize + 12;
    const ctaFinalX = isLandscape ? textAreaX : ctaX;
    const ctaFinalY = isLandscape ? ctaY : Math.min(ctaY, canvasH - ctaH - pad);

    const imageNames = elements.filter(e => e.type === 'image').map(e => `"${e.name}"`).join(', ');
    const hasImagesOnCanvas = hasImages || elements.some(e => e.type === 'image');

    return `You are a world-class banner ad designer. Create a COMPLETE, polished ${canvasW}x${canvasH}px design.

EXISTING ELEMENTS (keep their names exact for patches):
${elementList}

User request: "${userPrompt}"

YOUR TASK: Transform this into a PROFESSIONAL banner by:

1. PATCHES (modify existing elements):
${hasImages ? `   - Move image(s) [${imageNames}] to hero position: x=${imgX}, y=${imgY}, w=${imgW}, h=${imgH}` : ''}
   - Reposition any text/shapes as needed

2. ADDITIONS (you MUST add these — no exceptions):
   a) BACKGROUND: full-canvas rect (x=0, y=0, w=${canvasW}, h=${canvasH}) with a strong brand color
      → name: "background", place this FIRST (lowest zIndex)
   b) HEADLINE: bold text centered in text zone
      → x=${textAreaX}, y=${textAreaY}, w=${textAreaW}
      → font_size=${hlFontSize}, font_weight="800", text_align="${isLandscape ? 'left' : 'center'}"
      → color_hex="#FFFFFF", name: "headline"
   c) SUBHEADLINE: supporting text below headline
      → x=${textAreaX}, y=${subY}, w=${textAreaW}
      → font_size=${subFontSize}, font_weight="500", text_align="${isLandscape ? 'left' : 'center'}"
      → color_hex="#E0E0E0", name: "subheadline"
   d) CTA BUTTON: rounded rect button
      → x=${ctaFinalX}, y=${ctaFinalY}, w=${ctaW}, h=${ctaH}, radius=8
      → bright contrasting accent color (NOT same as background), name: "cta_button"
   e) CTA LABEL: text centered on CTA button
      → x=${ctaFinalX}, y=${ctaFinalY + Math.round((ctaH - ctaFontSize) / 2)}, w=${ctaW}
      → font_size=${ctaFontSize}, font_weight="700", text_align="center"
      → color_hex="#FFFFFF", name: "cta_label"

STRICT RULES:
- Generate REAL ad copy based on the image context and user prompt (no lorem ipsum)
- Background and CTA must have STRONGLY CONTRASTING colors (e.g. dark navy bg + orange CTA)
- ALL elements must be within canvas bounds: x: 0–${canvasW}, y: 0–${canvasH}
- Minimum ${pad}px padding from canvas edges for text
- Additions array order matters — background must be FIRST, then text on top
- The image element zIndex is already managed — do not try to reorder it via patches

Return ONLY the rearrange_banner tool call.`;
}
