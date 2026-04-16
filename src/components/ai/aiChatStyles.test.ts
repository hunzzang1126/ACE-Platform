// aiChatStyles.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './aiChatStyles.ts'), 'utf-8');

describe('aiChatStyles.ts — exports', () => {
    it('exports panelStyle', () => { expect(src).toContain('export const panelStyle'); });
    it('exports headerStyle', () => { expect(src).toContain('export const headerStyle'); });
    it('exports iconBtnStyle', () => { expect(src).toContain('export const iconBtnStyle'); });
    it('exports settingsStyle', () => { expect(src).toContain('export const settingsStyle'); });
    it('exports labelStyle', () => { expect(src).toContain('export const labelStyle'); });
    it('exports settingsInputStyle', () => { expect(src).toContain('export const settingsInputStyle'); });
    it('exports saveBtnStyle', () => { expect(src).toContain('export const saveBtnStyle'); });
    it('exports messagesStyle', () => { expect(src).toContain('export const messagesStyle'); });
    it('exports bubbleBase', () => { expect(src).toContain('export const bubbleBase'); });
    it('exports progressCardStyle', () => { expect(src).toContain('export const progressCardStyle'); });
    it('exports progressHeaderStyle', () => { expect(src).toContain('export const progressHeaderStyle'); });
    it('exports generatingStyle', () => { expect(src).toContain('export const generatingStyle'); });
    it('exports inputContainerStyle', () => { expect(src).toContain('export const inputContainerStyle'); });
    it('exports inputFieldStyle', () => { expect(src).toContain('export const inputFieldStyle'); });
    it('exports sendBtnStyle', () => { expect(src).toContain('export const sendBtnStyle'); });
});

describe('aiChatStyles.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

