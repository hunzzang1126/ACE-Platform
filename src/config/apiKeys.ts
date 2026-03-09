// ─────────────────────────────────────────────────
// apiKeys.ts — Centralized API Key Provider
// ─────────────────────────────────────────────────
// ACE supplies keys to all users (company-managed).
// All API calls route through OpenRouter.
// Future: token system via login/auth.
// ─────────────────────────────────────────────────

/**
 * Returns the OpenRouter API key (unified gateway).
 * Reads from VITE_OPENROUTER_API_KEY (build-time injected from .env).
 */
export function getOpenRouterKey(): string {
    return import.meta.env.VITE_OPENROUTER_API_KEY ?? '';
}

/**
 * @deprecated Use getOpenRouterKey() instead.
 * Now returns the OpenRouter key for backward compatibility.
 */
export function getAnthropicKey(): string {
    return getOpenRouterKey();
}
