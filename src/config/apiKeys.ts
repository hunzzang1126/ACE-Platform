// ─────────────────────────────────────────────────
// apiKeys.ts — Centralized API Key Provider
// ─────────────────────────────────────────────────
// Glid supplies keys to all users (company-managed).
// All API calls route through OpenRouter.
// Future: token system via login/auth.
// ─────────────────────────────────────────────────

/**
 * Returns the OpenRouter API key (unified gateway).
 * Reads from VITE_OPENROUTER_API_KEY (build-time injected from .env).
 * In production proxy mode, this returns '' — the edge function handles the key.
 */
export function getOpenRouterKey(): string {
    return import.meta.env.VITE_OPENROUTER_API_KEY ?? '';
}

/**
 * Returns true when the app routes AI calls through the Supabase Edge Function proxy.
 * In proxy mode the API key lives server-side, so getOpenRouterKey() returning '' is expected.
 */
export function isProxyMode(): boolean {
    if (typeof window === 'undefined') return false;
    // Local dev uses Vite proxy (direct key); production uses Edge Function
    return window.location.hostname !== 'localhost';
}

/**
 * Returns true when AI features can be used — either via direct key or proxy.
 * Use this instead of `!!getOpenRouterKey()` to avoid blocking users in production proxy mode.
 */
export function isAiAvailable(): boolean {
    return !!getOpenRouterKey() || isProxyMode();
}

/**
 * @deprecated Use getOpenRouterKey() instead.
 * Now returns the OpenRouter key for backward compatibility.
 */
export function getAnthropicKey(): string {
    return getOpenRouterKey();
}
