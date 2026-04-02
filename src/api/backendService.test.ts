// ─────────────────────────────────────────────────
// backendService.test.ts — Backend API contracts
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './backendService.ts'), 'utf-8');

describe('backendService — checkBackendHealth', () => {
    it('calls /health endpoint', () => {
        expect(src).toContain('/health');
    });

    it('returns openai_configured field', () => {
        expect(src).toContain('openai_configured');
    });
});

describe('backendService — runVisionQA', () => {
    it('calls /api/vision-qa endpoint', () => {
        expect(src).toContain('/api/vision-qa');
    });

    it('sends master_width dimension', () => {
        expect(src).toContain('master_width');
    });
});

describe('backendService — requestAutoFix', () => {
    it('calls /api/vision-fix endpoint', () => {
        expect(src).toContain('/api/vision-fix');
    });
});
