// ─────────────────────────────────────────────────
// apiKeys.ts — Centralized API Key Provider
// ─────────────────────────────────────────────────
// ACE supplies keys to all users (company-managed).
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
 * Kept for backward compatibility during migration.
 */
export function getAnthropicKey(): string {
    // Fallback: check for legacy direct Anthropic key
    return import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';
}
