// ─────────────────────────────────────────────────
// fontLoader.ts — Google Fonts dynamic loader
// ─────────────────────────────────────────────────
// Loads Google Fonts on demand and waits for them
// to be fully available before resolving.
// ─────────────────────────────────────────────────

const loadedFonts = new Set<string>();
const pendingLoads = new Map<string, Promise<void>>();

// System/bundled fonts that don't need Google Fonts loading
const SYSTEM_FONTS = new Set([
    'Inter', 'system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace',
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
]);

/**
 * Load a Google Font dynamically and wait until it's ready for rendering.
 * Safe to call multiple times — deduplicates and caches.
 *
 * @returns Promise that resolves when the font is fully loaded and ready.
 */
export async function loadGoogleFont(family: string): Promise<void> {
    if (!family || SYSTEM_FONTS.has(family)) return;
    if (loadedFonts.has(family)) return;

    // Deduplicate concurrent loads of same font
    const existing = pendingLoads.get(family);
    if (existing) return existing;

    const promise = (async () => {
        try {
            // Check if already available (e.g. user has it installed locally)
            if (document.fonts.check(`16px "${family}"`)) {
                loadedFonts.add(family);
                return;
            }

            // Inject Google Fonts <link>
            const linkId = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
            if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
                document.head.appendChild(link);
            }

            // ★ CRITICAL: Wait for the font to actually load
            // This prevents the "flash of fallback font" issue
            await document.fonts.load(`16px "${family}"`);

            loadedFonts.add(family);
        } catch (err) {
            console.warn(`[fontLoader] Failed to load "${family}":`, err);
            // Don't throw — graceful fallback to browser default
        } finally {
            pendingLoads.delete(family);
        }
    })();

    pendingLoads.set(family, promise);
    return promise;
}

/** Check if a font is already loaded and ready */
export function isFontLoaded(family: string): boolean {
    return SYSTEM_FONTS.has(family) || loadedFonts.has(family);
}

/** Get list of all loaded custom fonts */
export function getLoadedFonts(): string[] {
    return Array.from(loadedFonts);
}
