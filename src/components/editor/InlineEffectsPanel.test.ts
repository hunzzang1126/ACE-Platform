// ─────────────────────────────────────────────────
// InlineEffectsPanel.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './InlineEffectsPanel.tsx'), 'utf-8');

describe('InlineEffectsPanel — exports', () => {
    it('exports InlineEffectsPanel component', () => {
        expect(src).toContain('export function InlineEffectsPanel');
    });
});

describe('InlineEffectsPanel — effect types', () => {
    it('supports text effect types', () => {
        expect(src).toContain('TextEffectType');
    });

    it('uses engine actions', () => {
        expect(src).toContain('CanvasEngineActions');
    });

    it('reads selected node properties', () => {
        expect(src).toContain('EngineNode');
    });
});

describe('InlineEffectsPanel — interaction', () => {
    it('has close handler', () => {
        expect(src).toContain('onClose');
    });

    it('uses useState for local state', () => {
        expect(src).toContain('useState');
    });
});
