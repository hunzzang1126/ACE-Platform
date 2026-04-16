// LiveProgressPanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LiveProgressPanel.tsx'), 'utf-8');

describe('LiveProgressPanel.tsx — exports', () => {
    it('exports interface LiveState', () => { expect(src).toContain('export interface LiveState'); });
    it('exports LiveProgressPanel', () => { expect(src).toContain('export function LiveProgressPanel'); });
});

describe('LiveProgressPanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from commandExecutor', () => { expect(src).toContain("commandExecutor"); });
    it('imports from MessageBubble', () => { expect(src).toContain("MessageBubble"); });
    it('imports from aiChatStyles', () => { expect(src).toContain("aiChatStyles"); });
});

describe('LiveProgressPanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
