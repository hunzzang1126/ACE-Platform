// ─────────────────────────────────────────────────
// anthropicClient.ts — LEGACY: Re-exports from openRouterClient
// ─────────────────────────────────────────────────
// All API calls now go through OpenRouter.
// This file exists ONLY for backward compatibility.
// All existing imports continue to work unchanged.
// ─────────────────────────────────────────────────

export { callOpenRouterApi as callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/openRouterClient';
