// ─────────────────────────────────────────────────
// backgroundImageDecider — Minimal code guard + AI fallback
// ─────────────────────────────────────────────────
// Only handles the ONE case code can reliably detect:
// "user explicitly asked for an image/photo."
// Everything else → AI decides (it's a semantic question).
// ─────────────────────────────────────────────────

export interface ImageDecision {
    needsImage: boolean;
    confidence: 'high' | 'low';
    reason: string;
}

/** Explicit user request patterns — the ONLY thing code can reliably detect */
const EXPLICIT_IMAGE_RE = /\b(photo|photograph|picture|hero shot|hero image|background image)\b|사진|배경\s?이미지|이미지\s?넣/i;

/**
 * Minimal code guard for background image decisions.
 *
 * Philosophy: Semantic questions ("does an iPhone ad need a photo?")
 * belong to AI, not keyword lists. Code only catches the ONE clear case:
 * the user explicitly asked for a photo/image.
 *
 * - 'high' confidence → code decision is final (user said "사진")
 * - 'low' confidence → defer to AI's needsBackgroundImage
 */
export function decideBackgroundImage(prompt: string): ImageDecision {
    if (EXPLICIT_IMAGE_RE.test(prompt)) {
        return { needsImage: true, confidence: 'high', reason: 'User explicitly requested image' };
    }

    // Everything else: let AI decide — it understands context better than keywords.
    return { needsImage: false, confidence: 'low', reason: 'Defer to AI' };
}
