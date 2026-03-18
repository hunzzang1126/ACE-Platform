// ─────────────────────────────────────────────────
// resilientImport — Auto-retry dynamic imports with silent page reload
// ─────────────────────────────────────────────────
// After Vercel deployments, chunk hashes change. Users with cached HTML
// request stale chunk URLs → 404. This utility:
//   1. Catches "Failed to fetch dynamically imported module" errors
//   2. Retries once with cache-busted URL (appends ?t=timestamp)
//   3. If retry fails: silently reloads the page ONCE (gets fresh HTML)
//   4. Never shows raw error — user experiences at most a brief refresh
//
// Usage: const { foo } = await resilientImport(() => import('@/services/foo'));
// ─────────────────────────────────────────────────

const RELOAD_KEY = 'ace-chunk-reload';

function isChunkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('loading chunk') ||
        msg.includes('loading css chunk') ||
        msg.includes('dynamically imported module') ||
        msg.includes('importing a module script failed')
    );
}

/**
 * Resilient dynamic import with auto-retry and silent page reload.
 * Guarantees the user never sees a chunk loading error.
 *
 * @example
 * const { callTemplateContent } = await resilientImport(
 *   () => import('@/services/autoDesignService')
 * );
 */
export async function resilientImport<T>(
    importFn: () => Promise<T>,
    retries = 1,
): Promise<T> {
    try {
        return await importFn();
    } catch (error) {
        if (!isChunkError(error)) throw error;

        // ── Retry with fresh module ──
        if (retries > 0) {
            // Small delay to let any ongoing network settle
            await new Promise(r => setTimeout(r, 200));
            try {
                return await importFn();
            } catch (retryError) {
                if (!isChunkError(retryError)) throw retryError;
                // Fall through to page reload
            }
        }

        // ── Silent page reload (once) ──
        // Only reload if we haven't already tried in this session
        const lastReload = sessionStorage.getItem(RELOAD_KEY);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10_000) {
            sessionStorage.setItem(RELOAD_KEY, String(now));
            window.location.reload();
            // Return a never-resolving promise so current code path halts
            return new Promise(() => {});
        }

        // Already reloaded recently — throw a user-friendly error
        throw new Error(
            'The app needs to update. Please refresh the page.',
        );
    }
}
