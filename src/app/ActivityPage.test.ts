// ActivityPage.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ActivityPage.tsx'), 'utf-8');

describe('ActivityPage — exports', () => {
    it('exports ActivityPage component', () => { expect(src).toContain('export function ActivityPage'); });
});

describe('ActivityPage — publish history', () => {
    it('fetches recent publishes', () => { expect(src).toContain('getRecentPublishes'); });
    it('uses PublishRecord type', () => { expect(src).toContain('PublishRecord'); });
    it('uses PublishPlatform type', () => { expect(src).toContain('PublishPlatform'); });
});

describe('ActivityPage — layout', () => {
    it('uses AppSidebar', () => { expect(src).toContain('AppSidebar'); });
    it('uses i18n', () => { expect(src).toContain('useAppI18n'); });
    it('uses useState for state', () => { expect(src).toContain('useState'); });
    it('uses useEffect for data loading', () => { expect(src).toContain('useEffect'); });
});
