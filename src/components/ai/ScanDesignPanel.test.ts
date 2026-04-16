// ─────────────────────────────────────────────────
// ScanDesignPanel.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ScanDesignPanel.tsx'), 'utf-8');

describe('ScanDesignPanel — exports', () => {
    it('exports ScanDesignPanel component', () => {
        expect(src).toContain('export function ScanDesignPanel');
    });
});

describe('ScanDesignPanel — AI scan integration', () => {
    it('uses screenshot scan service', () => {
        expect(src).toContain('scanDesignScreenshot');
    });

    it('receives engine instance', () => {
        expect(src).toContain('engine');
    });

    it('receives canvas dimensions', () => {
        expect(src).toContain('canvasW');
        expect(src).toContain('canvasH');
    });
});

describe('ScanDesignPanel — state management', () => {
    it('uses useState for local state', () => {
        expect(src).toContain('useState');
    });

    it('uses useCallback for handlers', () => {
        expect(src).toContain('useCallback');
    });

    it('uses useRef for refs', () => {
        expect(src).toContain('useRef');
    });
});
