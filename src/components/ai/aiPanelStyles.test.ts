// aiPanelStyles.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './aiPanelStyles.ts'), 'utf-8');

describe('aiPanelStyles.ts — exports', () => {
    it('exports PANEL_WIDTH', () => { expect(src).toContain('export const PANEL_WIDTH'); });
    it('exports wrapperStyle', () => { expect(src).toContain('export const wrapperStyle'); });
    it('exports toggleBtnStyle', () => { expect(src).toContain('export const toggleBtnStyle'); });
    it('exports panelInnerStyle', () => { expect(src).toContain('export const panelInnerStyle'); });
    it('exports headerStyle', () => { expect(src).toContain('export const headerStyle'); });
    it('exports headerBtnStyle', () => { expect(src).toContain('export const headerBtnStyle'); });
    it('exports msgAreaStyle', () => { expect(src).toContain('export const msgAreaStyle'); });
    it('exports emptyStyle', () => { expect(src).toContain('export const emptyStyle'); });
    it('exports quickActionsStyle', () => { expect(src).toContain('export const quickActionsStyle'); });
    it('exports quickActionBtnStyle', () => { expect(src).toContain('export const quickActionBtnStyle'); });
    it('exports dropOverlayStyle', () => { expect(src).toContain('export const dropOverlayStyle'); });
    it('exports userBubbleStyle', () => { expect(src).toContain('export const userBubbleStyle'); });
    it('exports assistantStyle', () => { expect(src).toContain('export const assistantStyle'); });
    it('exports actionCardStyle', () => { expect(src).toContain('export const actionCardStyle'); });
    it('exports errorStyle', () => { expect(src).toContain('export const errorStyle'); });
});

describe('aiPanelStyles.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

