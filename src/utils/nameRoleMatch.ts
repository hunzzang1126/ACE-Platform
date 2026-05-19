// ─────────────────────────────────────────────────
// nameRoleMatch — Safe element name role detection
// ─────────────────────────────────────────────────
// ★ v751: Fixes critical bug where 'rectangle' matches 'cta'
// because name.includes('cta') matches 're[cta]ngle'.
//
// Standard \b word boundary treats '_' as word character,
// so /\bcta\b/ fails on 'cta_button'. This module uses
// letter-boundary regex that treats '_' as separator.
// ─────────────────────────────────────────────────

// Regex that matches 'cta' as a standalone token:
// NOT preceded or followed by a letter (a-zA-Z).
// Matches: 'cta', 'cta_button', 'main_cta', 'cta bg'
// Rejects: 'rectangle' (re[cta]ngle has letters around 'cta')
const CTA_RE = /(?:^|[^a-zA-Z])cta(?=[^a-zA-Z]|$)/;
const LABEL_RE = /(?:^|[^a-zA-Z])label(?=[^a-zA-Z]|$)/;

/** Check if element name contains 'cta' as a token (not substring) */
export function isCtaName(name: string): boolean {
    return CTA_RE.test(name);
}

/** Check if element name contains 'label' as a token (not substring) */
export function isLabelName(name: string): boolean {
    return LABEL_RE.test(name);
}

/** Check if element name matches CTA or button role */
export function isCtaOrButton(name: string): boolean {
    return isCtaName(name) || name.includes('button');
}

/** Check if element name matches CTA label role */
export function isCtaLabel(name: string): boolean {
    return isCtaName(name) || isLabelName(name);
}
