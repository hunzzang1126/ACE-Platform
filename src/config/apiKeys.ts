// ─────────────────────────────────────────────────
// API Keys — Centralized provider
// ACE supplies a single API key to all users.
// Future: token system via login/auth.
// ─────────────────────────────────────────────────

/**
 * Returns the Anthropic API key.
 * Reads from VITE_ANTHROPIC_API_KEY (build-time injected from .env).
 */
export function getAnthropicKey(): string {
    return import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';
}
