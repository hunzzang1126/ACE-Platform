// MessageBubble.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './MessageBubble.tsx'), 'utf-8');

describe('MessageBubble.tsx — exports', () => {
    it('exports MessageBubble', () => { expect(src).toContain('export function MessageBubble'); });
    it('exports TypewriterText', () => { expect(src).toContain('export function TypewriterText'); });
    it('exports SuggestionCard', () => { expect(src).toContain('export function SuggestionCard'); });
    it('exports DotLoader', () => { expect(src).toContain('export function DotLoader'); });
    it('exports Spinner', () => { expect(src).toContain('export function Spinner'); });
});

describe('MessageBubble.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from agentContext', () => { expect(src).toContain("agentContext"); });
    it('imports from suggestions', () => { expect(src).toContain("suggestions"); });
    it('imports from skillRegistry', () => { expect(src).toContain("skillRegistry"); });
});

describe('MessageBubble.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
