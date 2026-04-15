// ─────────────────────────────────────────────────
// onboardingStore — Persist guide dismissal state
// ─────────────────────────────────────────────────
// Uses localStorage with userId key. Supabase not needed.
// If cache clears → guide shows again (fine for new device).
// ─────────────────────────────────────────────────

export type GuidePage = 'dashboard' | 'sizes' | 'editor';

function getKey(page: GuidePage): string {
    let userId = 'anonymous';
    try {
        const raw = localStorage.getItem('ace-auth-state');
        if (raw) {
            const parsed = JSON.parse(raw);
            userId = parsed?.state?.user?.id ?? parsed?.user?.id ?? 'anonymous';
        }
    } catch { /* ok */ }
    return `ace-guide-${page}-dismissed-${userId}`;
}

/** Check if guide was dismissed for this page */
export function isGuideDismissed(page: GuidePage): boolean {
    try {
        return localStorage.getItem(getKey(page)) === '1';
    } catch {
        return false;
    }
}

/** Dismiss guide for this page */
export function dismissGuide(page: GuidePage): void {
    try {
        localStorage.setItem(getKey(page), '1');
    } catch { /* ok */ }
}

/** Reset all guides (for Settings "show guides again") */
export function resetAllGuides(): void {
    const pages: GuidePage[] = ['dashboard', 'sizes', 'editor'];
    for (const page of pages) {
        try {
            localStorage.removeItem(getKey(page));
        } catch { /* ok */ }
    }
}
