// ─────────────────────────────────────────────────
// anthropicClient.ts — Shared Anthropic API wrapper
// ─────────────────────────────────────────────────
// Single source of truth for all Claude API calls.
// - Dev (localhost): uses Vite proxy /api/anthropic to bypass CORS
// - Production: calls api.anthropic.com directly with
//   anthropic-dangerous-direct-browser-access header
//
// Mirrors the pattern in aiService.ts callClaude().
// ─────────────────────────────────────────────────

/** Must match aiService.ts DEFAULT_CONFIG.model */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export function getAnthropicUrl(): string {
    const isLocalDev =
        typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocalDev
        ? '/api/anthropic/v1/messages'
        : 'https://api.anthropic.com/v1/messages';
}

export function getAnthropicHeaders(apiKey: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
    };
}

export async function callAnthropicApi(
    apiKey: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<unknown> {
    if (!apiKey?.trim()) {
        throw new Error('Anthropic API key is required. Set it in the AI Panel settings.');
    }

    const url = getAnthropicUrl();
    const res = await fetch(url, {
        method: 'POST',
        headers: getAnthropicHeaders(apiKey),
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401) {
            throw new Error(
                `API key invalid (401). Check your Anthropic API key in the AI Panel settings.`,
            );
        }
        throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    return res.json();
}
