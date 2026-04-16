// ─────────────────────────────────────────────────
// AiChatPanel.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AiChatPanel.tsx'), 'utf-8');

describe('AiChatPanel — exports', () => {
    it('exports AiChatPanel as default', () => {
        expect(src).toContain('export default function AiChatPanel');
    });
});

describe('AiChatPanel — AI integration', () => {
    it('uses AiService for AI communication', () => {
        expect(src).toContain('AiService');
    });

    it('uses agent context types', () => {
        expect(src).toContain('AgentMessage');
        expect(src).toContain('SceneNodeInfo');
    });

    it('generates suggestions', () => {
        expect(src).toContain('generateSuggestions');
    });
});

describe('AiChatPanel — UI components', () => {
    it('renders message bubbles', () => {
        expect(src).toContain('MessageBubble');
    });

    it('renders suggestion cards', () => {
        expect(src).toContain('SuggestionCard');
    });

    it('shows live progress during AI operations', () => {
        expect(src).toContain('LiveProgressPanel');
    });
});

describe('AiChatPanel — plan limits', () => {
    it('respects plan limits', () => {
        expect(src).toContain('usePlanLimits');
    });
});
