// ─────────────────────────────────────────────────
// Engine Loader — shared WASM initialization
// Robust: prevents poisoned cache, supports retry
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedModule: any = null;
let loadingPromise: Promise<unknown> | null = null;

/**
 * Loads and initializes the ace-engine WASM module.
 * Returns the module with WasmEngine class.
 *
 * - Caches the result so it's only loaded once.
 * - If a load is already in progress, reuses the same promise (no double init).
 * - If a previous load failed, clears the cache and retries.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadAceEngine(): Promise<any> {
    // Return cached module if available
    if (cachedModule) return cachedModule;

    // If already loading, wait for the existing promise
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            console.log('[loader] Loading ace-engine WASM module...');
            // @ts-expect-error — WASM glue file has no TS declarations
            const mod = await import('./wasm/ace_engine.js');
            if (typeof mod.default === 'function') {
                await mod.default();
            }
            cachedModule = mod;
            console.log('[loader] [OK] WASM module loaded and cached');
            return mod;
        } catch (err) {
            console.error('[loader] [Error] WASM module load failed:', err);
            // DON'T cache a broken module — allow retry
            cachedModule = null;
            throw err;
        } finally {
            loadingPromise = null;
        }
    })();

    return loadingPromise;
}

/**
 * Clear the cached module. Used for recovery/retry scenarios.
 */
export function clearEngineCache(): void {
    cachedModule = null;
    loadingPromise = null;
}
