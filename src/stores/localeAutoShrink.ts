// ─────────────────────────────────────────────────
// localeAutoShrink — Auto-shrink fontSize when text overflows
// ─────────────────────────────────────────────────
// After locale switch, text content may be longer in the target
// language (e.g., Korean/German text is often wider than English).
// This module estimates text height and shrinks fontSize to fit.
// ─────────────────────────────────────────────────

/**
 * Estimate the number of lines a text string would occupy
 * given a box width and font size.
 *
 * CJK characters (Korean, Chinese, Japanese) are roughly 1em wide.
 * Latin characters average ~0.55em wide.
 */
function estimateLineCount(text: string, fontSize: number, boxWidth: number): number {
    if (boxWidth <= 0 || fontSize <= 0) return 1;

    let totalWidth = 0;
    let lines = 1;

    for (const char of text) {
        // Handle explicit line breaks
        if (char === '\n') { lines++; totalWidth = 0; continue; }

        const code = char.codePointAt(0) ?? 0;
        const isCJK = (
            (code >= 0x3000 && code <= 0x9FFF) ||  // CJK Unified + Japanese
            (code >= 0xAC00 && code <= 0xD7AF) ||  // Korean Hangul
            (code >= 0xF900 && code <= 0xFAFF) ||  // CJK Compatibility
            (code >= 0x20000 && code <= 0x2FA1F)   // CJK Extension
        );

        const charWidth = isCJK ? fontSize * 1.0 : fontSize * 0.55;
        totalWidth += charWidth;

        if (totalWidth > boxWidth) {
            lines++;
            totalWidth = charWidth; // wrap
        }
    }

    return lines;
}

/**
 * Estimate the total rendered height of text content.
 */
export function estimateTextHeight(
    text: string,
    fontSize: number,
    lineHeight: number,
    boxWidth: number,
): number {
    const lines = estimateLineCount(text, fontSize, boxWidth);
    return lines * fontSize * lineHeight;
}

/**
 * Calculate the shrunk fontSize needed to fit text within a box height.
 * Returns the original fontSize if no shrink is needed.
 *
 * @param text - The text content
 * @param fontSize - Original font size
 * @param lineHeight - Line height multiplier
 * @param boxWidth - Available width for text
 * @param boxHeight - Maximum allowed height
 * @param minFontSize - Minimum font size to prevent unreadable text (default: 8)
 */
export function calcAutoShrinkFontSize(
    text: string,
    fontSize: number,
    lineHeight: number,
    boxWidth: number,
    boxHeight: number,
    minFontSize: number = 8,
): number {
    if (!text || boxHeight <= 0 || boxWidth <= 0) return fontSize;

    const currentHeight = estimateTextHeight(text, fontSize, lineHeight, boxWidth);
    if (currentHeight <= boxHeight) return fontSize; // fits — no shrink needed

    // Binary search for the largest fontSize that fits
    let lo = minFontSize;
    let hi = fontSize;
    let best = minFontSize;

    for (let i = 0; i < 20; i++) { // 20 iterations = precision < 0.001px
        const mid = (lo + hi) / 2;
        const h = estimateTextHeight(text, mid, lineHeight, boxWidth);
        if (h <= boxHeight) {
            best = mid;
            lo = mid;
        } else {
            hi = mid;
        }
    }

    // Round to 1 decimal place for clean values
    return Math.round(best * 10) / 10;
}
