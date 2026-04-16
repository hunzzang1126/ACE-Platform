// agentFlowTypes.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './agentFlowTypes.ts'), 'utf-8');

describe('agentFlowTypes — exports', () => {
    it('exports interface AgentFlowCallbacks', () => { expect(src).toContain('export interface AgentFlowCallbacks'); });
    it('exports interface FlowEngine', () => { expect(src).toContain('export interface FlowEngine'); });
});

describe('agentFlowTypes — dependencies', () => {
    it('imports useUnifiedAgent', () => { expect(src).toContain("useUnifiedAgent"); });
});

